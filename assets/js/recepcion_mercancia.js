// assets/js/recepcion_mercancia.js
// Módulo de Nota de Recepción de Mercancía — basado en una compra (purchase)

let compraActual = null;

// ─────────────────────────────────────────────────────────
// BUSCAR COMPRA
// ─────────────────────────────────────────────────────────
async function buscarCompraParaRecepcion() {
    const purchaseId = document.getElementById("search-id").value.trim();
    const feedback = document.getElementById("feedback-busqueda");
    if (!purchaseId) return;

    feedback.className = "text-[10px] mt-2 font-bold uppercase block text-slate-400";
    feedback.innerText = "Buscando...";

    try {
        // Obtener cabecera
        const resHeader = await apiFetch(`/purchases/${purchaseId}`);
        if (!resHeader || resHeader.error) {
            feedback.className = "text-[10px] mt-2 font-bold uppercase block text-red-600";
            feedback.innerText = "❌ Compra no encontrada";
            return;
        }

        // Obtener items
        const resItems = await apiFetch(`/purchases/${purchaseId}/items`);

        compraActual = {
            ...resHeader.data,
            items: resItems?.data || [],
        };

        document.getElementById("action-buttons").classList.remove("hidden");
        document.getElementById("format-selection").classList.remove("opacity-50", "pointer-events-none");

        feedback.className = "text-[10px] mt-2 font-bold uppercase block text-emerald-600";
        feedback.innerText = `✅ Compra #${compraActual.purchase_number || purchaseId} cargada`;

        renderRecepcion();
    } catch (err) {
        feedback.className = "text-[10px] mt-2 font-bold uppercase block text-red-600";
        feedback.innerText = "❌ Error al cargar la compra";
        console.error(err);
    }
}

// ─────────────────────────────────────────────────────────
// RENDERIZAR NOTA DE RECEPCIÓN
// ─────────────────────────────────────────────────────────
function renderRecepcion() {
    if (!compraActual) return;
    document.getElementById("empty-state")?.classList.add("hidden");
    const area = document.getElementById("printable-area");
    area.classList.remove("hidden");
    area.innerHTML = generarNotaRecepcionHTML(compraActual);
}

