// ---------------- DOM ----------------
const tableBody = document.querySelector("#purchases-table tbody");
const btnNew = document.getElementById("btn-new-purchase");
const searchInput = document.getElementById("purchases-search");

const purchaseModal = document.getElementById("purchase-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("purchase-form");

const inputId = document.getElementById("purchase-id");
const inputSupplier = document.getElementById("purchase-supplier");
const inputCondition = document.getElementById("purchase-condition");
const dueWrap = document.getElementById("due-date-wrap");
const inputDueDate = document.getElementById("purchase-due-date");
const inputDate = document.getElementById("purchase-date");
const inputNotes = document.getElementById("purchase-notes");
const btnCancel = document.getElementById("btn-cancel");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnSave = document.getElementById("btn-save");

// DOM Tasa de Cambio
const inputCurrency = document.getElementById("purchase-currency");
const inputExchangeRate = document.getElementById("purchase-exchange-rate");
const totalBsView = document.getElementById("purchase-total-bs-view");

// Items UI
const itemType = document.getElementById("item-type");
const itemTarget = document.getElementById("item-target");
const itemQty = document.getElementById("item-qty");
const itemUnitCost = document.getElementById("item-unit-cost");
const itemSubtotal = document.getElementById("item-subtotal"); 
const btnAddItem = document.getElementById("btn-add-item");
const itemsTbody = document.querySelector("#items-table tbody");
const totalView = document.getElementById("purchase-total-view");
const itemUnitBadge = document.getElementById("item-unit-badge"); 

// Pago modal Multipago
const payModal = document.getElementById("pay-modal");
const payForm = document.getElementById("pay-form");
const payPurchaseId = document.getElementById("pay-purchase-id");
const payCancel = document.getElementById("pay-cancel");
const payLinesContainer = document.getElementById("pay-lines-container"); 
const btnAddPayLine = document.getElementById("btn-add-pay-line");
const payTotalPending = document.getElementById("pay-total-pending");

// ---------------- STATE ----------------
let suppliers = [];
let products = [];
let supplies = [];
let purchases = [];
let draftItems = [];
let purchaseRates = { USD: 0, EUR: 0 }; 

let FIN_ACCOUNTS = [];
let FIN_ROUTING = {}; 

let currentPayExchangeRate = 1;
let currentPayTotalUSD = 0;

// ---------------- HELPERS LOCALES (No duplicados) ----------------
function today() { return new Date().toISOString().slice(0, 10); }
function upper(v) { return String(v || "").trim().toUpperCase(); }

function openModal(el) { 
    if (el) {
        el.classList.remove("hidden");
        const content = el.querySelector('.modal-content');
        if(content) content.scrollTop = 0;
    } 
}
function closeModal(el) { if (el) el.classList.add("hidden"); }

function unwrapApiPayload(payload) {
  if (!payload) return payload;
  if (payload.ok === true && "data" in payload) return payload.data;
  if (payload.ok === true && "result" in payload) return payload.result;
  return payload;
}

function normalizeList(resp) {
  if (Array.isArray(resp)) return resp;
  if (!resp) return [];
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.rows)) return resp.rows;
  if (Array.isArray(resp.result)) return resp.result;
  return [];
}

// ---------------- LÓGICA DE DIVISAS ----------------
async function loadCurrentRates() {
    try {
        const res = await apiFetch("/exchange");
        if (res && Array.isArray(res)) {
            const usd = res.find(r => r.currency_code === 'USD');
            const eur = res.find(r => r.currency_code === 'EUR');

            purchaseRates.USD = usd ? parseFloat(usd.rate_value) : 0;
            purchaseRates.EUR = eur ? parseFloat(eur.rate_value) : 0;
            
            if (inputExchangeRate && (!inputId || !inputId.value)) {
                inputExchangeRate.value = purchaseRates.USD;
                if(inputCurrency) inputCurrency.value = "USD";
                updateBsEquivalent();
            }
        }
    } catch (err) {
        console.warn("No se pudieron cargar las tasas del día", err);
    }
}

function updateBsEquivalent() {
    const totalUSD = calcItemsTotal();
    const rate = parseFloat(inputExchangeRate?.value) || 0;
    const totalBS = totalUSD * rate;
    if (totalBsView) {
        totalBsView.textContent = `${totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`;
    }
}

