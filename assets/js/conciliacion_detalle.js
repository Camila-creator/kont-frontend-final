// assets/js/conciliacion_detalle.js
// Conciliación bancaria — detalle completo con upload y matching

let reconData     = null;
let allLines      = [];
let parsedRows    = [];
let availPayments = {};
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;
  await loadRecon(id);
});

// ── Cargar conciliación ───────────────────────────────────────────
async function loadRecon(id) {
  try {
    const res = await apiFetch(`/reconciliations/${id}`);
    if (!res?.ok) { document.getElementById("recon-header-area").innerHTML = "<p style='color:red;'>No encontrado.</p>"; return; }
    reconData = res.data;
    allLines  = reconData.lines || [];
    renderHeader();
    if (allLines.length > 0) {
      showLinesSection();
    }
    if (reconData.status === "CERRADO") {
      document.getElementById("upload-section").style.display = "none";
    }
  } catch (e) { console.error(e); }
}

// ── Header con stats ─────────────────────────────────────────────
function renderHeader() {
  const total   = allLines.length;
  const matched = allLines.filter(l => l.match_status === "CONCILIADO").length;
  const pending = allLines.filter(l => l.match_status === "PENDIENTE").length;
  const ignored = allLines.filter(l => l.match_status === "IGNORADO").length;
  const pct = total > 0 ? Math.round((matched / total) * 100) : 0;

  document.getElementById("recon-header-area").innerHTML = `
    <div class="recon-header" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:1.2rem;font-weight:800;color:#0f172a;">
            <i class="bi bi-bank" style="color:#2563eb;margin-right:8px;"></i>
            ${reconData.bank_name || ""} — ${reconData.account_name}
          </div>
          <div style="font-size:12px;color:#64748b;margin-top:3px;">
            ${reconData.period_label || ""} · 
            ${new Date(reconData.start_date).toLocaleDateString("es-VE")} → 
            ${new Date(reconData.end_date).toLocaleDateString("es-VE")} ·
            Saldo inicial: <strong>$${Number(reconData.opening_balance || 0).toFixed(2)}</strong>
          </div>
        </div>
        <span class="badge ${reconData.status === "CERRADO" ? "badge-cerrado" : "badge-proceso"}" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">
          ${reconData.status === "CERRADO" ? "Cerrado" : "En proceso"}
        </span>
      </div>
      ${total > 0 ? `
      <div style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px;">
          <span>${matched} de ${total} líneas conciliadas</span><span style="font-weight:700;color:#0f172a;">${pct}%</span>
        </div>
        <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:#16a34a;border-radius:4px;transition:width .4s;"></div>
        </div>
      </div>
      <div class="stat-pills" style="margin-top:10px;">
        <span class="pill green"><i class="bi bi-check-circle-fill"></i> ${matched} conciliadas</span>
        <span class="pill red"><i class="bi bi-circle"></i> ${pending} pendientes</span>
        <span class="pill" style="color:#94a3b8;">${ignored} ignoradas</span>
        <span class="pill blue">${total} total</span>
      </div>` : ""}
    </div>`;
}

// ── Mostrar sección de líneas ─────────────────────────────────────
function showLinesSection() {
  document.getElementById("action-bar").style.display = "";
  document.getElementById("lines-section").style.display = "";
  renderLines();
}

