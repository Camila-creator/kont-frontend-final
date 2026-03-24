// frontend/assets/js/pedidos.js

const tableBody = document.querySelector("#orders-table tbody");
const inputSearch = document.getElementById("orders-search");
const selectStatus = document.getElementById("orders-status");
const btnClear = document.getElementById("orders-clear");

// modales
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmOk = document.getElementById("confirm-ok");
const confirmCancel = document.getElementById("confirm-cancel");
let confirmResolver = null;

const alertModal = document.getElementById("alert-modal");
const alertTitle = document.getElementById("alert-title");
const alertMessage = document.getElementById("alert-message");
const alertOk = document.getElementById("alert-ok");

let orders = [];

// Helpers de Formato
function safeText(v){ return (v ?? "").toString().trim(); }

/**
 * ARREGLO PARA EL ERROR DE IDENTIFIER ALREADY DECLARED
 * Solo declaramos la función si no existe previamente
 */
if (typeof window.money !== 'function') {
    window.money = function(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };
}

function fmtDate(iso){
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" }) + " <br><span style='font-size:0.75rem; color:#94a3b8;'>" + d.toLocaleTimeString("es-ES", {hour: '2-digit', minute:'2-digit'}) + "</span>";
}

function getStatusBadge(status) {
  const s = safeText(status).toUpperCase();
  const map = {
    BORRADOR: { class: "badge-borrador", icon: "bi-pencil-square" },
    CONFIRMADO: { class: "badge-confirmado", icon: "bi-check-circle" },
    DESPACHADO: { class: "badge-despachado", icon: "bi-truck" },
    ENTREGADO: { class: "badge-entregado", icon: "bi-box-seam" },
    ANULADO: { class: "badge-anulado", icon: "bi-x-octagon" }
  };
  const config = map[s] || { class: "badge-borrador", icon: "bi-record-circle" };
  return `<span class="badge ${config.class}"><i class="bi ${config.icon}"></i> ${s || 'SIN ESTADO'}</span>`;
}


// Modales Reusables
function openConfirm({ title="Confirmar", message="¿Estás segura?", okText="Sí", okVariant="danger" } = {}){
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-message").textContent = message;
  const btn = document.getElementById("confirm-ok");
  btn.textContent = okText;
  btn.className = `btn-${okVariant}`;
  document.getElementById("confirm-modal").classList.remove("hidden");
  return new Promise(resolve => { confirmResolver = resolve; });
}
function closeConfirm(){ document.getElementById("confirm-modal").classList.add("hidden"); }
document.getElementById("confirm-ok")?.addEventListener("click", ()=>{ confirmResolver?.(true); closeConfirm(); });
document.getElementById("confirm-cancel")?.addEventListener("click", ()=>{ confirmResolver?.(false); closeConfirm(); });

function openAlert({ title="Aviso", message="" } = {}){
  document.getElementById("alert-title").textContent = title;
  document.getElementById("alert-message").textContent = message;
  document.getElementById("alert-modal").classList.remove("hidden");
}
document.getElementById("alert-ok")?.addEventListener("click", () => document.getElementById("alert-modal").classList.add("hidden"));

