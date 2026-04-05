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
let currentPage = 1;
const PAGE_SIZE = 50; 

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

// Render de la Tabla - ACTUALIZADO PARA PAGINACIÓN
function renderTable() {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  // IMPORTANTE: Ya no usamos 'const filtered = orders.filter(...)' 
  // porque el backend ya nos envía los pedidos filtrados y ordenados.

  if (!orders.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="padding:40px; text-align:center; color:#64748b;">
          <i class="bi bi-inbox" style="font-size:2rem; display:block; margin-bottom:10px; opacity:0.5;"></i>
          No se encontraron pedidos con estos filtros.
        </td>
      </tr>`;
    return;
  }

  // Iteramos directamente sobre 'orders'
  orders.forEach(o => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    
    // Mostramos order_number (correlativo) si existe, sino el ID de DB
    const displayId = o.order_number ? o.order_number : (o.id ?? "-");

    tr.innerHTML = `
      <td style="padding:15px; font-weight:800; color:#0f766e;">#${displayId}</td>
      <td style="padding:15px; line-height:1.2;">${fmtDate(o.order_date || o.created_at || o.createdAt)}</td>
      <td style="padding:15px; font-weight:600; color:#1e293b;">
        <i class="bi bi-person-fill" style="color:#94a3b8; margin-right:4px;"></i> 
        ${safeText(o.customer_name || o.client_name || o.customerName)}
      </td>
      <td style="padding:15px; color:#475569;">${safeText(o.type || o.resolved_type || "No definido")}</td>
      <td style="padding:15px; text-align:center; font-weight:700; color:#64748b;">
        ${Number(o.items_count || o.itemsCount || 0)}
      </td>
      <td class="money-col" style="padding:15px; color:#1e293b;">${money(o.total || 0)}</td>
      <td style="padding:15px; text-align:center;">${getStatusBadge(o.status)}</td>
      <td style="padding:15px;">
        <div class="table-actions">
          <a class="btn-icon btn-view" href="./pedido_detalle.html?id=${o.id}" title="Ver Detalles">
            <i class="bi bi-eye"></i>
          </a>
          <a class="btn-icon btn-invoice" href="./factura.html?orderId=${o.id}" title="Emitir Factura">
            <i class="bi bi-receipt"></i>
          </a>
          <button class="btn-icon btn-del" data-action="void" data-id="${o.id}" data-num="${displayId}" title="Anular Pedido">
            <i class="bi bi-x-circle"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Re-vinculamos los eventos de los botones de anular
  tableBody.querySelectorAll('button[data-action="void"]').forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.getAttribute("data-id"));
      const num = btn.getAttribute("data-num");
      
      const ok = await openConfirm({
        title: "Anular Pedido",
        message: `¿Seguro que deseas anular el pedido #${num}? Esta acción devolverá el stock y marcará el pedido como ANULADO.`,
        okText: "Sí, Anular",
        okVariant: "danger"
      });

      if (!ok) return;

      try {
        await apiFetch(`/orders/${id}`, { 
          method: "PATCH", 
          body: JSON.stringify({ status: "ANULADO" }) 
        });
        
        // Refrescamos la página actual (manteniendo filtros)
        await loadOrders(currentPage); 
      } catch (err) {
        openAlert({ title: "Error", message: err.message || "No se pudo anular el pedido." });
      }
    };
  });
}

function irAFacturar(orderId) {
    window.location.href = `factura.html?orderId=${orderId}`;
}

async function loadOrders(page = 1) {
  currentPage = page;
  
  // Capturamos los filtros actuales para enviarlos al backend
  const searchTerm = inputSearch?.value || "";
  const statusFilter = selectStatus?.value || "";

  const params = new URLSearchParams({
    page: page,
    limit: PAGE_SIZE,
    search: searchTerm,
    status: statusFilter,
    t: Date.now() // Anti-cache
  });

  try {
    const response = await apiFetch(`/orders?${params}`);
    if (!response) return;

    // Manejamos la respuesta: si viene paginada usamos .data, si no, el array directo
    if (response.data && response.pagination) {
        orders = response.data;
        renderPagination(response.pagination);
    } else {
        orders = Array.isArray(response) ? response : (response.data || []);
        // Si no hay info de paginación, limpiamos el contenedor
        const pgContainer = document.getElementById("pagination-container");
        if (pgContainer) pgContainer.innerHTML = "";
    }

    renderTable(); 
  } catch (err) {
    console.error("Error cargando pedidos:", err);
    orders = [];
    openAlert({ title: "Error", message: "No pude actualizar la lista de pedidos." });
  }
}

function renderPagination(p) {
  const container = document.getElementById("pagination-container");
  if (!container) return;

  if (!p || p.pages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; gap:12px; padding:20px; border-top:1px solid #f1f5f9; background:white;">
      <button class="btn-sm" ${p.page <= 1 ? "disabled style='opacity:0.5; cursor:not-allowed;'" : ""} 
              onclick="loadOrders(${p.page - 1})" 
              style="border:1px solid #e2e8f0; background:white; border-radius:8px; padding:6px 12px; font-weight:600;">
        <i class="bi bi-chevron-left"></i> Anterior
      </button>

      <span style="font-size:13px; color:#64748b; font-weight:500;">
        Página <strong>${p.page}</strong> de <strong>${p.pages}</strong> 
        <span style="margin-left:4px; opacity:0.6;">(${p.total} pedidos)</span>
      </span>

      <button class="btn-sm" ${p.page >= p.pages ? "disabled style='opacity:0.5; cursor:not-allowed;'" : ""} 
              onclick="loadOrders(${p.page + 1})"
              style="border:1px solid #e2e8f0; background:white; border-radius:8px; padding:6px 12px; font-weight:600;">
        Siguiente <i class="bi bi-chevron-right"></i>
      </button>
    </div>
  `;
}

async function init(){
  await loadOrders(1);

  // Cuando el usuario escribe o cambia el estado, pedimos datos nuevos al servidor
  inputSearch?.addEventListener("input", debounce(() => loadOrders(1), 400));
  selectStatus?.addEventListener("change", () => loadOrders(1));

  btnClear?.addEventListener("click", () => {
    if(inputSearch) inputSearch.value = "";
    if(selectStatus) selectStatus.value = "";
    loadOrders(1);
  });
}

// Helper para no saturar el servidor mientras escriben
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

document.addEventListener("DOMContentLoaded", init);