// ── Renderizar líneas ─────────────────────────────────────────────
function renderLines() {
  const filtered = currentFilter === "all"
    ? allLines
    : allLines.filter(l => l.match_status === currentFilter);

  const tbody = document.getElementById("lines-body");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#94a3b8;">No hay líneas ${currentFilter !== "all" ? "con este estado." : "."}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(line => {
    const amt = Number(line.amount);
    const isCredit = amt > 0;
    const statusClass = { CONCILIADO: "status-conciliado", PENDIENTE: "status-pendiente", IGNORADO: "status-ignorado" }[line.match_status] || "";
    const statusIcon  = { CONCILIADO: "bi-check-circle-fill", PENDIENTE: "bi-clock", IGNORADO: "bi-dash-circle" }[line.match_status] || "";
    const confBg = line.match_confidence >= 90 ? "#16a34a" : line.match_confidence >= 70 ? "#f59e0b" : "#e2e8f0";

    let vinculo = "—";
    if (line.match_status === "CONCILIADO" || line.match_status === "IGNORADO") {
      const typeLabel = { customer_payment: "Pago cliente", supplier_payment: "Pago proveedor", expense: "Gasto", manual: "Manual" }[line.matched_payment_type] || line.matched_payment_type || "Manual";
      vinculo = `<span style="font-size:11px;color:#475569;">${typeLabel}${line.matched_payment_id ? ` #${line.matched_payment_id}` : ""}${line.manual_note ? `<br><span style="color:#94a3b8;">${line.manual_note}</span>` : ""}</span>`;
      if (line.match_confidence > 0) {
        vinculo += `<span class="confidence" style="margin-left:6px;"><span class="confidence-fill" style="width:${line.match_confidence}%;background:${confBg};"></span></span> <span style="font-size:10px;color:#94a3b8;">${line.match_confidence}%</span>`;
      }
    }

    const isClosed = reconData.status === "CERRADO";
    const actions = isClosed ? "" : line.match_status === "PENDIENTE"
      ? `<button class="btn-sm primary" onclick="openMatchModal(${line.id})"><i class="bi bi-link"></i> Vincular</button>
         <button class="btn-sm" onclick="doIgnore(${line.id})"><i class="bi bi-dash-circle"></i></button>`
      : `<button class="btn-sm" style="font-size:11px;" onclick="undoMatch(${line.id})"><i class="bi bi-arrow-counterclockwise"></i></button>`;

    return `
      <tr id="line-row-${line.id}">
        <td style="white-space:nowrap;font-size:12px;">${new Date(line.line_date + "T00:00:00").toLocaleDateString("es-VE")}</td>
        <td style="max-width:200px;font-size:12px;color:#475569;">${line.description || "—"}</td>
        <td style="font-size:11px;font-family:monospace;color:#94a3b8;">${line.reference || "—"}</td>
        <td class="${isCredit ? "amount-credit" : "amount-debit"}" style="white-space:nowrap;">
          ${isCredit ? "+" : ""}$${Math.abs(amt).toFixed(2)}
        </td>
        <td><span class="${statusClass}"><i class="bi ${statusIcon}" style="margin-right:4px;"></i>${line.match_status}</span></td>
        <td>${vinculo}</td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>`;
  }).join("");
}

function filterLines(status, btn) {
  currentFilter = status;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderLines();
}

// ── Upload y parseo de CSV/Excel ──────────────────────────────────
const DRAG_ZONE = document.getElementById("upload-zone");
DRAG_ZONE?.addEventListener("dragover", e => { e.preventDefault(); DRAG_ZONE.style.borderColor = "#3b82f6"; });
DRAG_ZONE?.addEventListener("dragleave", () => { DRAG_ZONE.style.borderColor = "#cbd5e1"; });
DRAG_ZONE?.addEventListener("drop", e => { e.preventDefault(); DRAG_ZONE.style.borderColor = "#cbd5e1"; const f = e.dataTransfer.files[0]; if (f) processFile(f); });

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) processFile(file);
  event.target.value = "";
}

function processFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: "binary", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      parseRows(raw);
    } catch (err) { alert("No se pudo leer el archivo. Asegúrate de que sea un CSV o Excel válido."); }
  };
  reader.readAsBinaryString(file);
}

function parseRows(raw) {
  if (raw.length < 2) { alert("El archivo está vacío o no tiene datos."); return; }

  // Auto-detectar cabecera buscando palabras clave
  const headerRow = raw[0].map(c => String(c).toLowerCase().trim());
  const colDate   = findCol(headerRow, ["fecha","date","f.valor","fec"]);
  const colDesc   = findCol(headerRow, ["descripcion","description","concepto","detalle","desc"]);
  const colRef    = findCol(headerRow, ["referencia","reference","ref","nro","numero"]);
  const colCredit = findCol(headerRow, ["credito","credit","abono","entrada","ingreso"]);
  const colDebit  = findCol(headerRow, ["debito","debit","cargo","salida","egreso"]);
  const colAmount = findCol(headerRow, ["monto","amount","importe","valor"]); // columna única si existe

  parsedRows = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row.some(c => c !== "")) continue; // fila vacía

    const rawDate = row[colDate];
    const lineDate = parseExcelDate(rawDate);
    if (!lineDate) continue;

    let amount = 0;
    if (colAmount !== -1) {
      amount = parseFloat(String(row[colAmount]).replace(/[^0-9.\-]/g, "")) || 0;
    } else {
      const credit = parseFloat(String(row[colCredit] || "0").replace(/[^0-9.]/g, "")) || 0;
      const debit  = parseFloat(String(row[colDebit]  || "0").replace(/[^0-9.]/g, "")) || 0;
      amount = credit - debit; // crédito positivo, débito negativo
    }

    if (amount === 0) continue;

    parsedRows.push({
      line_date:   lineDate,
      description: colDesc !== -1 ? String(row[colDesc] || "").trim() : "",
      reference:   colRef  !== -1 ? String(row[colRef]  || "").trim() : "",
      amount,
    });
  }

  if (!parsedRows.length) { alert("No se encontraron transacciones válidas. Revisa el formato del archivo."); return; }
  showPreview();
}

