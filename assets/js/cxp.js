/**
 * KONT ADMIN - Módulo de Cuentas por Pagar (CxP)
 */

const listContainer = document.getElementById("cxp-list");
const searchInput = document.getElementById("search-supplier");
let allRows = [];

/**
 * Formatea el badge de fecha con lógica de vencimiento
 */
const getDueBadge = (dateStr) => {
  if (!dateStr) return `<span class="due-tag">Sin fecha</span>`;
  
  const due = new Date(dateStr);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const formatted = due.toLocaleDateString("es-ES", { day: '2-digit', month: 'short' });
  const isOverdue = due < today;

  return `
    <span class="due-tag ${isOverdue ? 'overdue' : ''}">
      <i class="bi ${isOverdue ? 'bi-exclamation-triangle-fill' : 'bi-calendar-event'}"></i>
      ${isOverdue ? 'Vencido: ' : 'Vence: '} ${formatted}
    </span>
  `;
};

function render() {
  if (!listContainer) return;
  listContainer.innerHTML = "";

  const q = (searchInput?.value || "").trim().toLowerCase();
  
  // Filtramos localmente para que la búsqueda sea instantánea
  const filtered = allRows.filter(r => 
    String(r.supplier_name || "").toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center; padding: 50px; color: #94a3b8;">
        <i class="bi bi-emoji-smile" style="font-size: 3rem; display:block; margin-bottom:10px;"></i>
        <p>No hay deudas pendientes por aquí.</p>
      </div>`;
    return;
  }

  filtered.forEach(r => {
    const saldo = Number(r.saldo || 0);
    const facturas = Number(r.compras_abiertas || 0);
    
    // Solo mostramos si hay saldo real
    if (Math.abs(saldo) > 0.01) {
      const card = document.createElement("div");
      card.className = "provider-card";
      
      card.innerHTML = `
        <div class="provider-info">
          <div class="provider-icon"><i class="bi bi-truck"></i></div>
          <div class="provider-details">
            <h3>${r.supplier_name || "Proveedor"}</h3>
            <p>${facturas} factura(s) pendiente(s)</p>
          </div>
        </div>
        
        <div class="due-box">
          ${getDueBadge(r.proximo_vencimiento)}
        </div>

        <div class="amount-box">
          <span class="amount-label">Por Pagar</span>
          <span class="amount-val">${money(saldo)}</span>
        </div>

        <div class="action-box">
          <a href="./pago_proveedores.html?supplier_id=${r.supplier_id}" class="btn-pay" title="Pagar">
            <i class="bi bi-credit-card-2-back"></i>
          </a>
        </div>
      `;
      listContainer.appendChild(card);
    }
  });
}

async function loadCxP() {
  try {
    const resp = await apiFetch("/accounts-payable/summary");
    // Adaptamos según cómo venga la data de tu endpoint
    allRows = resp.data || resp.rows || resp || [];
    render();
  } catch (err) {
    console.error("Error CxP:", err);
    listContainer.innerHTML = `<p style="color:red; text-align:center; padding:20px;">Error al conectar con el servidor.</p>`;
  }
}

function init() {
  loadCxP();

  let t = null;
  searchInput?.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(render, 300); // Búsqueda rápida local
  });
}

document.addEventListener("DOMContentLoaded", init);