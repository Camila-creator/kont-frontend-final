// ---------------- DOM ----------------
const tableBody = document.querySelector("#payments-table tbody");
const btnNew = document.getElementById("btn-new-payment");
const btnRefresh = document.getElementById("btn-refresh");
const filterCustomer = document.getElementById("filter-customer");
const filterOrder = document.getElementById("filter-order");
const modal = document.getElementById("payment-modal");
const form = document.getElementById("payment-form");

const inputId = document.getElementById("payment-id"); 
const inputOrder = document.getElementById("payment-order"); 
const inputCustomer = document.getElementById("payment-customer"); 
const inputAccount = document.getElementById("payment-account"); 
const inputAmount = document.getElementById("payment-amount"); 
const inputMethod = document.getElementById("payment-method"); 
const inputRef = document.getElementById("payment-ref"); 
const inputDate = document.getElementById("payment-date"); 
const inputNotes = document.getElementById("payment-notes"); 
const btnCancel = document.getElementById("btn-cancel");

// Elementos de Alerta Personalizada
const alertModal = document.getElementById("alert-modal"); 
const alertTitle = document.getElementById("alert-title"); 
const alertMessage = document.getElementById("alert-message"); 
const alertOk = document.getElementById("alert-ok");

// ---------------- STATE ----------------
let customers = []; 
let orders = []; 
let payments = []; 
let accounts = [];

// ---------------- HELPERS LOCALES ----------------
function safeText(v) { return (v ?? "").toString().trim(); }
function toNum(v) { const n = Number(v); return Number.isNaN(n) ? 0 : n; }
function upper(v) { return String(v || "").trim().toUpperCase(); }

// Nota: fmtDate y money se usan desde main.js si están disponibles, 
// sino, estas versiones locales sirven de respaldo.
function fmtDateLocal(iso) { 
    if (!iso) return "-"; 
    const d = new Date(iso); 
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" }); 
}

function unwrapApi(data) { 
    if (Array.isArray(data)) return data; 
    if (Array.isArray(data?.data)) return data.data; 
    if (Array.isArray(data?.rows)) return data.rows; 
    if (Array.isArray(data?.result)) return data.result;
    return []; 
}

// ---------------- MODALES & ALERTAS ----------------
function openModal() { modal?.classList.remove("hidden"); } 
function closeModal() { modal?.classList.add("hidden"); }

function openAlert({ title = "Aviso", message = "" } = {}) { 
    if (!alertModal) return window.alert(`${title}\n\n${message}`); 
    alertTitle.textContent = title; 
    alertMessage.textContent = message; 
    alertModal.classList.remove("hidden"); 
} 
function closeAlert() { alertModal?.classList.add("hidden"); }

// ---------------- LÓGICA DE NEGOCIO ----------------
function getCustomerName(id) { 
    const c = customers.find(x => Number(x.id) === Number(id)); 
    return c ? (c.name || c.nombre || "—") : "—"; 
}

function normalizeCustomers(list) { 
    return (list || []).map(c => ({ id: Number(c.id), name: c.name || c.nombre || c.razon_social || "Sin nombre" })); 
}

function normalizeOrders(list) { 
    return (list || []).map(o => ({ 
        id: Number(o.id), 
        customer_id: Number(o.customer_id), 
        customer_name: o.customer_name || getCustomerName(o.customer_id), 
        status: upper(o.status || "BORRADOR"), 
        terms: upper(o.terms || ""), 
        total: toNum(o.total || 0), 
        created_at: o.created_at || null 
    })); 
}

function normalizePayments(list) { 
    return (list || []).map(p => ({ 
        id: Number(p.id), 
        customer_id: Number(p.customer_id), 
        customer_name: p.customer_name || getCustomerName(p.customer_id), 
        order_id: p.order_id != null ? Number(p.order_id) : null, 
        order_number: p.order_number || null, // Para que salga el #28
        amount: toNum(p.amount), 
        method: upper(p.method), 
        ref: safeText(p.ref || ""), 
        paid_at: p.paid_at || null, 
        notes: p.notes || null, 
        // ESTA LÍNEA ES CRÍTICA:
        finance_account_id: p.finance_account_id ? Number(p.finance_account_id) : null 
    })); 
}

function buildPaidMap() { 
    const paidByOrder = {}; 
    payments.forEach(p => { 
        if (!p.order_id) return; 
        paidByOrder[p.order_id] = (paidByOrder[p.order_id] || 0) + toNum(p.amount); 
    }); 
    return paidByOrder; 
}

function getPendingOrders() { 
    const paidByOrder = buildPaidMap(); 
    return orders
        .filter(o => o.status !== "ANULADO" && o.terms === "CREDITO")
        .map(o => { 
            const paid = paidByOrder[o.id] || 0; 
            const pending = Math.max(0, toNum(o.total) - toNum(paid)); 
            return { ...o, paid, pending }; 
        })
        .filter(o => o.pending > 0.0001)
        .sort((a, b) => b.id - a.id); 
}