function supplierName(id) {
  const s = suppliers.find((x) => Number(x.id) === Number(id));
  return s ? (s.nombre || s.name) : "-";
}

// ---------------- FINANCE HELPERS ----------------
function updatePayLineFinanceHelper(row) {
    const amountUSD = parseFloat(row.querySelector(".pay-amount").value) || 0;
    const accId = row.querySelector(".pay-account").value;
    const helperLabel = row.querySelector(".pay-bs-helper");
    
    const account = FIN_ACCOUNTS.find(a => Number(a.id) === Number(accId));
    const currency = account ? upper(account.currency) : 'USD';
    
    if (currency === 'VES') {
        const native = amountUSD * currentPayExchangeRate;
        helperLabel.innerHTML = `<i class="bi bi-cash-stack"></i> Equiv: <b>${native.toLocaleString('es-VE', {minimumFractionDigits:2})} Bs.</b>`;
        helperLabel.style.color = "#10b981"; 
    } else {
        helperLabel.innerHTML = `<i class="bi bi-currency-dollar"></i> Cuenta en Divisa`;
        helperLabel.style.color = "#64748b";
    }
    updateModalRemainingTotal();
}

function updateModalRemainingTotal() {
    if (!payTotalPending) return;
    const lines = payLinesContainer.querySelectorAll(".pay-amount");
    let totalPagado = 0;
    lines.forEach(input => totalPagado += parseFloat(input.value) || 0);
    
    const restante = currentPayTotalUSD - totalPagado;

    if (currentPayTotalUSD <= 0) {
        payTotalPending.textContent = "Error: Monto factura es $0";
        payTotalPending.style.background = "#6b7280"; 
        return;
    }

    if (Math.abs(restante) < 0.01) {
        payTotalPending.textContent = "¡Total cubierto!";
        payTotalPending.style.background = "#10b981";
    } else if (restante > 0) {
        payTotalPending.textContent = `Pendiente: ${money(restante)}`; 
        payTotalPending.style.background = "#0284c7";
    } else {
        payTotalPending.textContent = `Exceso: ${money(Math.abs(restante))}`;
        payTotalPending.style.background = "#ef4444";
    }
}

function methodToAccountType(method) {
  const m = upper(method);
  if (m === "EFECTIVO") return "EFECTIVO";
  if (m === "ZELLE" || m === "CLE" || m === "TRANSFERENCIA") return "ZELLE";
  return "BANCO";
}

