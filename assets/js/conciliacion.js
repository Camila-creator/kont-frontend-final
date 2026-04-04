// assets/js/conciliacion.js
// Lista de conciliaciones y modal de creación

let reconciliations = [], accounts = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadAccounts();
  await loadReconciliations();
});

async function loadReconciliations() {
  try {
    const res = await apiFetch("/reconciliations");
    if (!res?.ok) return;
    reconciliations = res.data || [];
    renderList();
  } catch (e) { console.error("Error cargando conciliaciones:", e); }
}

async function loadAccounts() {
  try {
    const res = await apiFetch("/finance-accounts");
    if (!res?.ok) return;
    accounts = (res.data || []).filter(a => a.is_active);
    const sel = document.getElementById("new-account");
    accounts.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = `${a.bank_name ? a.bank_name + " — " : ""}${a.name} (${a.currency || "USD"})`;
      sel.appendChild(opt);
    });
  } catch (e) {}
}

function renderList() {
  const grid = document.getElementById("recon-grid");
  if (!reconciliations.length) {
    grid.innerHTML = `<div class="empty"><i class="bi bi-bank"></i><p>No hay conciliaciones aún.</p><p style="font-size:12px;">Crea una nueva conciliación para empezar a cruzar los movimientos de tu banco con los registros de Kont.</p></div>`;
    return;
  }
  grid.innerHTML = reconciliations.map(r => {
    const total  = Number(r.total_lines  || 0);
    const matched= Number(r.matched_lines|| 0);
    const pending= Number(r.pending_lines|| 0);
    const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
    return `
    <div class="recon-card">
      <div class="recon-card-header">
        <div>
          <div class="recon-bank"><i class="bi bi-bank" style="margin-right:6px;color:#2563eb;"></i>${r.bank_name || "Cuenta"} — ${r.account_name}</div>
          <div class="recon-period">${r.period_label || (new Date(r.start_date).toLocaleDateString("es-VE") + " → " + new Date(r.end_date).toLocaleDateString("es-VE"))}</div>
        </div>
        <span class="badge ${r.status === "CERRADO" ? "badge-cerrado" : "badge-proceso"}">${r.status === "CERRADO" ? "Cerrado" : "En proceso"}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="recon-stats">
        <span class="stat-green"><i class="bi bi-check-circle-fill"></i> ${matched} conciliadas</span>
        <span class="stat-red"><i class="bi bi-circle-fill" style="font-size:8px;"></i> ${pending} pendientes</span>
        <span class="stat-gray">${total} líneas total</span>
        <span style="margin-left:auto;font-weight:700;color:#0f172a;">${pct}%</span>
      </div>
      <div style="display:flex;gap:6px;">
        <a href="conciliacion_detalle.html?id=${r.id}" class="btn-sm primary" style="text-decoration:none;flex:1;justify-content:center;">
          <i class="bi bi-arrow-right-circle"></i> ${r.status === "CERRADO" ? "Ver detalle" : "Continuar"}
        </a>
      </div>
    </div>`;
  }).join("");
}

function openNewModal() {
  document.getElementById("new-account").value = "";
  document.getElementById("new-period").value  = "";
  document.getElementById("new-start").value   = "";
  document.getElementById("new-end").value     = "";
  document.getElementById("new-balance").value = "";
  document.getElementById("new-error").style.display = "none";
  document.getElementById("new-modal").classList.remove("hidden");
}
function closeNewModal() { document.getElementById("new-modal").classList.add("hidden"); }

async function saveNew() {
  const body = {
    finance_account_id: Number(document.getElementById("new-account").value),
    period_label:       document.getElementById("new-period").value.trim(),
    start_date:         document.getElementById("new-start").value,
    end_date:           document.getElementById("new-end").value,
    opening_balance:    Number(document.getElementById("new-balance").value) || 0,
  };
  const errEl = document.getElementById("new-error");
  errEl.style.display = "none";
  try {
    const res = await apiFetch("/reconciliations", { method: "POST", body: JSON.stringify(body) });
    if (!res?.ok) { errEl.textContent = res?.error || "Error al crear."; errEl.style.display = "block"; return; }
    closeNewModal();
    window.location.href = `conciliacion_detalle.html?id=${res.data.id}`;
  } catch (e) { errEl.textContent = "Error de conexión."; errEl.style.display = "block"; }
}

document.getElementById("new-modal")?.addEventListener("click", function(e) { if (e.target === this) closeNewModal(); });