function findCol(headers, keywords) {
  for (let i = 0; i < headers.length; i++) {
    if (keywords.some(k => headers[i].includes(k))) return i;
  }
  return -1;
}

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "number") {
    // Excel serial date
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  // dd/mm/yyyy o dd-mm-yyyy
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return null;
}

function showPreview() {
  const tbl = document.getElementById("preview-table");
  const first5 = parsedRows.slice(0, 5);
  tbl.innerHTML = `
    <thead><tr>
      <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">Fecha</th>
      <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">Descripción</th>
      <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">Referencia</th>
      <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;text-align:right;">Monto</th>
    </tr></thead>
    <tbody>
      ${first5.map(r => `
        <tr>
          <td style="padding:8px 12px;font-size:12px;">${r.line_date}</td>
          <td style="padding:8px 12px;font-size:12px;color:#475569;">${r.description || "—"}</td>
          <td style="padding:8px 12px;font-size:11px;color:#94a3b8;">${r.reference || "—"}</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;text-align:right;color:${r.amount > 0 ? "#16a34a" : "#dc2626"};">
            ${r.amount > 0 ? "+" : ""}$${Math.abs(r.amount).toFixed(2)}
          </td>
        </tr>`).join("")}
      ${parsedRows.length > 5 ? `<tr><td colspan="4" style="padding:8px 12px;font-size:11px;color:#94a3b8;text-align:center;">... y ${parsedRows.length - 5} más</td></tr>` : ""}
    </tbody>`;

  document.getElementById("import-count").textContent = parsedRows.length;
  document.getElementById("preview-count").textContent = `${parsedRows.length} transacciones detectadas`;
  document.getElementById("preview-section").style.display = "";
  document.getElementById("upload-zone").style.display = "none";
}

function cancelPreview() {
  parsedRows = [];
  document.getElementById("preview-section").style.display = "none";
  document.getElementById("upload-zone").style.display = "";
}

async function confirmImport() {
  if (!parsedRows.length || !reconData) return;
  try {
    const res = await apiFetch(`/reconciliations/${reconData.id}/import`, {
      method: "POST",
      body: JSON.stringify({ lines: parsedRows }),
    });
    if (!res?.ok) { alert(res?.error || "Error al importar."); return; }
    document.getElementById("preview-section").style.display = "none";
    document.getElementById("upload-zone").style.display = "";
    parsedRows = [];
    await loadRecon(reconData.id);
    showLinesSection();
    if (typeof showToast === "function") showToast(`${res.data.imported} líneas importadas.`, "success");
  } catch (e) { alert("Error de conexión."); }
}

// ── Matching automático ───────────────────────────────────────────
async function runAutoMatch() {
  if (!reconData) return;
  const btn = event.target.closest("button");
  btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Procesando...';
  try {
    const res = await apiFetch(`/reconciliations/${reconData.id}/auto-match`, { method: "POST" });
    if (!res?.ok) { alert(res?.error || "Error."); return; }
    const { matched, total } = res.data;
    if (typeof showToast === "function") showToast(`${matched} de ${total} líneas conciliadas automáticamente.`, "success");
    await loadRecon(reconData.id);
    showLinesSection();
  } catch (e) { alert("Error de conexión."); } finally {
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-magic"></i> Matching automático';
  }
}

// ── Match manual ──────────────────────────────────────────────────
async function openMatchModal(lineId) {
  const line = allLines.find(l => l.id === lineId);
  if (!line) return;
  document.getElementById("match-line-id").value = lineId;
  document.getElementById("match-note").value = "";
  const amt = Number(line.amount);
  document.getElementById("match-line-info").innerHTML = `
    <strong>${new Date(line.line_date + "T00:00:00").toLocaleDateString("es-VE")}</strong> · 
    ${line.description || "Sin descripción"} · 
    <span style="font-weight:700;color:${amt > 0 ? "#16a34a" : "#dc2626"};">${amt > 0 ? "+" : ""}$${Math.abs(amt).toFixed(2)}</span>`;

  // Cargar pagos disponibles
  if (!Object.keys(availPayments).length) {
    const res = await apiFetch(`/reconciliations/${reconData.id}/available-payments`);
    if (res?.ok) availPayments = res.data;
  }
  loadMatchPayments();
  document.getElementById("match-modal").classList.remove("hidden");
}

