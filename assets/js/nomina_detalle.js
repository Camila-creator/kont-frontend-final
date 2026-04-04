// assets/js/nomina_detalle.js
// Detalle de período de nómina — edición inline + PDF de recibo
let periodData = null;
let isClosed = false;

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const id = params.get("id");
  if (!id) { document.getElementById("main-content").innerHTML = "<p style='color:red;text-align:center;'>ID no especificado.</p>"; return; }
  if (type === "period") await loadPeriod(id);
});

async function loadPeriod(id) {
  try {
    const res = await apiFetch(`/payroll/periods/${id}`);
    if (!res?.ok) { document.getElementById("main-content").innerHTML = "<p style='color:red;text-align:center;'>Período no encontrado.</p>"; return; }
    periodData = res.data;
    isClosed = periodData.status === "CERRADO";
    renderPeriod();
  } catch (e) { console.error(e); }
}

function renderPeriod() {
  const p = periodData;
  const items = p.items || [];
  const totalGross = items.reduce((s, i) => s + Number(i.gross_salary || 0), 0);
  const totalDed   = items.reduce((s, i) => s + Number(i.total_deductions || 0), 0);
  const totalNet   = items.reduce((s, i) => s + Number(i.net_salary || 0), 0);
  const totalNetBs = items.reduce((s, i) => s + Number(i.net_salary_bs || 0), 0);

  document.getElementById("main-content").innerHTML = `
    <div class="period-header">
      <div>
        <div class="period-title">${p.period_label}</div>
        <div class="period-meta">${p.period_type} · ${new Date(p.start_date).toLocaleDateString("es-VE")} → ${new Date(p.end_date).toLocaleDateString("es-VE")} · Tasa: Bs. ${Number(p.exchange_rate).toFixed(2)}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-sm" onclick="exportPDFRecibo()"><i class="bi bi-file-pdf"></i> PDF Libro Nómina</button>
        ${!isClosed ? `<button class="btn-sm green" onclick="confirmarCierre()"><i class="bi bi-lock"></i> Cerrar período</button>` : `<span class="btn-sm" style="background:#e2e8f0;cursor:default;"><i class="bi bi-lock-fill"></i> Cerrado</span>`}
      </div>
    </div>

    ${isClosed ? `<div class="alert-warning"><i class="bi bi-lock-fill" style="margin-right:6px;"></i>Este período está cerrado. Los valores son de solo lectura.</div>` : `<div class="alert-info"><i class="bi bi-pencil" style="margin-right:6px;"></i>Puedes editar los campos directamente en la tabla. Los cálculos se actualizan automáticamente al guardar cada fila.</div>`}

    <div class="totals-bar">
      <div class="total-card"><div class="total-label">Empleados</div><div class="total-value" style="color:#2563eb;">${items.length}</div></div>
      <div class="total-card"><div class="total-label">Total bruto</div><div class="total-value">$${totalGross.toFixed(2)}</div></div>
      <div class="total-card"><div class="total-label">Total deducciones</div><div class="total-value" style="color:#dc2626;">-$${totalDed.toFixed(2)}</div></div>
      <div class="total-card"><div class="total-label">Total neto USD</div><div class="total-value" style="color:#16a34a;">$${totalNet.toFixed(2)}</div></div>
      <div class="total-card"><div class="total-label">Total neto Bs.</div><div class="total-value" style="color:#b45309;">Bs. ${totalNetBs.toFixed(2)}</div></div>
    </div>

    <div style="overflow-x:auto;background:white;border:1px solid #e2e8f0;border-radius:14px;">
      <table class="payroll-table">
        <thead>
          <tr>
            <th style="text-align:left;">Empleado</th>
            <th>Salario base</th><th>Cesta ticket</th><th>H.Extra $</th><th>Bonos</th>
            <th>Bruto</th>
            <th>SSO (-)</th><th>INCES (-)</th><th>FAOV (-)</th><th>Préstamo (-)</th>
            <th>Total ded.</th>
            <th>NETO $</th><th>NETO Bs.</th>
            ${!isClosed ? "<th></th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${items.map(item => renderItemRow(item)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderItemRow(item) {
  const ro = isClosed ? "readonly" : "";
  const inputClass = isClosed ? "editable" : "editable";
  return `
    <tr id="row-${item.id}">
      <td>
        <div style="font-weight:700;">${item.employee_name}</div>
        <div style="font-size:10px;color:#94a3b8;">${item.position || "—"}</div>
      </td>
      <td><input ${ro} class="${inputClass}" data-field="base_salary" data-item="${item.id}" value="${Number(item.base_salary).toFixed(2)}"></td>
      <td><input ${ro} class="${inputClass}" data-field="food_bonus" data-item="${item.id}" value="${Number(item.food_bonus).toFixed(2)}"></td>
      <td><input ${ro} class="${inputClass}" data-field="overtime_amount" data-item="${item.id}" value="${Number(item.overtime_amount).toFixed(2)}"></td>
      <td><input ${ro} class="${inputClass}" data-field="bonuses" data-item="${item.id}" value="${Number(item.bonuses).toFixed(2)}"></td>
      <td style="font-weight:600;">$${Number(item.gross_salary).toFixed(2)}</td>
      <td class="badge-deduction">-$${Number(item.sso_deduction).toFixed(2)}</td>
      <td class="badge-deduction">-$${Number(item.inces_deduction).toFixed(2)}</td>
      <td class="badge-deduction">-$${Number(item.faov_deduction).toFixed(2)}</td>
      <td><input ${ro} class="${inputClass}" data-field="loan_deduction" data-item="${item.id}" value="${Number(item.loan_deduction).toFixed(2)}"></td>
      <td class="badge-deduction" id="total-ded-${item.id}">-$${Number(item.total_deductions).toFixed(2)}</td>
      <td class="net-value" id="net-${item.id}">$${Number(item.net_salary).toFixed(2)}</td>
      <td style="color:#b45309;font-weight:600;" id="net-bs-${item.id}">Bs.${Number(item.net_salary_bs).toFixed(2)}</td>
      ${!isClosed ? `<td><button class="btn-sm primary" onclick="saveItem(${item.id})"><i class="bi bi-check2"></i></button></td>` : ""}
    </tr>`;
}

async function saveItem(itemId) {
  const inputs = document.querySelectorAll(`[data-item="${itemId}"]`);
  const body = {};
  inputs.forEach(inp => { body[inp.dataset.field] = Number(inp.value) || 0; });

  try {
    const res = await apiFetch(`/payroll/items/${itemId}`, { method: "PUT", body: JSON.stringify(body) });
    if (!res?.ok) { alert(res?.error || "Error al guardar."); return; }
    // Actualizar los totales calculados en el DOM sin recargar toda la página
    const item = res.data;
    document.getElementById(`total-ded-${itemId}`).textContent = `-$${Number(item.total_deductions).toFixed(2)}`;
    document.getElementById(`net-${itemId}`).textContent = `$${Number(item.net_salary).toFixed(2)}`;
    document.getElementById(`net-bs-${itemId}`).textContent = `Bs.${Number(item.net_salary_bs).toFixed(2)}`;
    // Actualizar en periodData
    const idx = periodData.items.findIndex(i => i.id === itemId);
    if (idx >= 0) periodData.items[idx] = { ...periodData.items[idx], ...item };
    // Recalcular totales de la barra
    const items = periodData.items;
    const totalNet = items.reduce((s, i) => s + Number(i.net_salary || 0), 0);
    // Toast visual
    if (typeof showToast === "function") showToast("Guardado.", "success");
  } catch (e) { alert("Error de conexión."); }
}

async function confirmarCierre() {
  if (!confirm(`¿Cerrar el período "${periodData.period_label}"?\n\nEsta acción es irreversible. Los valores quedarán bloqueados.`)) return;
  try {
    const res = await apiFetch(`/payroll/periods/${periodData.id}/close`, { method: "POST" });
    if (!res?.ok) { alert(res?.error || "No se pudo cerrar."); return; }
    periodData.status = "CERRADO";
    isClosed = true;
    renderPeriod();
  } catch (e) { alert("Error de conexión."); }
}

// ── PDF Libro de Nómina ───────────────────────────────────────────
function exportPDFRecibo() {
  if (!periodData) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const items = periodData.items || [];

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 22, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255,255,255);
  doc.text("LIBRO DE NÓMINA", 14, 9);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148,163,184);
  doc.text(`Período: ${periodData.period_label} · ${periodData.period_type}`, 14, 16);
  doc.text(`Generado: ${new Date().toLocaleString("es-VE")}`, W-14, 16, { align:"right" });
  let y = 30;

  // Encabezados tabla
  const cols = ["Empleado","Cédula","Cargo","Bruto $","SSO","INCES","FAOV","Préstamo","Total Ded.","Neto $","Neto Bs."];
  const widths = [50, 22, 35, -18, -14, -14, -14, -16, -18, -18, -22];
  doc.setFillColor(241,245,249);
  doc.rect(14, y, W-28, 8, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(71,85,105);
  let x = 16;
  cols.forEach((h, i) => {
    const cw = Math.abs(widths[i]);
    const align = widths[i] < 0 ? "right" : "left";
    doc.text(h, align === "right" ? x + cw - 2 : x, y + 5.5, { align });
    x += cw;
  });
  y += 8;

  // Filas
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  items.forEach((item, ri) => {
    if (ri % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(14, y, W-28, 8, "F"); }
    doc.setTextColor(30,41,59);
    x = 16;
    const row = [
      item.employee_name, item.id_number || "—", item.position || "—",
      `$${Number(item.gross_salary).toFixed(2)}`,
      `-$${Number(item.sso_deduction).toFixed(2)}`,
      `-$${Number(item.inces_deduction).toFixed(2)}`,
      `-$${Number(item.faov_deduction).toFixed(2)}`,
      `-$${Number(item.loan_deduction).toFixed(2)}`,
      `-$${Number(item.total_deductions).toFixed(2)}`,
      `$${Number(item.net_salary).toFixed(2)}`,
      `Bs.${Number(item.net_salary_bs).toFixed(2)}`,
    ];
    row.forEach((cell, i) => {
      const cw = Math.abs(widths[i]);
      const align = widths[i] < 0 ? "right" : "left";
      doc.text(String(cell), align === "right" ? x + cw - 2 : x, y + 5.5, { align, maxWidth: cw - 3 });
      x += cw;
    });
    doc.setDrawColor(226,232,240); doc.line(14, y+8, W-14, y+8);
    y += 8;
    if (y > 185) { doc.addPage(); y = 20; }
  });

  // Totales
  const totalNet = items.reduce((s,i) => s + Number(i.net_salary||0), 0);
  const totalNetBs = items.reduce((s,i) => s + Number(i.net_salary_bs||0), 0);
  y += 4;
  doc.setFillColor(15,23,42); doc.rect(W-80, y, 66, 10, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(255,255,255);
  doc.text("TOTAL NETO", W-76, y+7);
  doc.text(`$${totalNet.toFixed(2)}`, W-16, y+7, { align:"right" });

  // Firmas
  y += 20;
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(100,116,139);
  [["Elaborado por", ""], ["Revisado por", ""], ["Aprobado por", ""]].forEach((f, i) => {
    const fx = 40 + i * 80;
    doc.line(fx, y, fx+60, y);
    doc.text(f[0], fx+30, y+6, { align:"center" });
  });

  // Footer
  doc.setFontSize(7); doc.setTextColor(148,163,184);
  doc.text("Kont Admin — Sistema de Gestión Empresarial", 14, 200);
  doc.text(`Pág. 1`, W-14, 200, { align:"right" });

  doc.save(`nomina_${periodData.period_label.replace(/\s/g,"_")}.pdf`);
}
