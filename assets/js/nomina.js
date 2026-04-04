// assets/js/nomina.js
let employees = [], periods = [], branches = [];
let currentView = "empleados";

document.addEventListener("DOMContentLoaded", async () => {
  await loadAll();
});

async function loadAll() {
  await Promise.all([loadEmployees(), loadPeriods(), loadBranches()]);
  updateKPIs();
}

// ── Empleados ──────────────────────────────────────────────────────
async function loadEmployees() {
  try {
    const res = await apiFetch("/payroll/employees");
    if (!res?.ok) return;
    employees = res.data || [];
    renderEmployees();
  } catch (e) { console.error("Error cargando empleados:", e); }
}

function renderEmployees() {
  const tbody = document.getElementById("emp-body");
  if (!employees.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><i class="bi bi-people"></i>No hay empleados registrados.<br><small>Agrega tu primer empleado con el botón de arriba.</small></td></tr>`;
    return;
  }
  tbody.innerHTML = employees.map(emp => `
    <tr>
      <td>
        <div style="font-weight:700;color:#0f172a;">${emp.name}</div>
        <div style="font-size:11px;color:#94a3b8;font-family:monospace;">${emp.id_number}</div>
      </td>
      <td>${emp.position || '<span style="color:#cbd5e1;">—</span>'}</td>
      <td>${emp.branch_name || '<span style="color:#cbd5e1;">—</span>'}</td>
      <td style="font-weight:600;">
        ${Number(emp.base_salary).toFixed(2)} ${emp.salary_currency || "USD"}
        ${Number(emp.food_bonus) > 0 ? `<div style="font-size:11px;color:#64748b;">+ ${Number(emp.food_bonus).toFixed(2)} cesta</div>` : ""}
      </td>
      <td style="color:#64748b;font-size:12px;">${emp.hire_date ? new Date(emp.hire_date).toLocaleDateString("es-VE") : "—"}</td>
      <td><span class="badge ${emp.is_active ? "badge-active" : "badge-inactive"}">${emp.is_active ? "Activo" : "Inactivo"}</span></td>
      <td>
        <button class="btn-sm" onclick="editEmployee(${emp.id})"><i class="bi bi-pencil"></i></button>
        <a href="nomina_detalle.html?type=employee&id=${emp.id}" class="btn-sm" style="text-decoration:none;"><i class="bi bi-eye"></i></a>
      </td>
    </tr>`).join("");
}

// ── Períodos ──────────────────────────────────────────────────────
async function loadPeriods() {
  try {
    const res = await apiFetch("/payroll/periods");
    if (!res?.ok) return;
    periods = res.data || [];
    renderPeriods();
  } catch (e) { console.error("Error cargando períodos:", e); }
}

function renderPeriods() {
  const tbody = document.getElementById("per-body");
  if (!periods.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><i class="bi bi-calendar3"></i>No hay períodos de nómina.<br><small>Crea el primer período para comenzar a procesar la nómina.</small></td></tr>`;
    return;
  }
  tbody.innerHTML = periods.map(p => `
    <tr>
      <td style="font-weight:700;color:#0f172a;">${p.period_label}</td>
      <td style="font-size:12px;color:#64748b;">${p.period_type}</td>
      <td style="font-size:12px;color:#64748b;">
        ${new Date(p.start_date).toLocaleDateString("es-VE")} →
        ${new Date(p.end_date).toLocaleDateString("es-VE")}
      </td>
      <td>${p.items_count || 0}</td>
      <td style="font-weight:700;color:#16a34a;">$${Number(p.total_net || 0).toFixed(2)}</td>
      <td><span class="badge ${p.status === "CERRADO" ? "badge-cerrado" : "badge-borrador"}">${p.status}</span></td>
      <td>
        <a href="nomina_detalle.html?type=period&id=${p.id}" class="btn-sm" style="text-decoration:none;">
          <i class="bi bi-eye"></i> Ver / Editar
        </a>
        ${p.status !== "CERRADO" ? `<button class="btn-sm danger" onclick="closePeriod(${p.id},'${p.period_label}')"><i class="bi bi-lock"></i> Cerrar</button>` : ""}
      </td>
    </tr>`).join("");
}

// ── KPIs ──────────────────────────────────────────────────────────
function updateKPIs() {
  const active = employees.filter(e => e.is_active).length;
  document.getElementById("kpi-employees").textContent = active;
  document.getElementById("kpi-periods").textContent = periods.length;
  if (periods.length > 0) {
    const last = periods[0];
    document.getElementById("kpi-last").textContent = last.period_label;
    document.getElementById("kpi-total").textContent = "$" + Number(last.total_net || 0).toFixed(2);
  }
}

// ── Branches para select ──────────────────────────────────────────
async function loadBranches() {
  try {
    const res = await apiFetch("/branches");
    if (!res?.ok) return;
    branches = (res.data || []).filter(b => b.is_active);
    const sel = document.getElementById("emp-branch");
    branches.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id; opt.textContent = b.name;
      sel.appendChild(opt);
    });
  } catch (e) {}
}

