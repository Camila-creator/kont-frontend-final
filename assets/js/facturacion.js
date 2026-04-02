// assets/js/facturacion.js
// Sistema de facturación Kont — con logo del tenant, templates mejorados

let pedidoActual = null;

// ─────────────────────────────────────────────────────────
// 1. BUSCAR PEDIDO
// ─────────────────────────────────────────────────────────
async function buscarPedidoParaFacturar() {
    const orderId = document.getElementById("search-id").value.trim();
    const feedback = document.getElementById("feedback-busqueda");
    if (!orderId) return;

    feedback.className = "text-[10px] mt-2 font-bold uppercase block text-slate-400";
    feedback.innerText = "Buscando...";

    try {
        const res = await apiFetch(`/orders/${orderId}`);
        if (!res) return;

        pedidoActual = res.data || res;

        document.getElementById("format-selection").classList.remove("opacity-50", "pointer-events-none");
        document.getElementById("action-buttons").classList.remove("hidden");

        feedback.className = "text-[10px] mt-2 font-bold uppercase block text-emerald-600";
        feedback.innerText = `✅ Pedido #${pedidoActual.order_number || orderId} cargado`;

        cambiarFormato("invoice");
    } catch (err) {
        pedidoActual = null;
        feedback.className = "text-[10px] mt-2 font-bold uppercase block text-red-600";
        feedback.innerText = "❌ Pedido no encontrado";
    }
}

// ─────────────────────────────────────────────────────────
// 2. ENVIAR POR WHATSAPP
// ─────────────────────────────────────────────────────────
function enviarPorWhatsApp() {
    if (!pedidoActual) return;

    const cliente = pedidoActual.customer || { name: pedidoActual.customer_name || "Cliente", phone: "" };
    const empresa = pedidoActual.tenant || { name: "Nuestra Tienda" };
    const items = pedidoActual.items || [];

    const telefono = (cliente.phone || "").replace(/\D/g, "");
    if (!telefono) { alert("El cliente no tiene teléfono registrado."); return; }

    const subtotal = items.reduce((s, it) => s + parseFloat(it.total || 0), 0);
    const descuento = parseFloat(pedidoActual.discount_amount || 0);
    const total = subtotal - descuento;

    let msg = `*Hola, ${cliente.name.split(" ")[0]}!* 👋\n`;
    msg += `Te enviamos el resumen de tu compra en *${empresa.name}*:\n\n`;
    msg += `*Orden:* #${pedidoActual.order_number || pedidoActual.id}\n`;
    msg += `*Fecha:* ${new Date(pedidoActual.created_at).toLocaleDateString("es-VE")}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    items.forEach(it => {
        msg += `• ${it.qty}x ${it.product_name} — $${parseFloat(it.total).toFixed(2)}\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (descuento > 0) msg += `Descuento: -$${descuento.toFixed(2)}\n`;
    msg += `*TOTAL: $${total.toFixed(2)}*\n\n`;
    msg += `¡Gracias por preferirnos! 🚀`;

    window.open(`https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(msg)}`, "_blank");
}

// ─────────────────────────────────────────────────────────
// 3. CAMBIAR FORMATO / RENDERIZAR
// ─────────────────────────────────────────────────────────
function cambiarFormato(formato) {
    if (!pedidoActual) return;

    document.querySelectorAll(".format-btn").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[onclick="cambiarFormato('${formato}')"]`);
    if (btn) btn.classList.add("active");

    document.getElementById("empty-state")?.classList.add("hidden");
    const area = document.getElementById("printable-area");
    area.classList.remove("hidden");

    const templates = {
        ticket:       generarTicketHTML,
        invoice:      generarNotaEntregaHTML,
        "garantia-tlf": generarGarantiaTelefonosHTML,
        contract:     generarContratoHTML,
    };

    area.innerHTML = (templates[formato] || generarNotaEntregaHTML)(pedidoActual);
}

// ─────────────────────────────────────────────────────────
// 4. IMPRIMIR
// ─────────────────────────────────────────────────────────
function ejecutarImpresion() {
    if (!pedidoActual) return;
    window.print();
}

// ─────────────────────────────────────────────────────────
// HELPER: Logo del tenant
// Usa logo_url si existe, si no genera iniciales elegantes
// Funciona tanto en garantías como notas de entrega
// ─────────────────────────────────────────────────────────
function renderLogoHeader(empresa, alignRight = false) {
    const logoUrl = empresa.logo_url || empresa.tenant_logo || null;
    const nombre = empresa.name || empresa.tenant_name_snapshot || "EMPRESA";
    const iniciales = nombre.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

    const logoHTML = logoUrl
        ? `<img src="${logoUrl}" alt="${nombre}" style="max-height:60px; max-width:160px; object-fit:contain;">`
        : `<div style="display:inline-flex; align-items:center; justify-content:center;
                       width:60px; height:60px; border-radius:12px;
                       background:#1e293b; color:#fff;
                       font-size:1.4rem; font-weight:900; font-style:italic;">${iniciales}</div>`;

    return `<div style="text-align:${alignRight ? "right" : "left"};">${logoHTML}</div>`;
}