function generarNotaRecepcionHTML(data) {
    const userData = JSON.parse(localStorage.getItem("agromedic_user") || "{}");
    const empresaNombre = userData.company_name || data.tenant_name || "Mi Empresa";
    const logoUrl = data.tenant_logo || null;
    const items = data.items || [];
    const total = items.reduce((s, it) => s + parseFloat(it.total || 0), 0);
    const proveedor = data.supplier_name || "Proveedor";
    const fecha = new Date(data.purchase_date || Date.now()).toLocaleDateString("es-VE");
    const recibidoPor = userData.name || "—";

    // Helper logo igual que facturación
    const logoHTML = logoUrl
        ? `<img src="${logoUrl}" alt="${empresaNombre}" style="max-height:55px; max-width:150px; object-fit:contain;">`
        : `<div style="display:inline-flex; align-items:center; justify-content:center;
               width:55px; height:55px; border-radius:10px;
               background:#1e293b; color:#fff; font-size:1.2rem; font-weight:900; font-style:italic;">
               ${empresaNombre.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase()}
           </div>`;

    return `
    <div style="width:700px; padding:40px; background:#fff; font-family:'Arial',sans-serif;">

      <!-- HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0f172a; padding-bottom:18px; margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${logoHTML}
          <div>
            <div style="font-size:1.3rem; font-weight:900; color:#0f172a;">${empresaNombre}</div>
            <div style="font-size:11px; color:#64748b; font-weight:600;">Nota de Recepción de Mercancía</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#94a3b8; letter-spacing:0.12em;">Número de Recepción</div>
          <div style="font-size:1.5rem; font-weight:900; color:#0f172a;">NRM-${String(data.purchase_number || data.id).padStart(5, "0")}</div>
          <div style="font-size:11px; color:#64748b;">Fecha: ${fecha}</div>
          ${data.invoice_ref ? `<div style="font-size:11px; color:#64748b;">Ref. Factura Prov.: ${data.invoice_ref}</div>` : ""}
        </div>
      </div>

      <!-- PROVEEDOR + CONDICIÓN -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#94a3b8; margin-bottom:6px;">Proveedor</div>
          <div style="font-size:1rem; font-weight:800; color:#0f172a;">${proveedor}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#94a3b8; margin-bottom:6px;">Condición de Pago</div>
          <div style="font-size:1rem; font-weight:800; color:${data.condition === "CREDITO" ? "#dc2626" : "#16a34a"};">${data.condition || "CONTADO"}</div>
          ${data.due_date ? `<div style="font-size:11px; color:#64748b;">Vence: ${new Date(data.due_date).toLocaleDateString("es-VE")}</div>` : ""}
        </div>
      </div>

      <!-- TABLA DE ITEMS RECIBIDOS -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:24px; font-size:13px;">
        <thead>
          <tr style="border-top:2px solid #0f172a; border-bottom:2px solid #0f172a; background:#f8fafc;">
            <th style="padding:10px 8px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#475569;">#</th>
            <th style="padding:10px 8px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#475569;">Descripción</th>
            <th style="padding:10px 8px; text-align:center; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#475569;">Unidad</th>
            <th style="padding:10px 8px; text-align:center; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#475569;">Cant. Esperada</th>
            <th style="padding:10px 8px; text-align:center; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#475569;">Cant. Recibida</th>
            <th style="padding:10px 8px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#475569;">Costo Unit.</th>
            <th style="padding:10px 8px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#475569;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, i) => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 8px; color:#94a3b8; font-size:11px;">${i + 1}</td>
              <td style="padding:10px 8px;">
                <div style="font-weight:700; color:#0f172a;">${it.product_name || it.supply_name || "—"}</div>
                ${it.supply_unit ? `<div style="font-size:10px; color:#94a3b8;">${it.supply_unit}</div>` : ""}
              </td>
              <td style="padding:10px 8px; text-align:center; color:#475569;">${it.supply_unit || it.unit || "UNIDAD"}</td>
              <td style="padding:10px 8px; text-align:center; font-weight:700; color:#0f172a;">${it.qty}</td>
              <td style="padding:10px 8px; text-align:center;">
                <div style="border:1px solid #cbd5e1; border-radius:4px; width:50px; height:26px; margin:0 auto; background:#fff;"></div>
              </td>
              <td style="padding:10px 8px; text-align:right; color:#475569;">$${parseFloat(it.unit_cost || 0).toFixed(2)}</td>
              <td style="padding:10px 8px; text-align:right; font-weight:700; color:#0f172a;">$${parseFloat(it.total || 0).toFixed(2)}</td>
            </tr>`).join("")}
        </tbody>
      </table>

      <!-- TOTAL -->
      <div style="display:flex; justify-content:flex-end; margin-bottom:32px;">
        <div style="min-width:220px; border-top:2px solid #0f172a; padding-top:10px;">
          <div style="display:flex; justify-content:space-between; font-size:1.2rem; font-weight:900; color:#0f172a;">
            <span>TOTAL</span>
            <span>$${total.toFixed(2)}</span>
          </div>
          ${data.currency_code && data.currency_code !== "USD" && data.exchange_rate > 1
            ? `<div style="font-size:11px; color:#64748b; text-align:right;">
                 Bs. ${(total * parseFloat(data.exchange_rate)).toFixed(2)} (Tasa: ${parseFloat(data.exchange_rate).toFixed(2)})
               </div>` : ""}
        </div>
      </div>

      <!-- OBSERVACIONES -->
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:14px; margin-bottom:28px;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:6px; letter-spacing:0.1em;">Observaciones / Diferencias</div>
        <div style="height:48px;"></div>
      </div>

      <!-- FIRMAS -->
      <div style="display:flex; justify-content:space-between; gap:24px; margin-top:16px;">
        <div style="flex:1; text-align:center;">
          <div style="height:50px; border-bottom:1px solid #0f172a; margin-bottom:8px;"></div>
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#475569;">Recibido por</div>
          <div style="font-size:12px; color:#0f172a; font-weight:600; margin-top:2px;">${recibidoPor}</div>
        </div>
        <div style="flex:1; text-align:center;">
          <div style="height:50px; border-bottom:1px solid #0f172a; margin-bottom:8px;"></div>
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#475569;">Despachado por</div>
          <div style="font-size:12px; color:#94a3b8; margin-top:2px;">(Rep. del Proveedor)</div>
        </div>
        <div style="flex:1; text-align:center;">
          <div style="height:50px; border-bottom:1px solid #0f172a; margin-bottom:8px;"></div>
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#475569;">Autorizado por</div>
          <div style="font-size:12px; color:#94a3b8; margin-top:2px;">(Supervisor)</div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="margin-top:24px; border-top:1px solid #e2e8f0; padding-top:10px; text-align:center; font-size:10px; color:#94a3b8;">
        Documento generado por Kont Admin • ${new Date().toLocaleString("es-VE")}
      </div>
    </div>`;
}

function ejecutarImpresion() {
    if (!compraActual) return;
    window.print();
}

// Init desde URL
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const purchaseId = params.get("purchaseId");
    if (purchaseId) {
        const input = document.getElementById("search-id");
        if (input) { input.value = purchaseId; setTimeout(buscarCompraParaRecepcion, 150); }
    }
});
