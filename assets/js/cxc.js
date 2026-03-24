/**
 * KONT ADMIN - Módulo de Cuentas por Cobrar (CxC)
 * Desarrollado por: Camila Oquendo
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
  
  // Limpiamos el contenedor para evitar duplicados
  listContainer.innerHTML = "";

  // Normalizamos la entrada de datos (por si la API devuelve {data: []} o solo [])
  const data = Array.isArray(response) ? response : (response?.data || response?.result || []);

  // ESTADO VACÍO: Si no hay deudas, mostramos un mensaje amigable
  if (data.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center; padding: 60px 20px; color: #94a3b8;">
        <i class="bi bi-check-circle" style="font-size: 3.5rem; color: #10b981; display:block; margin-bottom:15px;"></i>
        <h2 style="font-size: 1.2rem; font-weight: 700; color: #1e293b;">¡Todo al día!</h2>
        <p style="font-size: 0.9rem;">No se encontraron clientes con saldos pendientes.</p>
      </div>`;
    return;
  }

  // RENDERIZADO DE TARJETAS
  data.forEach((item) => {
    // Sanitización de números para evitar NaN en pantalla
    const pending = Number(item.pending || 0);
    const orders = Number(item.open_orders || 0);
    const customerId = item.customer_id;
    const customerName = item.customer_name || "Cliente Desconocido";

    // Solo creamos la tarjeta si el saldo es relevante (mayor a 0.01)
    if (Math.abs(pending) > 0.01) {
      const card = document.createElement("div");
      card.className = "debtor-card";
      
      // Estructura simplificada: Cliente | Saldo | Acción
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

        <div class="card-action">
          <a href="./pagos.html?customer_id=${customerId}" class="btn-action" title="Gestionar Cobro">
            <i class="bi bi-chevron-right"></i>
          </a>
        </div>
      `;
      
      listContainer.appendChild(card);
    }
  });

  // Si después de filtrar los montos cercanos a cero la lista quedó vacía
  if (listContainer.innerHTML === "") {
    render([]); 
  }
}

/**
 * Llama a la API para obtener los deudores.
 * Usa apiFetch definido en main.js para manejar tokens y errores.
 */
async function loadCxC() {
  const query = (searchInput?.value || "").trim();
  const endpoint = `/cxc?q=${encodeURIComponent(query)}`;

  try {
    // Mostramos un mini-loader si es necesario
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

// ---------------- INICIALIZACIÓN ----------------

function init() {
  // 1. Carga inicial de datos
  loadCxC();

  // 2. Buscador con Debounce (para no saturar tu backend de Node.js)
  let searchTimeout = null;
  searchInput?.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadCxC();
    }, 400); // 400ms es el "punto dulce" para que no se sienta lento pero no sature
  });
}

// Esperamos a que el DOM esté listo
document.addEventListener("DOMContentLoaded", init);