// ── Tab switching ─────────────────────────────────────────────────
function switchTab(view) {
  currentView = view;
  document.getElementById("view-empleados").style.display = view === "empleados" ? "" : "none";
  document.getElementById("view-periodos").style.display  = view === "periodos"  ? "" : "none";
  document.getElementById("tab-emp").classList.toggle("active", view === "empleados");
  document.getElementById("tab-per").classList.toggle("active", view === "periodos");
}

// ── Modal empleado ────────────────────────────────────────────────
function openEmployeeModal(emp = null) {
  document.getElementById("emp-modal-title").textContent = emp ? "Editar Empleado" : "Nuevo Empleado";
  document.getElementById("emp-id").value       = emp?.id || "";
  document.getElementById("emp-name").value     = emp?.name || "";
  document.getElementById("emp-id-number").value= emp?.id_number || "";
  document.getElementById("emp-position").value = emp?.position || "";
  document.getElementById("emp-department").value=emp?.department || "";
  document.getElementById("emp-hire-date").value = emp?.hire_date?.split("T")[0] || "";
  document.getElementById("emp-contract").value = emp?.contract_type || "INDEFINIDO";
  document.getElementById("emp-salary").value   = emp?.base_salary || "";
  document.getElementById("emp-currency").value = emp?.salary_currency || "USD";
  document.getElementById("emp-food").value     = emp?.food_bonus || "";
  document.getElementById("emp-transport").value= emp?.transport_bonus || "";
  document.getElementById("emp-phone").value    = emp?.phone || "";
  document.getElementById("emp-branch").value   = emp?.branch_id || "";
  document.getElementById("emp-error").style.display = "none";
  document.getElementById("employee-modal").classList.remove("hidden");
}

function closeEmployeeModal() { document.getElementById("employee-modal").classList.add("hidden"); }

function editEmployee(id) {
  const emp = employees.find(e => e.id === id);
  if (emp) openEmployeeModal(emp);
}

async function saveEmployee() {
  const id   = document.getElementById("emp-id").value;
  const body = {
    name:          document.getElementById("emp-name").value.trim(),
    id_number:     document.getElementById("emp-id-number").value.trim(),
    position:      document.getElementById("emp-position").value.trim(),
    department:    document.getElementById("emp-department").value.trim(),
    hire_date:     document.getElementById("emp-hire-date").value,
    contract_type: document.getElementById("emp-contract").value,
    base_salary:   Number(document.getElementById("emp-salary").value),
    salary_currency: document.getElementById("emp-currency").value,
    food_bonus:    Number(document.getElementById("emp-food").value) || 0,
    transport_bonus: Number(document.getElementById("emp-transport").value) || 0,
    phone:         document.getElementById("emp-phone").value.trim(),
    branch_id:     document.getElementById("emp-branch").value || null,
  };

  const errEl = document.getElementById("emp-error");
  errEl.style.display = "none";

  const url    = id ? `/payroll/employees/${id}` : "/payroll/employees";
  const method = id ? "PUT" : "POST";

  try {
    const res = await apiFetch(url, { method, body: JSON.stringify(body) });
    if (!res?.ok) { errEl.textContent = res?.error || "Error al guardar."; errEl.style.display = "block"; return; }
    closeEmployeeModal();
    await loadAll();
  } catch (e) { errEl.textContent = "Error de conexión."; errEl.style.display = "block"; }
}

// ── Modal período ─────────────────────────────────────────────────
function openPeriodModal() {
  document.getElementById("per-label").value = "";
  document.getElementById("per-start").value = "";
  document.getElementById("per-end").value   = "";
  document.getElementById("per-type").value  = "MENSUAL";
  document.getElementById("per-rate").value  = "";
  document.getElementById("per-error").style.display = "none";
  document.getElementById("period-modal").classList.remove("hidden");
}
function closePeriodModal() { document.getElementById("period-modal").classList.add("hidden"); }

async function savePeriod() {
  const body = {
    period_label: document.getElementById("per-label").value.trim(),
    period_type:  document.getElementById("per-type").value,
    start_date:   document.getElementById("per-start").value,
    end_date:     document.getElementById("per-end").value,
    exchange_rate: Number(document.getElementById("per-rate").value) || 1,
  };
  const errEl = document.getElementById("per-error");
  errEl.style.display = "none";
  try {
    const res = await apiFetch("/payroll/periods", { method: "POST", body: JSON.stringify(body) });
    if (!res?.ok) { errEl.textContent = res?.error || "Error al crear período."; errEl.style.display = "block"; return; }
    closePeriodModal();
    await loadPeriods();
    updateKPIs();
    switchTab("periodos");
  } catch (e) { errEl.textContent = "Error de conexión."; errEl.style.display = "block"; }
}

async function closePeriod(id, label) {
  if (!confirm(`¿Cerrar el período "${label}"?\n\nUna vez cerrado no podrás editar los items.`)) return;
  try {
    const res = await apiFetch(`/payroll/periods/${id}/close`, { method: "POST" });
    if (!res?.ok) { alert(res?.error || "No se pudo cerrar el período."); return; }
    await loadPeriods();
  } catch (e) { alert("Error de conexión."); }
}

// Cerrar modales al hacer click fuera
["employee-modal","period-modal"].forEach(id => {
  document.getElementById(id)?.addEventListener("click", function(e) {
    if (e.target === this) this.classList.add("hidden");
  });
});