function createPaymentRow(defaultAmount = 0) {
    if (!payLinesContainer) return;
    const div = document.createElement("div");
    div.className = "payment-row-card";
    div.style.position = "relative"; 

    div.innerHTML = `
        <button type="button" class="btn-remove-row" title="Quitar este pago" 
                style="top: 5px; right: 5px; position: absolute; border:none; background:transparent; color:#ef4444; cursor:pointer;">
            <i class="bi bi-trash-fill"></i>
        </button>

        <div style="display: grid; grid-template-columns: 1fr 1fr 0.8fr; gap: 10px; margin-bottom: 12px; padding-right: 15px;">
            <div class="form-group">
                <label style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Método</label>
                <select class="pay-method" required style="width: 100%; padding: 8px; font-size: 0.85rem;">
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="ZELLE">📱 Zelle</option>
                    <option value="TRANSFERENCIA">🏦 Transf. Bs</option>
                    <option value="PAGO MOVIL">📲 Pago Móvil</option>
                    <option value="DEBITO">💳 Débito</option>
                </select>
            </div>
            <div class="form-group">
                <label style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Cuenta Destino</label>
                <select class="pay-account" required style="width: 100%; padding: 8px; font-size: 0.85rem;"></select>
            </div>
            <div class="form-group">
                <label style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Monto $</label>
                <input type="number" step="0.01" class="pay-amount" value="${defaultAmount.toFixed(2)}" required 
                       style="width: 100%; padding: 8px; font-weight: 800; color: #1e293b; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px;">
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 10px; flex-wrap: wrap; gap: 10px;">
            <div class="pay-bs-helper" style="font-size: 0.7rem; color: #64748b;"></div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <label style="font-size: 0.7rem; color: #94a3b8; font-weight: 700;">REF:</label>
                <input type="text" class="pay-ref" placeholder="Ej: #1234" 
                       style="width: 110px; padding: 5px 8px; font-size: 0.8rem; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc;">
            </div>
        </div>
    `;

    const selectMethod = div.querySelector(".pay-method");
    const selectAcc = div.querySelector(".pay-account");
    const inputAmount = div.querySelector(".pay-amount");

    const fillAccounts = () => {
        const needed = methodToAccountType(selectMethod.value);
        const defId = (typeof FIN_ROUTING !== 'undefined') ? FIN_ROUTING[selectMethod.value.toUpperCase()] : null;
        const usable = (typeof FIN_ACCOUNTS !== 'undefined' ? FIN_ACCOUNTS : []).filter(a => (a.type || a.kind || "").toUpperCase() === needed);

        selectAcc.innerHTML = "";
        usable.forEach(a => {
            const o = document.createElement("option");
            o.value = a.id;
            o.textContent = `${a.name} (${a.currency})`;
            if (defId && Number(a.id) === Number(defId)) o.selected = true;
            selectAcc.appendChild(o);
        });
        updatePayLineFinanceHelper(div);
    };

    selectMethod.onchange = fillAccounts;
    selectAcc.onchange = () => updatePayLineFinanceHelper(div);
    inputAmount.oninput = () => updatePayLineFinanceHelper(div);
    
    div.querySelector(".btn-remove-row").onclick = () => {
        div.remove();
        if (payLinesContainer.children.length === 0) createPaymentRow(0);
        updateModalRemainingTotal();
    };

    fillAccounts();
    payLinesContainer.appendChild(div);

    const modalContent = payModal.querySelector('.modal-content');
    if(modalContent) modalContent.scrollTop = modalContent.scrollHeight;
}

async function preloadFinance() {
  try {
    const [accs, routingRows] = await Promise.all([
      apiFetch("/finance/accounts"),
      apiFetch("/finance/method-routing"),
    ]);
    FIN_ACCOUNTS = normalizeList(accs);
    FIN_ROUTING = {};
    normalizeList(routingRows).forEach((r) => { FIN_ROUTING[upper(r.method)] = r.account_id ?? null; });
  } catch (e) { console.warn("No se cargaron finanzas", e); }
}

// ---------------- CATALOG FILLERS ----------------
function fillSuppliers() {
  if(!inputSupplier) return;
  inputSupplier.innerHTML = `<option value="">Selecciona proveedor...</option>`;
  (suppliers || []).forEach((s) => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.nombre || s.name;
    inputSupplier.appendChild(o);
  });
}

function fillTargets() {
  if (!itemTarget) return;
  const type = upper(itemType?.value);
  const list = type === "PRODUCT" ? products : type === "SUPPLY" ? supplies : [];

  itemTarget.innerHTML = `<option value="">Selecciona...</option>`;
  list.forEach((x) => {
    const o = document.createElement("option");
    o.value = x.id;
    o.textContent = x.nombre || x.name;
    itemTarget.appendChild(o);
  });
  if (itemUnitBadge) itemUnitBadge.textContent = "";
}

itemTarget?.addEventListener("change", () => {
    const type = upper(itemType.value);
    const id = Number(itemTarget.value);
    if (!id || !itemUnitBadge) return (itemUnitBadge.textContent = "");

    if (type === "SUPPLY") {
        const found = supplies.find(s => Number(s.id) === id);
        itemUnitBadge.textContent = found?.unit ? `(${found.unit.toUpperCase()})` : "";
    } else {
        itemUnitBadge.textContent = "(PZA)";
    }
});

// ---------------- CALCULADOR INTELIGENTE ----------------
function syncItemValues(source) {
    const qty = parseFloat(itemQty.value) || 0;
    const unit = parseFloat(itemUnitCost.value) || 0;
    const total = parseFloat(itemSubtotal.value) || 0;

    if (source === 'qty' || source === 'unit') {
        itemSubtotal.value = (qty * unit).toFixed(2);
    } else if (source === 'total') {
        if (qty > 0) {
            itemUnitCost.value = (total / qty).toFixed(4);
        }
    }
}