// ---------------- UI FILLERS ----------------
function fillCustomerFilters() { 
    if (!filterCustomer) return; 
    filterCustomer.innerHTML = `<option value="">Filtrar por Cliente (Todos)</option>`; 
    customers.forEach(c => { 
        const opt = document.createElement("option"); 
        opt.value = c.id; 
        opt.textContent = c.name; 
        filterCustomer.appendChild(opt); 
    }); 
}

function fillOrderFilters() { 
    if (!filterOrder) return; 
    const pendingOrders = getPendingOrders(); 
    filterOrder.innerHTML = `<option value="">Filtrar por Pedido con Deuda (Todos)</option>`; 
    pendingOrders.forEach(o => { 
        const opt = document.createElement("option"); 
        opt.value = o.id; 
        opt.textContent = `Pedido #${o.id} — ${o.customer_name} (Debe: ${money(o.pending)})`; 
        filterOrder.appendChild(opt); 
    }); 
}

function fillModalCustomers() { 
    if (!inputCustomer) return; 
    inputCustomer.innerHTML = `<option value="">Selecciona cliente...</option>`; 
    customers.forEach(c => { 
        const opt = document.createElement("option"); 
        opt.value = c.id; 
        opt.textContent = c.name; 
        inputCustomer.appendChild(opt); 
    }); 
}

function fillModalAccounts() { 
    if (!inputAccount) return; 
    inputAccount.innerHTML = `<option value="">Selecciona cuenta destino...</option>`; 
    accounts.forEach(acc => { 
        const opt = document.createElement("option"); 
        opt.value = acc.id; 
        opt.textContent = `${acc.name} (${acc.currency})`; 
        inputAccount.appendChild(opt); 
    }); 
}

function fillModalOrders({ customerId } = {}) { 
    if (!inputOrder) return; 
    const pendingOrders = getPendingOrders().filter(o => !customerId || Number(o.customer_id) === Number(customerId)); 
    inputOrder.innerHTML = `<option value="">(Ninguno - Abono libre o Contado)</option>`; 
    pendingOrders.forEach(o => { 
        const opt = document.createElement("option"); 
        opt.value = o.id; 
        opt.textContent = `Saldar Pedido #${o.id} (Debe: ${money(o.pending)})`; 
        inputOrder.appendChild(opt); 
    }); 
}

// ---------------- TABLA PRINCIPAL ----------------
/**
 * Renderiza la tabla de pagos con filtros aplicados y diseño mejorado.
 * Asegura que el order_id sea clickeable y el formato sea consistente.
 */
