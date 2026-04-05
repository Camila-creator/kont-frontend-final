// assets/js/devoluciones.js
let creditNotes  = [];
let currentOrder = null;
let currentCNId  = null;

document.addEventListener("DOMContentLoaded", loadList);

// ── Lista ──────────────────────────────────────────────────────────
async function loadList() {
  try {
    const res = await apiFetch("/credit-notes");
    if (!res?.ok) return;
    creditNotes = res.data || [];
    renderList();
    updateKPIs();
  } catch (e) { console.error("Error cargando notas de crédito:", e); }
}

function renderList() {
  const tbody = document.getElementById("cn-body");
  if (!creditNotes.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><i class="bi bi-arrow-return-left"></i><p>No hay devoluciones registradas aún.</p><p style="font-size:12px;">Cuando un cliente devuelva un pedido, aparecerá aquí.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = creditNotes.map(cn => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:#0f172a;">${cn.note_number}</td>
      <td style="color:#2563eb;font-weight:600;">#${String(cn.order_number||"").padStart(4,"0")}</td>
      <td>${cn.customer_name || "—"}</td>
      <td><span class="badge ${cn.type === "TOTAL" ? "badge-total" : "badge-parcial"}">${cn.type}</span></td>
      <td style="font-size:12px;color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${cn.reason}">${cn.reason}</td>
      <td style="font-weight:700;color:#dc2626;">-$${Number(cn.total).toFixed(2)}</td>
      <td><span class="badge badge-${(cn.status||"emitida").toLowerCase()}">${cn.status}</span></td>
      <td style="white-space:nowrap;">
        <button class="btn-sm" onclick="openDetail(${cn.id})"><i class="bi bi-eye"></i> Ver</button>
      </td>
    </tr>`).join("");
}

function updateKPIs() {
  document.getElementById("kpi-total").textContent    = creditNotes.length;
  document.getElementById("kpi-emitidas").textContent = creditNotes.filter(cn => cn.status === "EMITIDA").length;
  const total = creditNotes.reduce((s, cn) => s + Number(cn.total || 0), 0);
  document.getElementById("kpi-monto").textContent    = "$" + total.toFixed(2);
}

// ── Modal nueva devolución ────────────────────────────────────────
function openNewModal() {
  currentOrder = null;
  document.getElementById("search-order-id").value   = "";
  document.getElementById("order-preview").style.display  = "none";
  document.getElementById("step-search").style.display    = "";
  document.getElementById("step-return").style.display    = "none";
  document.getElementById("new-error").style.display      = "none";
  document.getElementById("new-modal").classList.remove("hidden");
  document.getElementById("search-order-id").focus();
}

function closeNewModal() { document.getElementById("new-modal").classList.add("hidden"); }

async function searchOrder() {
  const id = document.getElementById("search-order-id").value.trim();
  if (!id) return;
  const errEl = document.getElementById("new-error");
  errEl.style.display = "none";

  try {
    const res = await apiFetch(`/orders/${id}`);
    if (!res?.ok || !res.data) {
      errEl.textContent = "Pedido no encontrado.";
      errEl.style.display = "block";
      document.getElementById("order-preview").style.display = "none";
      return;
    }

    currentOrder = res.data;
    const subtotal = (currentOrder.items || []).reduce((s, it) => s + Number(it.total || 0), 0);
    const discount = Number(currentOrder.discount_amount || 0);
    const status   = currentOrder.status;
    const canReturn = ["CONFIRMADO","DESPACHADO","ENTREGADO"].includes(status);

    document.getElementById("order-preview-content").innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-weight:700;color:#0f172a;">Pedido #${String(currentOrder.order_number||id).padStart(4,"0")}</div>
          <div style="font-size:12px;color:#64748b;">${currentOrder.customer_name || currentOrder.customer?.name || "—"} · ${new Date(currentOrder.order_date||currentOrder.created_at).toLocaleDateString("es-VE")}</div>
        </div>
        <span class="badge badge-${status.toLowerCase()}" style="background:${canReturn?"#dcfce7":"#fee2e2"};color:${canReturn?"#166534":"#dc2626"};">${status}</span>
      </div>
      ${(currentOrder.items||[]).slice(0,3).map(it =>
        `<div style="font-size:12px;color:#475569;padding:2px 0;">${it.qty}x ${it.product_name} — $${Number(it.total).toFixed(2)}</div>`
      ).join("")}
      ${(currentOrder.items||[]).length > 3 ? `<div style="font-size:11px;color:#94a3b8;">...y ${currentOrder.items.length - 3} items más</div>` : ""}
      <div style="font-weight:700;color:#0f172a;margin-top:8px;font-size:14px;">Total: $${(subtotal - discount).toFixed(2)}</div>
      ${!canReturn ? `<div style="color:#dc2626;font-size:12px;margin-top:6px;"><i class="bi bi-exclamation-triangle"></i> Solo se pueden devolver pedidos CONFIRMADOS, DESPACHADOS o ENTREGADOS.</div>` : ""}`;

    document.getElementById("order-preview").style.display = "";
    const btn = document.querySelector("#order-preview .btn-sm.primary");
    if (btn) btn.style.display = canReturn ? "" : "none";
  } catch (e) {
    errEl.textContent = "Error al buscar el pedido.";
    errEl.style.display = "block";
  }
}

function proceedToReturn() {
  if (!currentOrder) return;
  document.getElementById("step-search").style.display = "none";
  document.getElementById("step-return").style.display = "";
  document.getElementById("return-type").value   = "TOTAL";
  document.getElementById("return-reason").value = "";
  document.getElementById("return-notes").value  = "";
  renderItems("TOTAL");
  updateReturnTotals();
}

function backToSearch() {
  document.getElementById("step-search").style.display = "";
  document.getElementById("step-return").style.display = "none";
}

function onTypeChange() {
  const type = document.getElementById("return-type").value;
  renderItems(type);
  updateReturnTotals();
}

function renderItems(type) {
  const container = document.getElementById("items-list");
  const items = currentOrder?.items || [];
  container.innerHTML = items.map((it, i) => `
    <div class="item-row">
      <div class="item-name">${it.product_name}</div>
      <div class="item-qty">
        ${type === "PARCIAL"
          ? `<input type="number" min="0" max="${it.qty}" value="${it.qty}"
               id="qty-${it.product_id}" step="1"
               oninput="updateReturnTotals()"
               style="width:60px;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;text-align:right;">`
          : `<span style="color:#64748b;">${it.qty}</span>`}
      </div>
      <div class="item-price" style="font-size:12px;color:#64748b;">$${Number(it.unit_price).toFixed(2)}</div>
      <div class="item-total">$${Number(it.total).toFixed(2)}</div>
    </div>`).join("");
}

function updateReturnTotals() {
  const type  = document.getElementById("return-type").value;
  const items = currentOrder?.items || [];
  let total = 0;
  if (type === "TOTAL") {
    total = items.reduce((s, it) => s + Number(it.total || 0), 0) - Number(currentOrder.discount_amount || 0);
  } else {
    items.forEach(it => {
      const inp = document.getElementById(`qty-${it.product_id}`);
      const qty = inp ? Math.min(Number(inp.value) || 0, Number(it.qty)) : 0;
      total += qty * Number(it.unit_price);
    });
  }
  document.getElementById("return-totals").innerHTML = `
    <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;">
      <div class="total-line"><span style="color:#64748b;">Monto a devolver</span><span style="font-weight:700;color:#dc2626;">-$${total.toFixed(2)}</span></div>
    </div>`;
}

async function confirmReturn() {
  const type   = document.getElementById("return-type").value;
  const reason = document.getElementById("return-reason").value.trim();
  const notes  = document.getElementById("return-notes").value.trim();
  const errEl  = document.getElementById("new-error");
  errEl.style.display = "none";

  if (!reason) {
    errEl.textContent = "El motivo de la devolución es obligatorio.";
    errEl.style.display = "block"; return;
  }

  let items = [];
  if (type === "PARCIAL") {
    (currentOrder?.items || []).forEach(it => {
      const inp = document.getElementById(`qty-${it.product_id}`);
      const qty = inp ? Number(inp.value) || 0 : 0;
      if (qty > 0) items.push({ product_id: it.product_id, qty });
    });
    if (!items.length) {
      errEl.textContent = "Selecciona al menos un item con cantidad mayor a 0.";
      errEl.style.display = "block"; return;
    }
  }

  const btn = document.getElementById("btn-confirm-return");
  btn.disabled = true; btn.textContent = "Procesando...";

  try {
    const res = await apiFetch("/credit-notes", {
      method: "POST",
      body: JSON.stringify({ order_id: currentOrder.id, reason, type, notes, items }),
    });
    if (!res?.ok) {
      errEl.textContent = res?.error || "Error al emitir la nota.";
      errEl.style.display = "block";
      btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Emitir nota de crédito';
      return;
    }
    closeNewModal();
    await loadList();
    if (typeof showToast === "function") showToast(`Nota de crédito ${res.data.note_number} emitida. Inventario revertido.`, "success");
    openDetail(res.data.id);
  } catch (e) {
    errEl.textContent = "Error de conexión.";
    errEl.style.display = "block";
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Emitir nota de crédito';
  }
}

// ── Detalle y PDF ──────────────────────────────────────────────────
async function openDetail(id) {
  currentCNId = id;
  try {
    const res = await apiFetch(`/credit-notes/${id}`);
    if (!res?.ok) return;
    const cn = res.data;
    const items = cn.items || [];
    const total = Number(cn.total || 0);
    const canCancel = cn.status === "EMITIDA" && !cn.inventory_reversed;

    document.getElementById("detail-title").textContent = cn.note_number;
    document.getElementById("detail-content").innerHTML = `
      <div style="background:#fef2f2;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;">
        <div><strong>Pedido:</strong> #${String(cn.order_number||"").padStart(4,"0")}</div>
        <div><strong>Cliente:</strong> ${cn.customer_name_snapshot || cn.customer_name_live || "—"}</div>
        <div><strong>Tipo:</strong> ${cn.type} · <strong>Estado:</strong> ${cn.status}</div>
        <div><strong>Motivo:</strong> ${cn.reason}</div>
        <div><strong>Fecha:</strong> ${new Date(cn.created_at).toLocaleDateString("es-VE")}</div>
        ${cn.inventory_reversed ? `<div style="color:#16a34a;font-weight:700;margin-top:4px;"><i class="bi bi-check-circle-fill"></i> Inventario revertido</div>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px;">
        <thead><tr style="border-bottom:1px solid #e2e8f0;">
          <th style="padding:6px 8px;text-align:left;color:#64748b;">Producto</th>
          <th style="padding:6px 8px;text-align:right;color:#64748b;">Cant.</th>
          <th style="padding:6px 8px;text-align:right;color:#64748b;">P.Unit.</th>
          <th style="padding:6px 8px;text-align:right;color:#64748b;">Total</th>
        </tr></thead>
        <tbody>
          ${items.map(it => `<tr style="border-bottom:0.5px solid #f1f5f9;">
            <td style="padding:6px 8px;">${it.product_name_snapshot || it.product_name_live}</td>
            <td style="padding:6px 8px;text-align:right;">${it.qty}</td>
            <td style="padding:6px 8px;text-align:right;color:#64748b;">$${Number(it.unit_price).toFixed(2)}</td>
            <td style="padding:6px 8px;text-align:right;font-weight:700;">$${Number(it.total).toFixed(2)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div style="text-align:right;font-size:1.1rem;font-weight:800;color:#dc2626;">
        TOTAL A DEVOLVER: -$${total.toFixed(2)}
      </div>`;

    const cancelBtn = document.getElementById("btn-cancel-cn");
    cancelBtn.style.display = canCancel ? "" : "none";
    document.getElementById("detail-modal").classList.remove("hidden");

    // Guardar cn para PDF
    document.getElementById("btn-cancel-cn")._cn = cn;
  } catch (e) { console.error(e); }
}

function closeDetail() { document.getElementById("detail-modal").classList.add("hidden"); }

async function cancelCurrentCN() {
  if (!currentCNId) return;
  if (!confirm("¿Anular esta nota de crédito? No se puede deshacer si el inventario ya fue revertido.")) return;
  try {
    const res = await apiFetch(`/credit-notes/${currentCNId}/cancel`, { method: "POST" });
    if (!res?.ok) { alert(res?.error || "No se pudo anular."); return; }
    closeDetail();
    await loadList();
    if (typeof showToast === "function") showToast("Nota de crédito anulada.", "warning");
  } catch (e) { alert("Error de conexión."); }
}

// ── PDF Nota de Crédito ────────────────────────────────────────────
function printCreditNote() {
  const cn = document.getElementById("btn-cancel-cn")._cn;
  if (!cn) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, W, 22, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(255,255,255);
  doc.text(cn.tenant_name || "Empresa", 14, 9);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(255,200,200);
  doc.text("NOTA DE CRÉDITO / DEVOLUCIÓN", 14, 16);
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text(cn.note_number, W-14, 9, { align:"right" });
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(255,200,200);
  doc.text(`Fecha: ${new Date(cn.created_at).toLocaleDateString("es-VE")}`, W-14, 16, { align:"right" });

  let y = 32;
  doc.setFillColor(254,242,242);
  doc.roundedRect(14, y, W-28, 22, 3, 3, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(30,41,59);
  doc.text("Pedido original:", 18, y+7);
  doc.setFont("helvetica","normal");
  doc.text(`#${String(cn.order_number||"").padStart(4,"0")}`, 60, y+7);
  doc.text("Cliente:", 18, y+14);
  doc.text(cn.customer_name_snapshot || "—", 60, y+14);
  doc.text("Motivo:", 18, y+20);
  doc.text(cn.reason || "—", 60, y+20);
  y += 28;

  const headers = ["Producto","Cant.","P.Unit.","Total"];
  const widths  = [105, -18, -22, -24];
  doc.setFillColor(241,245,249);
  doc.rect(14, y, W-28, 8, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(71,85,105);
  let x = 16;
  headers.forEach((h,i) => {
    const cw = Math.abs(widths[i]);
    const al = widths[i] < 0 ? "right" : "left";
    doc.text(h, al==="right" ? x+cw-2 : x, y+5.5, { align:al });
    x += cw;
  });
  y += 8;

  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  (cn.items||[]).forEach((it, ri) => {
    if (ri%2===0) { doc.setFillColor(248,250,252); doc.rect(14,y,W-28,8,"F"); }
    doc.setTextColor(30,41,59);
    x = 16;
    const row = [
      it.product_name_snapshot || it.product_name_live || "—",
      String(it.qty),
      `$${Number(it.unit_price).toFixed(2)}`,
      `$${Number(it.total).toFixed(2)}`,
    ];
    row.forEach((cell,i) => {
      const cw = Math.abs(widths[i]);
      const al = widths[i] < 0 ? "right" : "left";
      doc.text(cell, al==="right"?x+cw-2:x, y+5.5, { align:al, maxWidth:cw-3 });
      x += cw;
    });
    doc.setDrawColor(226,232,240); doc.line(14,y+8,W-14,y+8);
    y += 8;
  });

  y += 6;
  doc.setFillColor(220,38,38); doc.rect(W-80, y, 66, 12, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(255,255,255);
  doc.text("TOTAL DEVUELTO", W-76, y+8);
  doc.text(`-$${Number(cn.total).toFixed(2)}`, W-16, y+8, { align:"right" });

  y += 24;
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(100,116,139);
  doc.text("El presente documento certifica la devolución de la mercancía detallada arriba.", 14, y);
  y += 16;
  doc.line(14, y, 80, y); doc.line(W-80, y, W-14, y);
  doc.setFontSize(8); doc.setTextColor(100,116,139);
  doc.text("Firma Vendedor", 47, y+6, { align:"center" });
  doc.text("Firma Cliente", W-47, y+6, { align:"center" });

  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(7); doc.setTextColor(148,163,184);
  doc.text("Kont Admin — Sistema de Gestión Empresarial", 14, H-8);
  doc.text(`${cn.note_number}`, W-14, H-8, { align:"right" });

  doc.save(`${cn.note_number}.pdf`);
}

// Cerrar modales al click fuera
["new-modal","detail-modal"].forEach(id => {
  document.getElementById(id)?.addEventListener("click", function(e) {
    if (e.target === this) this.classList.add("hidden");
  });
});

// Enter en búsqueda
document.getElementById("search-order-id")?.addEventListener("keydown", e => {
  if (e.key === "Enter") searchOrder();
});