itemQty?.addEventListener("input", () => syncItemValues('qty'));
itemUnitCost?.addEventListener("input", () => syncItemValues('unit'));
itemSubtotal?.addEventListener("input", () => syncItemValues('total'));

// ---------------- FORM MANAGEMENT ----------------
function resetForm() {
  if(modalTitle) modalTitle.innerHTML = `<i class="bi bi-receipt"></i> Nueva Compra`;
  if(inputId) inputId.value = "";
  if(inputSupplier) inputSupplier.value = "";
  if(inputCondition) inputCondition.value = "";
  if(inputDueDate) inputDueDate.value = "";
  if(inputDate) inputDate.value = today();
  if(inputNotes) inputNotes.value = "";
  if(dueWrap) dueWrap.classList.add("hidden");

  if(inputCurrency) inputCurrency.value = "USD";
  if(inputExchangeRate) inputExchangeRate.value = purchaseRates.USD;

  draftItems = [];
  renderItems();

  if (itemType) itemType.value = "SUPPLY";
  fillTargets();

  if (itemTarget) itemTarget.value = "";
  if (itemQty) itemQty.value = "";
  if (itemUnitCost) itemUnitCost.value = "";
  if (itemSubtotal) itemSubtotal.value = "";
  if (itemUnitBadge) itemUnitBadge.textContent = "";
  
  if(btnSave) btnSave.style.display = "block";
}

// ---------------- ITEMS LOGIC ----------------
function calcItemsTotal() { return draftItems.reduce((acc, it) => acc + Number(it.total || 0), 0); }

