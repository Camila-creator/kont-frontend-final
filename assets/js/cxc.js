/**
 * KONT ADMIN - Módulo de Cuentas por Cobrar (CxC)
 */

// ---------------- ESTRUCTURA DE DATOS Y DOM ----------------
const listContainer = document.getElementById("cxc-list");
const searchInput = document.getElementById("search-client");

/**
 * Renderiza la lista de deudores en formato de tarjetas limpias.
 * @param {Object|Array} response - Datos crudos de la API.
 */
function render(response) {
  if (!listContainer) return;
  
  listContainer.innerHTML = "";
  const data = Array.isArray(response) ? response : (response?.data || response?.result || []);

  if (data.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center; padding: 60px 20px; color: #94a3b8;">
        <i class="bi bi-check-circle" style="font-size: 3.5rem; color: #10b981; display:block; margin-bottom:15px;"></i>
        <h2 style="font-size: 1.2rem; font-weight: 700; color: #1e293b;">¡Todo al día!</h2>
        <p style="font-size: 0.9rem;">No se encontraron clientes con saldos pendientes.</p>
      </div>`;
    return;
  }

  data.forEach((item) => {
    const pending = Number(item.pending || 0);
    const orders = Number(item.open_orders || 0);
    const customerId = item.customer_id;
    const customerName = item.customer_name || "Cliente Desconocido";

    if (Math.abs(pending) > 0.01) {
      const card = document.createElement("div");
      card.className = "debtor-card";
      
      // Añadimos un contenedor flex en los botones de acción para que queden juntos
      card.innerHTML = `
        <div class="client-info">
          <div class="client-avatar">
            <i class="bi bi-person-fill"></i>
          </div>
          <div class="client-details">
            <h3>${customerName}</h3>
            <span>${orders} ${orders === 1 ? 'pedido pendiente' : 'pedidos abiertos'}</span>
          </div>
        </div>
        
        <div class="amount-group">
          <span class="amount-label">Saldo por cobrar</span>
          <span class="amount-value ${pending > 0 ? 'debt' : ''}">
            ${money(pending)}
          </span>
        </div>

        <div class="card-action" style="display: flex; gap: 10px; align-items: center;">
          <button onclick="exportarEstadoCuenta(${customerId})" class="btn-action" style="background: #e2e8f0; color: #475569; border: none; cursor: pointer; padding: 10px 12px; border-radius: 8px;" title="Descargar Estado de Cuenta">
            <i class="bi bi-file-pdf" style="font-size: 1.2rem; color: #dc2626;"></i>
          </button>
          
          <a href="./pagos.html?customer_id=${customerId}" class="btn-action" style="background: #f8fafc; border-radius: 8px; padding: 10px 12px; display:flex; align-items:center;" title="Gestionar Cobro">
            <i class="bi bi-chevron-right" style="color: #3b82f6;"></i>
          </a>
        </div>
      `;
      
      listContainer.appendChild(card);
    }
  });

  if (listContainer.innerHTML === "") {
    render([]); 
  }
}

/**
 * Llama a la API para obtener los deudores.
 */
async function loadCxC() {
  const query = (searchInput?.value || "").trim();
  const endpoint = `/cxc?q=${encodeURIComponent(query)}`;

  try {
    const response = await apiFetch(endpoint);
    render(response);
  } catch (error) {
    console.error("Error en el módulo CxC:", error);
    listContainer.innerHTML = `
      <div style="padding: 20px; background: #fff1f2; border: 1px solid #fecaca; border-radius: 12px; color: #b91c1c; text-align: center;">
        <i class="bi bi-exclamation-octagon-fill" style="font-size: 1.5rem; display:block; margin-bottom:10px;"></i>
        <b>Error de conexión:</b> No pudimos obtener los saldos. Intenta de nuevo en unos minutos.
      </div>`;
  }
}

/**
 * NUEVA FUNCIÓN: Obtiene la data detallada del cliente y genera su PDF
 */
async function exportarEstadoCuenta(clienteId) {
  try {
    // Aquí puedes agregar un pequeño alert o cambiar el ícono del botón a un "spinner" si la API tarda
    const res = await apiFetch(`/customers/${clienteId}`);
    const pedRes = await apiFetch(`/orders?customer_id=${clienteId}`);
    const pagRes = await apiFetch(`/customer-payments?customer_id=${clienteId}`);

    // Se asegura de pasar los arrays aunque la API responda vacío
    KontPDF.estadoCuentaCliente(
      res.data || res, 
      pedRes.data || pedRes || [],
      pagRes.data || pagRes || []
    );
  } catch (error) {
    console.error("Error al exportar el estado de cuenta:", error);
    alert("Hubo un error obteniendo los datos del cliente. Intenta nuevamente.");
  }
}

// ---------------- INICIALIZACIÓN ----------------

function init() {
  loadCxC();

  let searchTimeout = null;
  searchInput?.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadCxC();
    }, 400); 
  });
}

document.addEventListener("DOMContentLoaded", init);