// Render de la Tabla
function renderTable(){
  if (!tableBody) return;
  tableBody.innerHTML = "";

  const q = safeText(inputSearch?.value).toLowerCase();
  const st = safeText(selectStatus?.value);

  const filtered = orders.filter(o=>{
    const client = safeText(o.customer_name || o.client_name || o.customerName).toLowerCase();
    const idStr = String(o.id || "");
    const orderNumStr = String(o.order_number || ""); // <-- Nueva búsqueda por correlativo
    
    // El buscador ahora revisa cliente, ID de BD y el Número de Pedido visible
    const okQ = !q || client.includes(q) || idStr === q || orderNumStr.includes(q);
    const okSt = !st || safeText(o.status).toUpperCase() === st.toUpperCase();
    return okQ && okSt;
  });

  if(!filtered.length){
    tableBody.innerHTML = `<tr><td colspan="8" style="padding:20px; text-align:center; color:#64748b;">No se encontraron pedidos con ese filtro.</td></tr>`;
    return;
  }

  filtered
    .sort((a,b)=> new Date(b.created_at || b.createdAt || b.order_date).getTime() - new Date(a.created_at || a.createdAt || a.order_date).getTime())
    .forEach(o=>{
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #f1f5f9";
      
      // Mostramos order_number si existe, sino caemos al ID interno
      const displayId = o.order_number ? o.order_number : (o.id ?? "-");

      tr.innerHTML = `
        <td style="padding:15px; font-weight:800; color:#0f766e;">#${displayId}</td>
        <td style="padding:15px; line-height:1.2;">${fmtDate(o.order_date || o.created_at || o.createdAt)}</td>
        <td style="padding:15px; font-weight:600; color:#1e293b;"><i class="bi bi-person-fill" style="color:#94a3b8; margin-right:4px;"></i> ${safeText(o.customer_name || o.client_name || o.customerName)}</td>
        <td style="padding:15px; color:#475569;">${safeText(o.type || o.resolved_type || "No definido")}</td>
        <td style="padding:15px; text-align:center; font-weight:700; color:#64748b;">${Number(o.items_count || o.itemsCount || 0)}</td>
        <td class="money-col" style="padding:15px; color:#1e293b;">${money(o.total || 0)}</td>
        <td style="padding:15px; text-align:center;">${getStatusBadge(o.status)}</td>
        <td style="padding:15px;">
          <div class="table-actions">
            <a class="btn-icon btn-view" href="./pedido_detalle.html?id=${o.id}" title="Ver Detalles"><i class="bi bi-eye"></i></a>
            
            <a class="btn-icon btn-invoice" href="./factura.html?orderId=${o.id}" title="Emitir Factura"><i class="bi bi-receipt"></i></a>
            
            <button class="btn-icon btn-del" data-action="void" data-id="${o.id}" data-num="${displayId}" title="Anular Pedido"><i class="bi bi-x-circle"></i></button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  // Evento para anular
  tableBody.querySelectorAll('button[data-action="void"]').forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = Number(btn.getAttribute("data-id"));
      const num = btn.getAttribute("data-num"); // Para que el mensaje sea más claro
      const ok = await openConfirm({
        title:"Anular Pedido",
        message:`¿Seguro que deseas anular el pedido #${num}? Esta acción cambiará su estado a ANULADO.`,
        okText:"Sí, Anular",
        okVariant: "danger"
      });
      if(!ok) return;

      try{
        await apiFetch(`/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status:"ANULADO" }) });
        await loadOrders();
        renderTable();
      }catch(err){
        openAlert({ title:"Error", message: err.message || "No se pudo anular el pedido." });
      }
    });
  });
}

function irAFacturar(orderId) {
    window.location.href = `factura.html?orderId=${orderId}`;
}

async function loadOrders() {
  try {
    const response = await apiFetch("/orders?t=" + Date.now()); 
    orders = Array.isArray(response) ? response : (response.data || []);
    renderTable(); 
  } catch (err) {
    console.error("Error cargando pedidos:", err);
    orders = [];
    openAlert({ title: "Error conectando", message: "No pude actualizar la lista de pedidos." });
  }
}

async function init(){
  try{
    await loadOrders();
  }catch(err){
    openAlert({ title:"Error conectando", message:`No pude cargar los pedidos desde el servidor.` });
  }

  inputSearch?.addEventListener("input", renderTable);
  selectStatus?.addEventListener("change", renderTable);
  btnClear?.addEventListener("click", () => {
    inputSearch.value = "";
    selectStatus.value = "";
    loadOrders();
  });
}

document.addEventListener("DOMContentLoaded", init);