function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const fc = safeText(filterCustomer?.value);
    const fo = safeText(filterOrder?.value);

    const filtered = payments.filter(p => {
        if (fc && Number(p.customer_id) !== Number(fc)) return false;
        if (fo && Number(p.order_id) !== Number(fo)) return false;
        return true;
    });

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="8" style="padding:30px; text-align:center; color:#94a3b8;">No hay ingresos.</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        // 1. Lógica de Pedido: Texto = order_number, Link = order_id
        const numPedido = p.order_number || p.order_id; 
        const orderTxt = p.order_id 
            ? `<a href="pedido_detalle.html?id=${p.order_id}" 
                  style="color:#0284c7; text-decoration:none; font-weight:800; border-bottom:1px dashed #0284c7;">
                  #${numPedido}
               </a>` 
            : `<span style="color:#cbd5e1; font-size:0.8rem;">—</span>`;

        // 2. Lógica de Cuenta: Buscar en el array global 'accounts'
        const acc = accounts.find(a => Number(a.id) === Number(p.finance_account_id));
        const accountTxt = acc 
            ? `<span style="color:#1e293b; font-weight:600;"><i class="bi bi-wallet2" style="color:#0284c7;"></i> ${acc.name}</span>`
            : `<span style="color:#f87171; font-size:0.75rem;">ID Cuenta: ${p.finance_account_id || '?'}</span>`;

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        tr.innerHTML = `
            <td style="padding:15px; color:#94a3b8; font-family:monospace; font-size:0.75rem;">PAY-${p.id}</td>
            <td style="padding:15px; white-space:nowrap;">${fmtDateLocal(p.paid_at)}</td>
            <td style="padding:15px;"><div style="font-weight:700; color:#1e293b;">${safeText(p.customer_name)}</div></td>
            <td style="padding:15px; text-align:center;">${orderTxt}</td>
            <td style="padding:15px;">
                <span style="background:#f1f5f9; color:#475569; padding:3px 8px; border-radius:5px; font-size:0.7rem; font-weight:800;">
                    ${upper(p.method)}
                </span>
            </td>
            <td style="padding:15px;">${accountTxt}</td>
            <td style="padding:15px; color:#64748b; font-size:0.8rem;">${safeText(p.ref) || "—"}</td>
            <td style="padding:15px; text-align:right; font-weight:800; color:#10b981; font-size:1rem;">+ ${money(p.amount)}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// ---------------- ACCIONES ----------------
function resetForm() { 
    if(form) form.reset(); 
    if(inputId) inputId.value = ""; 
    if(inputDate) inputDate.value = new Date().toISOString().slice(0, 10); 
    fillModalOrders({ customerId: null }); 
}

async function loadAll() {
  const [cRaw, oRaw, pRaw, aRaw] = await Promise.all([
      apiFetch(`/customers`), 
      apiFetch(`/orders`), 
      apiFetch(`/customer-payments`), 
      apiFetch(`/finance/accounts`) 
  ]);
  
  customers = normalizeCustomers(unwrapApi(cRaw)); 
  orders = normalizeOrders(unwrapApi(oRaw)); 
  payments = normalizePayments(unwrapApi(pRaw)); 
  accounts = unwrapApi(aRaw); 
}

async function refreshUI() { 
    await loadAll(); 
    fillCustomerFilters(); 
    fillOrderFilters(); 
    fillModalCustomers(); 
    fillModalOrders({ customerId: null }); 
    fillModalAccounts(); 
    renderTable(); 
}

async function createPayment() {
  const customer_id = Number(inputCustomer.value); 
  const order_id = inputOrder.value ? Number(inputOrder.value) : null; 
  const amount = Number(inputAmount.value); 
  const finance_account_id = Number(inputAccount.value); 
  
  if (!customer_id || !finance_account_id || !Number.isFinite(amount) || amount <= 0) {
      return openAlert({ title: "Datos inválidos", message: "Verifica cliente, cuenta y monto." });
  }

  const payload = { 
      customer_id, 
      order_id, 
      amount, 
      finance_account_id, 
      method: upper(inputMethod.value), 
      ref: safeText(inputRef.value) || null, 
      payment_date: safeText(inputDate.value), 
      notes: safeText(inputNotes.value) || null 
  };

  const btnSubmit = form.querySelector('button[type="submit"]');
  try { 
      if(btnSubmit) {
          btnSubmit.disabled = true; 
          btnSubmit.textContent = "Guardando..."; 
      }
      
      await apiFetch(`/customer-payments`, { 
          method: "POST", 
          body: JSON.stringify(payload) 
      }); 

      closeModal(); 
      await refreshUI(); 
      
      if(typeof showToast === 'function') {
          showToast("Pago registrado con éxito");
      } else {
          openAlert({ title: "Exitoso ✅", message: "Pago registrado." });
      }

  } catch (err) { 
      if(btnSubmit) {
          btnSubmit.disabled = false; 
          btnSubmit.innerHTML = `<i class="bi bi-check2-circle"></i> Confirmar Ingreso`; 
      }
      return openAlert({ title: "Error", message: err.message || "No se pudo registrar el pago." }); 
  }
}

function applyQueryParamsToFilters() {
  const params = new URLSearchParams(window.location.search); 
  const customer_id = params.get("customer_id"); 
  const order_id = params.get("order_id");
  
  if (customer_id && filterCustomer) filterCustomer.value = customer_id; 
  if (order_id && filterOrder) filterOrder.value = order_id; 
  renderTable();
}

// ---------------- INIT ----------------
async function init() {
  alertOk?.addEventListener("click", closeAlert); 

  try { 
      await refreshUI(); 
      applyQueryParamsToFilters(); 
  } catch (err) { 
      console.error(err);
      openAlert({ title: "Error conectando", message: `No se pudo conectar con el servidor.` }); 
      return; 
  }

  filterCustomer?.addEventListener("change", renderTable); 
  filterOrder?.addEventListener("change", renderTable); 
  
  btnRefresh?.addEventListener("click", async (e) => { 
      e.preventDefault(); 
      await refreshUI(); 
  }); 

  btnNew?.addEventListener("click", (e) => { 
      e.preventDefault(); 
      resetForm(); 
      openModal(); 
  }); 

  btnCancel?.addEventListener("click", (e) => { 
      e.preventDefault(); 
      closeModal(); 
  });

  inputCustomer?.addEventListener("change", () => { 
      fillModalOrders({ customerId: inputCustomer.value ? Number(inputCustomer.value) : null }); 
      inputOrder.value = ""; 
  }); 

  inputOrder?.addEventListener("change", () => { 
      if (!inputOrder.value) return; 
      const o = orders.find(x => x.id === Number(inputOrder.value)); 
      if (o) inputCustomer.value = String(o.customer_id); 
  });

  form?.addEventListener("submit", async (e) => { 
      e.preventDefault(); 
      await createPayment(); 
  });
}

document.addEventListener("DOMContentLoaded", init);