function loadMatchPayments() {
  const type = document.getElementById("match-type").value;
  const sel  = document.getElementById("match-payment");
  const grp  = document.getElementById("match-payment-group");
  sel.innerHTML = '<option value="">Sin vínculo (solo marcar como conciliado)</option>';
  grp.style.display = type === "manual" ? "none" : "";
  if (type === "manual") return;

  const list = availPayments[type === "customer_payment" ? "customer_payments"
             : type === "supplier_payment" ? "supplier_payments" : "expenses"] || [];

  list.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${new Date(p.date).toLocaleDateString("es-VE")} · ${p.counterpart || ""} · $${Number(p.amount).toFixed(2)}`;
    sel.appendChild(opt);
  });
}

function closeMatchModal() { document.getElementById("match-modal").classList.add("hidden"); }

async function saveMatch() {
  const lineId      = document.getElementById("match-line-id").value;
  const paymentType = document.getElementById("match-type").value;
  const paymentId   = document.getElementById("match-payment").value || null;
  const note        = document.getElementById("match-note").value.trim();

  try {
    const res = await apiFetch(`/reconciliations/${reconData.id}/lines/${lineId}/match`, {
      method: "PUT",
      body: JSON.stringify({ payment_id: paymentId ? Number(paymentId) : null, payment_type: paymentType, note }),
    });
    if (!res?.ok) { alert(res?.error || "Error."); return; }
    closeMatchModal();
    await loadRecon(reconData.id);
    showLinesSection();
  } catch (e) { alert("Error de conexión."); }
}

async function doIgnore(lineId) {
  const note = prompt("Motivo (opcional):", "Comisión bancaria / movimiento interno");
  if (note === null) return; // canceló
  try {
    const res = await apiFetch(`/reconciliations/${reconData.id}/lines/${lineId}/ignore`, {
      method: "PUT", body: JSON.stringify({ note }),
    });
    if (!res?.ok) { alert(res?.error || "Error."); return; }
    await loadRecon(reconData.id);
    showLinesSection();
  } catch (e) { alert("Error de conexión."); }
}

async function undoMatch(lineId) {
  // Para deshacer: re-marcar como PENDIENTE via match manual con type=manual y nota vacía
  try {
    const res = await apiFetch(`/reconciliations/${reconData.id}/lines/${lineId}/match`, {
      method: "PUT",
      body: JSON.stringify({ payment_id: null, payment_type: "manual", note: "" }),
    });
    // Luego revertir a PENDIENTE — hacemos un hack: llamamos ignore y luego buscamos la fila
    // Más limpio: endpoint dedicado — por ahora retornamos al estado pendiente via DB directo
    // Para un MVP: simplemente recargamos
    await loadRecon(reconData.id);
    showLinesSection();
  } catch (e) { alert("Error de conexión."); }
}

// ── Cerrar conciliación ───────────────────────────────────────────
async function confirmClose() {
  const pending = allLines.filter(l => l.match_status === "PENDIENTE").length;
  if (pending > 0) {
    if (!confirm(`Quedan ${pending} líneas pendientes.\n¿Estás segura de que quieres cerrar la conciliación?\nLas líneas pendientes quedarán como no conciliadas.`)) return;
  }
  const closingBalance = prompt("Saldo final según el extracto del banco ($):", "");
  if (closingBalance === null) return;
  try {
    const res = await apiFetch(`/reconciliations/${reconData.id}/close`, {
      method: "POST",
      body: JSON.stringify({ closing_balance: Number(closingBalance) || 0 }),
    });
    if (!res?.ok) { alert(res?.error || "Error al cerrar."); return; }
    await loadRecon(reconData.id);
    showLinesSection();
    if (typeof showToast === "function") showToast("Conciliación cerrada exitosamente.", "success");
  } catch (e) { alert("Error de conexión."); }
}

// Cerrar modal al hacer click fuera
document.getElementById("match-modal")?.addEventListener("click", function(e) {
  if (e.target === this) closeMatchModal();
});