function renderItems() {
  if (!itemsTbody || !totalView) return;
  itemsTbody.innerHTML = "";

  if (!draftItems.length) {
    itemsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">La factura no tiene artículos aún.</td></tr>`;
    totalView.textContent = `0.00`;
    if (totalBsView) totalBsView.textContent = "0.00 Bs.";
    return;
  }

  draftItems.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span style="font-size:0.75rem; background:#f1f5f9; padding:3px 8px; border-radius:4px; color:#64748b;">${it.type === "PRODUCT" ? "Producto" : "Insumo"}</span></td>
      <td style="font-weight:600; color:#1e293b;">${it.label}</td>
      <td style="text-align:center; font-weight:700; color:#0f766e;">
        ${it.qty} <small style="color:#94a3b8; font-size:0.7rem;">${(it.unit || "").toUpperCase()}</small>
      </td>
      <td class="money-col" style="color:#64748b;">${money(it.unit_cost)}</td>
      <td class="money-col" style="font-weight:700; color:#1e293b;">${money(it.total)}</td>
      <td style="text-align:center;"><button type="button" class="btn-icon btn-del" data-idx="${idx}"><i class="bi bi-trash"></i></button></td>
    `;
    itemsTbody.appendChild(tr);
  });

  itemsTbody.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.onclick = () => {
      draftItems.splice(Number(btn.dataset.idx), 1);
      renderItems();
    };
  });

  totalView.textContent = `${money(calcItemsTotal())}`;
  updateBsEquivalent();
}

function addItem() {
  const type = upper(itemType?.value);
  if (!type || !itemTarget?.value) return alert("Selecciona un artículo válido.");
  if (Number(itemQty?.value || 0) <= 0) return alert("La cantidad debe ser mayor a 0.");
  
  const qty = Number(itemQty.value);
  const unit_cost = Number(itemUnitCost.value);
  const total = Number(itemSubtotal.value) || (qty * unit_cost);

  const list = type === "PRODUCT" ? products : supplies;
  const obj = list.find((x) => Number(x.id) === Number(itemTarget.value));
  const label = obj ? (obj.nombre || obj.name) : `ID ${itemTarget.value}`;
  const unit = (type === "SUPPLY") ? (obj?.unit || "Kg") : "Pza";

  draftItems.push({
    type, label, qty, unit, unit_cost, total,
    product_id: type === "PRODUCT" ? Number(itemTarget.value) : null,
    supply_id: type === "SUPPLY" ? Number(itemTarget.value) : null,
  });

  renderItems();
  itemTarget.value = ""; itemQty.value = ""; itemUnitCost.value = ""; itemSubtotal.value = "";
  if (itemUnitBadge) itemUnitBadge.textContent = "";
}

// ---------------- MAIN TABLE ----------------
function getPurchaseBadge(status) {
  const s = upper(status);
  if (s === "CONFIRMADA") return `<span class="badge b-confirmada"><i class="bi bi-check-circle"></i> Confirmada</span>`;
  if (s === "ANULADA") return `<span class="badge b-anulada"><i class="bi bi-x-octagon"></i> Anulada</span>`;
  return `<span class="badge b-borrador"><i class="bi bi-pencil-square"></i> Borrador</span>`;
}

function renderPurchases() {
  if(!tableBody) return;
  tableBody.innerHTML = "";
  const term = (searchInput?.value || "").toLowerCase();

  const filtered = purchases.filter(p => {
    const sid = p.supplier_id ?? p.supplierId ?? p.supplier;
    const sName = (p.supplier_name || p.supplierName || supplierName(sid)).toLowerCase();
    const pid = String(p.purchase_number || p.id); 
    const pnotes = (p.notes || "").toLowerCase();
    return !term || sName.includes(term) || pid.includes(term) || pnotes.includes(term);
  });

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">No hay compras para mostrar.</td></tr>`;
    return;
  }

  filtered.forEach((p) => {
    const status = upper(p.status || "BORRADOR");
    const canConfirm = status === "BORRADOR";
    const canCancel = status === "CONFIRMADA";

    const supplierId = p.supplier_id ?? p.supplierId ?? p.supplier;
    const condClass = upper(p.condition) === "CREDITO" ? "b-credito" : "b-contado";
    const due = p.due_date ? String(p.due_date).slice(0, 10) : "-";
    const inv = p.inventory_applied ? `<span class="b-inv-ok"><i class="bi bi-check2-all"></i> Cargado</span>` : `<span class="b-inv-no">Pendiente</span>`;

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.innerHTML = `
      <td style="padding:15px; font-weight:800; color:#0f766e;">#${p.purchase_number || p.id}</td>
      <td style="padding:15px; font-weight:600; color:#1e293b;"><i class="bi bi-truck" style="color:#94a3b8;"></i> ${p.supplier_name || supplierName(supplierId)}</td>
      <td class="money-col" style="padding:15px; font-weight:800; color:#1e293b;">${money(p.total)}</td>
      <td style="padding:15px; text-align:center;"><span class="badge ${condClass}">${p.condition || "-"}</span></td>
      <td style="padding:15px; color:#64748b;">${due}</td>
      <td style="padding:15px; text-align:center;">${getPurchaseBadge(p.status)}</td>
      <td style="padding:15px; text-align:center; font-size:0.85rem;">${inv}</td>
      <td style="padding:15px; text-align:center;">
        <div class="table-actions">
          <button class="btn-icon btn-view" data-action="view" data-id="${p.id}" title="Ver Factura"><i class="bi bi-eye"></i></button>
          ${canConfirm ? `<button class="btn-icon btn-check" data-action="confirm" data-id="${p.id}" title="Confirmar e Ingresar"><i class="bi bi-check-lg"></i></button>` : ""}
          ${canCancel ? `<button class="btn-icon btn-del" data-action="cancel" data-id="${p.id}" title="Anular y Revertir"><i class="bi bi-arrow-counterclockwise"></i></button>` : ""}
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  tableBody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      try {
        if (action === "view") await openView(id);
        if (action === "confirm") await confirmFlow(id);
        if (action === "cancel") await cancelPurchase(id);
      } catch (e) { alert(e.message); }
    };
  });
}

// ---------------- LOADERS ----------------
// ---------------- LOADERS ----------------
async function refreshPurchases() {
  try {
    const resp = await apiFetch("/purchases");
    purchases = normalizeList(resp);
    window._compras = purchases; 
    renderPurchases();
  } catch (err) {
    console.error("Error al refrescar compras:", err);
  }
}

async function loadCatalogOnce() {
  const [s1, s2, s3] = await Promise.all([ apiFetch("/suppliers"), apiFetch("/products"), apiFetch("/supplies") ]);
  suppliers = normalizeList(s1);
  products = normalizeList(s2);
  supplies = normalizeList(s3);
  fillSuppliers();
  fillTargets();
}

async function loadAll() {
  await Promise.all([loadCatalogOnce(), preloadFinance(), loadCurrentRates()]);
  await refreshPurchases();
}

// ---------------- VIEW DETAIL ----------------
async function openView(id) {
  const data = await apiFetch(`/purchases/${id}`);
  if(modalTitle) modalTitle.innerHTML = `<i class="bi bi-search"></i> Detalle de Compra #${data.purchase_number || data.id}`;

  if(inputId) inputId.value = data.id;
  if(inputSupplier) inputSupplier.value = data.supplier_id ?? "";
  if(inputCondition) inputCondition.value = data.condition || "";
  if(inputDueDate) inputDueDate.value = data.due_date ? String(data.due_date).slice(0, 10) : "";
  if(inputDate) inputDate.value = data.purchase_date ? String(data.purchase_date).slice(0, 10) : today();
  if(inputNotes) inputNotes.value = data.notes || data.invoice_ref || "";

  if(inputExchangeRate) inputExchangeRate.value = data.exchange_rate || purchaseRates.USD;
  if(inputCurrency) inputCurrency.value = data.currency_code || "USD";

  if (upper(inputCondition?.value) === "CREDITO") dueWrap?.classList.remove("hidden");
  else dueWrap?.classList.add("hidden");

  draftItems = (data.items || []).map((it) => {
    const isProduct = !!it.product_id;
    return { 
        type: isProduct ? "PRODUCT" : "SUPPLY", 
        label: isProduct ? (it.product_name || `Producto ${it.product_id}`) : (it.supply_name || `Insumo ${it.supply_id}`), 
        qty: Number(it.qty), 
        unit: it.supply_unit || (isProduct ? "Pza" : "Kg"),
        unit_cost: Number(it.unit_cost), 
        total: Number(it.total), 
        product_id: it.product_id, 
        supply_id: it.supply_id 
    };
  });

  renderItems();
  if(btnSave) btnSave.style.display = upper(data.status) !== "BORRADOR" ? "none" : "block";
  openModal(purchaseModal);
}

// ---------------- CONFIRM FLOW MULTIPAGO ----------------
async function confirmFlow(id) {
  const data = await apiFetch(`/purchases/${id}`);
  
  if (upper(data.condition) !== "CONTADO") {
    if(!confirm("¿Confirmar esta compra a CRÉDITO? Se inyectará el inventario pero quedará deuda pendiente.")) return;
    await apiFetch(`/purchases/${id}`, { method: "PATCH", body: JSON.stringify({ status: "CONFIRMADA" }) });
    await refreshPurchases();
    return;
  }

  currentPayTotalUSD = parseFloat(data.total) || 0;
  currentPayExchangeRate = parseFloat(data.exchange_rate) || 1;
  
  if (payPurchaseId) payPurchaseId.value = id;

  if(payLinesContainer) {
    payLinesContainer.innerHTML = "";
    createPaymentRow(currentPayTotalUSD); 
  }
  
  updateModalRemainingTotal();
  openModal(payModal);
}

btnAddPayLine?.addEventListener("click", () => createPaymentRow(0));
payCancel?.addEventListener("click", () => closeModal(payModal));

payForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = Number(payPurchaseId.value);
  
  const lines = payLinesContainer.querySelectorAll(".payment-row-card");
  const payments = Array.from(lines).map(row => ({
      amount: parseFloat(row.querySelector(".pay-amount").value),
      method: upper(row.querySelector(".pay-method").value),
      finance_account_id: Number(row.querySelector(".pay-account").value),
      ref: row.querySelector(".pay-ref").value || null,
      exchange_rate: currentPayExchangeRate 
  }));

  const totalPagado = payments.reduce((s, p) => s + p.amount, 0);
  if (totalPagado < (currentPayTotalUSD - 0.01)) {
      if (!confirm(`El monto total pagado ($${totalPagado.toFixed(2)}) es menor al total de la compra ($${currentPayTotalUSD.toFixed(2)}). ¿Deseas continuar?`)) return;
  }

  try {
      await apiFetch(`/purchases/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "CONFIRMADA",
          payments: payments 
        }),
      });
      closeModal(payModal);
      await refreshPurchases();
      if(typeof showToast === 'function') showToast("Compra liquidada y confirmada");
  } catch (err) {
      alert("Error al procesar pagos: " + err.message);
  }
});

// ---------------- CANCEL / SUBMIT ----------------
async function cancelPurchase(id) {
  if (!confirm("¿Seguro que deseas anular? Esto REVERTIRÁ los items del inventario.")) return;
  await apiFetch(`/purchases/${id}`, { method: "PATCH", body: JSON.stringify({ status: "ANULADA" }) });
  await refreshPurchases();
}

async function onSubmit(e) {
  e.preventDefault();
  
  if (!inputSupplier?.value) return alert("Selecciona un proveedor.");
  if (!draftItems.length) return alert("Agrega al menos 1 artículo.");

  const payload = {
    supplier_id: Number(inputSupplier.value),
    status: "BORRADOR",
    invoice_ref: inputNotes?.value ? inputNotes.value.substring(0, 20) : "REF-" + Date.now(),
    condition: inputCondition?.value || "CONTADO",
    due_date: upper(inputCondition?.value) === "CREDITO" ? (inputDueDate?.value || null) : null,
    purchase_date: inputDate?.value || today(),
    notes: inputNotes?.value || null,
    currency_code: inputCurrency?.value || "USD",
    exchange_rate: parseFloat(inputExchangeRate?.value) || 1, 
    items: draftItems.map((it) => ({ 
      product_id: it.product_id ? Number(it.product_id) : null, 
      supply_id: it.supply_id ? Number(it.supply_id) : null, 
      qty: Number(it.qty), 
      unit_cost: Number(it.unit_cost), 
      total: Number(it.total) 
    })),
  };

  const id = inputId?.value;
  try {
    const path = id ? `/purchases/${id}` : "/purchases";
    const method = id ? "PUT" : "POST";

    await apiFetch(path, { 
        method: method, 
        body: JSON.stringify(payload) 
    });

    closeModal(purchaseModal);
    await refreshPurchases();
    if(typeof showToast === 'function') showToast(`Compra guardada correctamente`);

  } catch (err) {
    console.error("Error en submit de compra:", err);
    alert("Error al guardar: " + err.message);
  }
}

// ---------------- INIT ----------------
function init() {
  const userData = JSON.parse(localStorage.getItem("agromedic_user") || "{}");
  const canEditRate = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN_BRAND' || userData.is_coordinator === true;

  if (inputExchangeRate) {
    inputExchangeRate.readOnly = !canEditRate;
    if (!canEditRate) {
        inputExchangeRate.style.backgroundColor = "#f3f4f6";
        inputExchangeRate.style.cursor = "not-allowed";
    }
  }

  if(btnNew) {
    btnNew.onclick = async () => {
        if (!suppliers.length) await loadCatalogOnce();
        resetForm();
        await loadCurrentRates(); 
        openModal(purchaseModal);
      };
  }

  if(btnCancel) btnCancel.onclick = () => closeModal(purchaseModal);
  if(btnCloseModal) btnCloseModal.onclick = () => closeModal(purchaseModal);

  if(inputCondition) {
    inputCondition.onchange = () => {
        if (upper(inputCondition.value) === "CREDITO") dueWrap?.classList.remove("hidden");
        else dueWrap?.classList.add("hidden");
      };
  }

  inputCurrency?.addEventListener("change", () => {
      if(inputExchangeRate) inputExchangeRate.value = purchaseRates[inputCurrency.value] || 0;
      updateBsEquivalent();
  });

  inputExchangeRate?.addEventListener("input", updateBsEquivalent);
  if(itemType) itemType.onchange = fillTargets;
  
  btnAddItem?.addEventListener("click", (ev) => { 
      ev.preventDefault(); 
      addItem(); 
  });

  searchInput?.addEventListener("input", renderPurchases);
  if(form) form.onsubmit = (e) => onSubmit(e);

  const style = document.createElement('style');
  style.innerHTML = `
    #pay-modal .modal-content { max-height: 85vh; overflow-y: auto; padding-bottom: 20px; }
    #pay-lines-container { display: flex; flex-direction: column; gap: 12px; }
    .payment-row-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); }
  `;
  document.head.appendChild(style);

  loadAll().catch((err) => console.error("Error en carga inicial:", err));
}

document.addEventListener("DOMContentLoaded", init);