// ─────────────────────────────────────────────────────────
// TEMPLATE 1: Garantía de Teléfonos (mejorada con logo)
// ─────────────────────────────────────────────────────────
function generarGarantiaTelefonosHTML(data) {
    const empresa = data.tenant || {};
    const cliente = data.customer || {
        name: data.customer_name || "N/A",
        doc: data.customer_doc || "N/A",
        phone: data.customer_phone || "N/A",
        address: data.customer_address || "N/A",
    };
    const item = data.items?.[0] || {};
    const vendedor = data.user_name || localStorage.getItem("agromedic_user")
        ? JSON.parse(localStorage.getItem("agromedic_user") || "{}").name || "ADMINISTRADOR"
        : "ADMINISTRADOR";

    const subtotal = (data.items || []).reduce((s, it) => s + parseFloat(it.total || 0), 0);
    const descuento = parseFloat(data.discount_amount || 0);
    const total = subtotal - descuento;

    const checks = ["Cámara principal","Cámara frontal","Flash","Botones","Wifi",
                    "Puerto de carga","Micrófono/Corneta","Pantalla","Face ID/Touch ID",
                    "Sensor Proximidad","Red Celular"];

    return `
    <div style="width:700px; padding:16px; border:2px solid #000; background:#fff; font-family:'Arial',sans-serif;">

      <!-- HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; border-bottom:2px solid #000; padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${renderLogoHeader(empresa)}
          <div>
            <div style="font-size:1.6rem; font-weight:900; font-style:italic; color:#dc2626; line-height:1; text-transform:uppercase;">${empresa.name || "EMPRESA"}</div>
            ${empresa.instagram ? `<div style="font-size:11px; font-weight:700; color:#dc2626;">IG: @${empresa.instagram}</div>` : ""}
            ${empresa.phone ? `<div style="font-size:10px; color:#666;">Tel: ${empresa.phone}</div>` : ""}
          </div>
        </div>
        <div style="text-align:right; font-size:10px; line-height:1.6; font-weight:700;">
          <div style="font-size:12px; text-decoration:underline; text-transform:uppercase; font-style:italic; margin-bottom:4px;">Certificado de Garantía</div>
          <div>FECHA: ${new Date(data.created_at || Date.now()).toLocaleDateString("es-VE")}</div>
          <div>ORDEN: #${String(data.order_number || data.id).padStart(4, "0")}</div>
          ${empresa.rif ? `<div>RIF: ${empresa.rif}</div>` : ""}
          ${empresa.address ? `<div style="font-size:9px; max-width:180px; text-align:right;">${empresa.address}</div>` : ""}
        </div>
      </div>

      <!-- CLIENTE -->
      <div style="background:#000; color:#fff; font-size:10px; font-weight:700; text-align:center; padding:4px; text-transform:uppercase; margin-bottom:8px;">Información del Cliente</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 30px; font-size:11px; margin-bottom:12px; padding:0 6px;">
        <div style="border-bottom:1px solid #ddd; padding-bottom:3px;"><b style="font-style:italic;">Nombre:</b> <span style="text-transform:uppercase;">${cliente.name}</span></div>
        <div style="border-bottom:1px solid #ddd; padding-bottom:3px;"><b style="font-style:italic;">ID/RIF:</b> ${cliente.doc || cliente.document || "S/D"}</div>
        <div style="border-bottom:1px solid #ddd; padding-bottom:3px;"><b style="font-style:italic;">Dirección:</b> <span style="font-size:10px;">${cliente.address || "N/A"}</span></div>
        <div style="border-bottom:1px solid #ddd; padding-bottom:3px;"><b style="font-style:italic;">Teléfono:</b> ${cliente.phone || "N/A"}</div>
      </div>

      <!-- EQUIPO -->
      <div style="background:#374151; color:#fff; font-size:10px; font-weight:700; text-align:center; padding:4px; text-transform:uppercase; margin-bottom:8px;">Información del Equipo</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 30px; font-size:11px; margin-bottom:12px; padding:0 6px;">
        <div style="border-bottom:1px solid #ddd; padding-bottom:3px;"><b style="font-style:italic;">Modelo:</b> <span style="color:#1d4ed8; font-weight:700; text-transform:uppercase;">${item.product_name || item.product_name_snapshot || "N/A"}</span></div>
        <div style="border-bottom:1px solid #ddd; padding-bottom:3px;"><b style="font-style:italic;">IMEI/Serial:</b> <span style="font-family:monospace; font-weight:700;">${item.imei_snapshot || item.imei || "S/N"}</span></div>
        <div style="border-bottom:1px solid #ddd; padding-bottom:3px;"><b style="font-style:italic;">Capacidad:</b> ${item.capacity || "N/A"}</div>
        <div style="border-bottom:1px solid #ddd; padding-bottom:3px;"><b style="font-weight:700;">TOTAL:</b> <span style="color:#dc2626; font-weight:900; font-size:1rem;">$${total.toFixed(2)}</span></div>
      </div>

      <!-- CHECKLIST + TÉRMINOS -->
      <div style="display:flex; gap:14px;">
        <div style="flex:1;">
          <table style="width:100%; border-collapse:collapse; font-size:9px;">
            <thead><tr style="background:#f1f5f9;">
              <th style="border:1px solid #000; padding:4px 6px; text-align:left; font-style:italic; text-transform:uppercase; font-size:8px;">Funcionalidad</th>
              <th style="border:1px solid #000; padding:4px; width:28px;">SI</th>
              <th style="border:1px solid #000; padding:4px; width:28px;">NO</th>
            </tr></thead>
            <tbody>
              ${checks.map(f => `<tr>
                <td style="border:1px solid #000; padding:3px 5px; font-weight:600; font-style:italic; text-transform:uppercase;">${f}</td>
                <td style="border:1px solid #000;"></td>
                <td style="border:1px solid #000;"></td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="border:1px solid #000; padding:8px; background:#f9fafb; font-size:9px;">
            <div style="font-weight:900; text-decoration:underline; text-transform:uppercase; font-size:8px; margin-bottom:5px;">Términos del Servicio:</div>
            <p style="font-style:italic; text-align:justify; margin:2px 0; line-height:1.4;">1. PANTALLAS: No poseen garantía una vez retirado el equipo del local.</p>
            <p style="font-style:italic; text-align:justify; margin:2px 0; line-height:1.4;">2. La garantía cubre fallas de fábrica. Equipos mojados, golpeados o manipulados por terceros anulan este certificado.</p>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:20px;">
            <div style="text-align:center;">
              <div style="width:70px; height:80px; border:2px solid #000; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; font-size:7px; color:#ccc; font-style:italic; font-weight:700; text-transform:uppercase;">Huella</div>
              <div style="border-top:1px solid #000; font-size:9px; font-weight:900; text-transform:uppercase; padding-top:3px;">Cliente</div>
            </div>
            <div style="text-align:center; display:flex; flex-direction:column; justify-content:flex-end;">
              <div style="font-size:11px; font-weight:900; font-style:italic; border-bottom:1px solid #000; padding-bottom:4px; margin-bottom:3px; text-transform:uppercase;">${vendedor}</div>
              <div style="font-size:9px; font-weight:900; text-transform:uppercase;">Firma Vendedor</div>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="margin-top:10px; border-top:1px solid #000; padding-top:6px; display:flex; justify-content:space-between; font-size:10px; font-weight:700;">
        ${empresa.instagram ? `<span style="color:#dc2626; font-style:italic;">IG: @${empresa.instagram}</span>` : "<span></span>"}
        ${empresa.phone ? `<span>Tel: ${empresa.phone}</span>` : "<span></span>"}
        ${empresa.address ? `<span style="font-size:9px; color:#666;">${empresa.address}</span>` : "<span></span>"}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────
// TEMPLATE 2: Recibo Térmico / Ticket
// ─────────────────────────────────────────────────────────
function generarTicketHTML(data) {
    const empresa = data.tenant || {};
    const items = data.items || [];
    const subtotal = items.reduce((s, it) => s + parseFloat(it.total || 0), 0);
    const descuento = parseFloat(data.discount_amount || 0);
    const total = subtotal - descuento;

    return `
    <div style="width:300px; padding:16px; font-family:'Courier New',monospace; background:#fff; font-size:12px;">
      <div style="text-align:center; margin-bottom:12px;">
        ${empresa.logo_url || empresa.tenant_logo
            ? `<img src="${empresa.logo_url || empresa.tenant_logo}" style="max-height:50px; margin:0 auto 6px; display:block;">`
            : `<div style="font-size:1.3rem; font-weight:900;">${empresa.name || "RECIBO"}</div>`}
        <div style="font-weight:900; text-transform:uppercase;">${empresa.name || "EMPRESA"}</div>
        ${empresa.rif ? `<div>${empresa.rif}</div>` : ""}
        ${empresa.address ? `<div style="font-size:10px;">${empresa.address}</div>` : ""}
        <div style="margin-top:4px;">NOTA DE ENTREGA</div>
        <div>Nro: #${String(data.order_number || data.id).padStart(5, "0")}</div>
        <div>${new Date(data.created_at || Date.now()).toLocaleDateString("es-VE")}</div>
      </div>
      <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; padding:6px 0; margin-bottom:8px;">
        <div>Cliente: ${data.customer?.name || data.customer_name}</div>
        ${data.customer?.phone ? `<div>Tel: ${data.customer.phone}</div>` : ""}
      </div>
      ${items.map(it => `
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span style="max-width:200px; overflow:hidden;">${it.qty}x ${(it.product_name || "").substring(0, 18)}</span>
          <span>$${parseFloat(it.total).toFixed(2)}</span>
        </div>
        ${it.imei_snapshot ? `<div style="font-size:10px; color:#666; margin-bottom:3px;">IMEI: ${it.imei_snapshot}</div>` : ""}
      `).join("")}
      <div style="border-top:1px dashed #000; margin-top:6px; padding-top:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span>
        </div>
        ${descuento > 0 ? `<div style="display:flex; justify-content:space-between; color:#dc2626; font-weight:700;">
          <span>Descuento:</span><span>-$${descuento.toFixed(2)}</span>
        </div>` : ""}
        <div style="display:flex; justify-content:space-between; font-weight:900; font-size:1.1rem; border-top:1px solid #000; margin-top:4px; padding-top:4px;">
          <span>TOTAL:</span><span>$${total.toFixed(2)}</span>
        </div>
      </div>
      <div style="text-align:center; margin-top:12px; font-size:11px;">
        <div>¡Gracias por su compra!</div>
        ${empresa.instagram ? `<div>@${empresa.instagram}</div>` : ""}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────
// TEMPLATE 3: Nota de Entrega A4 (mejorada con logo)
// ─────────────────────────────────────────────────────────
function generarNotaEntregaHTML(data) {
    const empresa = data.tenant || {};
    const cliente = data.customer || { name: data.customer_name || "N/A" };
    const items = data.items || [];
    const subtotal = items.reduce((s, it) => s + parseFloat(it.total || 0), 0);
    const descuento = parseFloat(data.discount_amount || 0);
    const total = subtotal - descuento;

    return `
    <div style="width:700px; padding:40px; background:#fff; font-family:'Arial',sans-serif;">

      <!-- HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0f172a; padding-bottom:20px; margin-bottom:28px;">
        <div style="display:flex; align-items:center; gap:16px;">
          ${renderLogoHeader(empresa)}
          <div>
            <div style="font-size:1.5rem; font-weight:900; color:#0f172a;">${empresa.name || "EMPRESA"}</div>
            ${empresa.rif ? `<div style="font-size:12px; color:#64748b; font-weight:600;">RIF: ${empresa.rif}</div>` : ""}
            ${empresa.address ? `<div style="font-size:11px; color:#94a3b8;">${empresa.address}</div>` : ""}
            ${empresa.phone ? `<div style="font-size:11px; color:#94a3b8;">Tel: ${empresa.phone}</div>` : ""}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1rem; font-weight:900; text-transform:uppercase; color:#0f172a; letter-spacing:0.1em;">Nota de Entrega</div>
          <div style="font-size:1.4rem; font-weight:900; color:#2563eb;">#${String(data.order_number || data.id).padStart(5, "0")}</div>
          <div style="font-size:12px; color:#64748b;">Fecha: ${new Date(data.created_at || Date.now()).toLocaleDateString("es-VE")}</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Estado: ${data.status || "CONFIRMADO"}</div>
        </div>
      </div>

      <!-- CLIENTE -->
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:28px;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.15em; color:#94a3b8; margin-bottom:6px;">Facturado a</div>
        <div style="font-size:1.2rem; font-weight:900; color:#0f172a;">${cliente.name}</div>
        ${cliente.document || cliente.doc ? `<div style="font-size:12px; color:#64748b;">CI/RIF: ${cliente.document || cliente.doc}</div>` : ""}
        ${cliente.phone ? `<div style="font-size:12px; color:#64748b;">Tel: ${cliente.phone}</div>` : ""}
        ${cliente.address ? `<div style="font-size:12px; color:#64748b;">${cliente.address}</div>` : ""}
      </div>

      <!-- TABLA DE ITEMS -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:24px; font-size:13px;">
        <thead>
          <tr style="border-top:2px solid #0f172a; border-bottom:2px solid #0f172a;">
            <th style="padding:10px 8px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#64748b;">Descripción</th>
            <th style="padding:10px 8px; text-align:center; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#64748b;">Cant.</th>
            <th style="padding:10px 8px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#64748b;">Precio</th>
            <th style="padding:10px 8px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#64748b;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:12px 8px;">
                <div style="font-weight:700; color:#0f172a;">${it.product_name || it.product_name_snapshot}</div>
                ${it.imei_snapshot ? `<div style="font-size:10px; font-family:monospace; color:#64748b; margin-top:2px;">IMEI: ${it.imei_snapshot}</div>` : ""}
              </td>
              <td style="padding:12px 8px; text-align:center; color:#475569;">${it.qty}</td>
              <td style="padding:12px 8px; text-align:right; color:#475569;">$${parseFloat(it.unit_price).toFixed(2)}</td>
              <td style="padding:12px 8px; text-align:right; font-weight:700; color:#0f172a;">$${parseFloat(it.total).toFixed(2)}</td>
            </tr>`).join("")}
        </tbody>
      </table>

      <!-- TOTALES -->
      <div style="display:flex; justify-content:flex-end; margin-bottom:36px;">
        <div style="min-width:240px;">
          <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#475569;">
            <span>Subtotal</span><span>$${subtotal.toFixed(2)}</span>
          </div>
          ${descuento > 0 ? `<div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#dc2626; font-weight:700;">
            <span>Descuento</span><span>-$${descuento.toFixed(2)}</span>
          </div>` : ""}
          <div style="display:flex; justify-content:space-between; padding:10px 0; font-size:1.3rem; font-weight:900; color:#0f172a; border-top:2px solid #0f172a; margin-top:4px;">
            <span>TOTAL</span><span>$${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- FIRMAS -->
      <div style="display:flex; justify-content:space-around; margin-top:40px;">
        <div style="text-align:center; width:180px;">
          <div style="border-top:1px solid #000; padding-top:8px; font-size:11px; font-weight:700; text-transform:uppercase; color:#475569;">Firma Vendedor</div>
        </div>
        <div style="text-align:center; width:180px;">
          <div style="border-top:1px solid #000; padding-top:8px; font-size:11px; font-weight:700; text-transform:uppercase; color:#475569;">Firma Cliente</div>
        </div>
      </div>

      <!-- FOOTER -->
      ${empresa.instagram || empresa.phone ? `
      <div style="margin-top:30px; border-top:1px solid #e2e8f0; padding-top:12px; text-align:center; font-size:10px; color:#94a3b8;">
        ${empresa.instagram ? `IG: @${empresa.instagram}` : ""} ${empresa.phone ? `• Tel: ${empresa.phone}` : ""}
      </div>` : ""}
    </div>`;
}

// ─────────────────────────────────────────────────────────
// TEMPLATE 4: Contrato de Compra-Venta
// ─────────────────────────────────────────────────────────
function generarContratoHTML(data) {
    const empresa = data.tenant || {};
    const items = data.items || [];
    const total = items.reduce((s, it) => s + parseFloat(it.total || 0), 0) - parseFloat(data.discount_amount || 0);

    return `
    <div style="width:700px; padding:60px; background:#fff; font-family:'Georgia',serif;">
      <div style="text-align:center; margin-bottom:36px;">
        ${empresa.logo_url || empresa.tenant_logo
            ? `<img src="${empresa.logo_url || empresa.tenant_logo}" style="max-height:60px; margin:0 auto 12px; display:block;">`
            : ""}
        <div style="font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; text-decoration:underline; color:#0f172a;">
          Contrato de Compra y Venta
        </div>
        <div style="font-size:12px; color:#64748b; margin-top:6px;">${empresa.name || ""} — ${new Date().toLocaleDateString("es-VE")}</div>
      </div>

      <p style="line-height:1.8; text-align:justify; font-size:14px; color:#1e293b; margin-bottom:20px;">
        Por medio de la presente, se hace constar que <strong>${empresa.name || "EL VENDEDOR"}</strong>${empresa.rif ? `, identificado con RIF <strong>${empresa.rif}</strong>,` : ","} transfiere la propiedad de la(s) mercancía(s) descritas en el Pedido <strong>#${String(data.order_number || data.id).padStart(5, "0")}</strong> al cliente <strong>${data.customer?.name || data.customer_name}</strong>, quien declara recibirla a entera satisfacción.
      </p>

      <p style="line-height:1.8; text-align:justify; font-size:14px; color:#1e293b; margin-bottom:28px;">
        El monto total de la presente operación asciende a la cantidad de <strong>$${total.toFixed(2)} USD</strong> (${total > 0 ? "dólares americanos" : "—"}), según el detalle de artículos del pedido referenciado.
      </p>

      <p style="font-size:13px; color:#64748b; margin-bottom:48px;">
        Se firma en Valencia, Venezuela a los ${new Date().toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" })}.
      </p>

      <div style="display:flex; justify-content:space-around;">
        <div style="text-align:center; width:200px;">
          <div style="height:60px;"></div>
          <div style="border-top:1px solid #000; padding-top:8px; font-size:12px; font-weight:700; font-style:italic; text-transform:uppercase;">Firma Vendedor</div>
          <div style="font-size:11px; color:#64748b;">${empresa.name || ""}</div>
        </div>
        <div style="text-align:center; width:200px;">
          <div style="height:60px;"></div>
          <div style="border-top:1px solid #000; padding-top:8px; font-size:12px; font-weight:700; font-style:italic; text-transform:uppercase;">Firma Cliente</div>
          <div style="font-size:11px; color:#64748b;">${data.customer?.name || data.customer_name || ""}</div>
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────
// INIT — Leer orderId desde URL
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");
    if (orderId) {
        const input = document.getElementById("search-id");
        if (input) {
            input.value = orderId;
            setTimeout(buscarPedidoParaFacturar, 150);
        }
    }
});
