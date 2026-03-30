// ---------------- API & CONFIG ----------------
const API_EXPENSES = `${API_BASE}/expenses`;
const API_SUPPLIERS = `${API_BASE}/suppliers`;
const API_ACCOUNTS = `${API_BASE}/finance/accounts`;
const API_EXCHANGE = `${API_BASE}/exchange`; // Endpoint de tasas

// ---------------- ELEMENTOS DEL DOM ----------------
const tableBody = document.querySelector("#expenses-body");
const btnFixed = document.getElementById("btn-new-fixed");
const btnSporadic = document.getElementById("btn-new-sporadic");
const modal = document.getElementById("expense-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("expense-form");

const sectionFixed = document.getElementById("section-fixed");
const sectionSporadic = document.getElementById("section-sporadic");

const inputId = document.createElement("input"); 
inputId.type = "hidden";
form.appendChild(inputId);

const inputCategory = document.getElementById("expense-category");
const inputName = document.getElementById("exp-name");
const inputAmount = document.getElementById("exp-amount");
const inputDate = document.getElementById("exp-date");
const inputSupplier = document.getElementById("exp-supplier-id");
const inputAccount = document.getElementById("exp-account"); 
const inputPlace = document.getElementById("exp-place");
const inputMethod = document.getElementById("exp-method");

const displayTotal = document.getElementById("display-total-expense");

// ---------------- ESTADO LOCAL ----------------
let expenses = [];
let suppliers = [];
let accounts = []; 
let rates = { USD: 1, EUR: 1 }; // Almacenamos las tasas aquí

// ---------------- CARGA DE DATOS ----------------

// Cargar tasas de cambio (Igual que en pedidos)
async function loadSystemRate() {
    try {
        const response = await apiFetch(API_EXCHANGE); 
        const data = response.latest || response.data || [];
        const usdData = data.find(r => r.currency_code === 'USD');
        const eurData = data.find(r => r.currency_code === 'EUR');
        if (usdData) rates.USD = parseFloat(usdData.rate_value);
        if (eurData) rates.EUR = parseFloat(eurData.rate_value);
        console.log("Tasas cargadas en Gastos:", rates);
    } catch (err) { console.error("Error cargando tasas:", err); }
}

async function loadSuppliers() {
    try {
        const json = await apiFetch(API_SUPPLIERS);
        suppliers = json.data || json || [];
        fillSuppliersSelect();
    } catch (e) { console.error("Error cargando proveedores", e); }
}

async function loadAccounts() {
    try {
        const json = await apiFetch(API_ACCOUNTS);
        accounts = (json.data || json || []).filter(acc => acc.is_active);
        fillAccountsSelect();
    } catch (e) { console.error("Error cargando cuentas", e); }
}

async function loadExpenses() {
    try {
        const period = document.getElementById("expense-period")?.value || "monthly";
        const json = await apiFetch(`${API_EXPENSES}?period=${period}`);
        expenses = json.data || json || [];
        renderTable();
        updateTotal();
    } catch (e) { console.error("Error cargando egresos", e); }
}

// ---------------- LLENADO DE SELECTS ----------------
function fillSuppliersSelect() {
    if (!inputSupplier) return;
    inputSupplier.innerHTML = `<option value="">No aplica / Particular</option>`;
    suppliers.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nombre || s.name;
        inputSupplier.appendChild(opt);
    });
}

function fillAccountsSelect() {
    if (!inputAccount) return;
    inputAccount.innerHTML = `<option value="">Selecciona cuenta de origen...</option>`;
    accounts.forEach((acc) => {
        const opt = document.createElement("option");
        opt.value = acc.id;
        opt.textContent = `${acc.name} (${acc.currency})`;
        inputAccount.appendChild(opt);
    });
}

// ---------------- LÓGICA DE MODAL ----------------
function openExpenseModal(type) {
    form.reset();
    inputId.value = "";
    inputCategory.value = type;
    inputDate.value = new Date().toISOString().split('T')[0];

    if (type === 'FIXED') {
        modalTitle.textContent = "Registrar Gasto Fijo";
        sectionFixed.classList.remove("hidden");
        sectionSporadic.classList.add("hidden");
        inputAccount.required = true;
    } else {
        modalTitle.textContent = "Registrar Gasto Esporádico";
        sectionFixed.classList.add("hidden");
        sectionSporadic.classList.remove("hidden");
        inputAccount.required = false;
    }
    modal.classList.remove("hidden");
}

// ---------------- CRUD (MULTIMONEDA) ----------------
async function onSubmit(e) {
    e.preventDefault();

    // 1. Identificar la moneda de la cuenta seleccionada
    const selectedAcc = accounts.find(a => a.id == inputAccount.value);
    const currency = selectedAcc ? selectedAcc.currency : 'USD';
    
    // 2. Obtener la tasa correspondiente (si es Bs, buscamos la de USD)
    const currentRate = currency === 'VES' ? rates.USD : 1;

    const payload = {
        category: inputCategory.value,
        description: inputName.value,
        amount: parseFloat(inputAmount.value),
        date: inputDate.value,
        method: inputMethod.value,
        supplier_id: inputCategory.value === 'FIXED' ? (inputSupplier.value || null) : null,
        finance_account_id: inputAccount.value || null,
        place: inputCategory.value === 'SPORADIC' ? inputPlace.value : null,
        
        // --- MULTIMONEDA ---
        currency: currency,
        exchange_rate: currentRate 
    };

    try {
        if (!inputId.value) {
            await apiFetch(API_EXPENSES, { method: "POST", body: JSON.stringify(payload) });
        } else {
            await apiFetch(`${API_EXPENSES}/${inputId.value}`, { method: "PUT", body: JSON.stringify(payload) });
        }
        modal.classList.add("hidden");
        await loadExpenses();
    } catch (err) { 
        alert("Error: " + err.message);
    }
}

// ---------------- RENDER ----------------
function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    expenses.forEach(ex => {
        const tr = document.createElement("tr");
        const badgeClass = ex.category === 'FIXED' ? 'b-fijo' : 'b-esporadico';
        const badgeText = ex.category === 'FIXED' ? 'Fijo' : 'Eventual';
        
        const accountName = ex.account_name || 'N/A';
        const curr = ex.currency || 'USD';
        const symbol = curr === 'VES' ? 'Bs.' : '$';

        tr.innerHTML = `
            <td style="padding:15px;">${new Date(ex.date).toLocaleDateString()}</td>
            <td style="padding:15px; font-weight:600;">${ex.description}</td>
            <td style="padding:15px;"><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td style="padding:15px;">${ex.place || ex.supplier_name || 'Particular'}</td>
            <td style="padding:15px; font-weight:bold; color:#ef4444;">
                ${symbol} ${parseFloat(ex.amount).toFixed(2)}
                ${curr === 'VES' ? `<br><small style="color:gray; font-weight:normal;">($ ${(ex.amount / ex.exchange_rate).toFixed(2)})</small>` : ''}
            </td>
            <td style="padding:15px; text-align:center;">
                <small style="display:block; color:#666;">${ex.method}</small>
                <span style="font-size:0.8em;">${accountName}</span>
            </td>
            <td style="padding:15px; text-align:center;">
                <button class="btn-icon btn-del" data-id="${ex.id}"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll(".btn-del").forEach(b => {
        b.onclick = () => deleteExpense(b.dataset.id);
    });
}

async function deleteExpense(id) {
    const ok = await openConfirm({ title: "Eliminar", message: "¿Borrar este registro?", okText: "Eliminar", okVariant: "danger" });
    if (ok) {
        try {
            await apiFetch(`${API_EXPENSES}/${id}`, { method: "DELETE" });
            loadExpenses();
        } catch (e) { console.error(e); }
    }
}

function updateTotal() {
    // Calculamos el total convertido a USD para el display principal del Dashboard
    const totalUSD = expenses.reduce((acc, ex) => {
        const val = parseFloat(ex.amount);
        const rate = parseFloat(ex.exchange_rate) || 1;
        return acc + (ex.currency === 'VES' ? (val / rate) : val);
    }, 0);
    
    displayTotal.textContent = `$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// ---------------- INICIALIZACIÓN ----------------
async function init() {
    btnFixed?.addEventListener("click", () => openExpenseModal('FIXED'));
    btnSporadic?.addEventListener("click", () => openExpenseModal('SPORADIC'));

    document.querySelectorAll(".close-modal-btn").forEach(btn => {
        btn.onclick = () => modal.classList.add("hidden");
    });

    if (form) form.onsubmit = onSubmit;
    document.getElementById("expense-period")?.addEventListener("change", loadExpenses);

    await Promise.all([
        loadSystemRate(), // Cargamos la tasa primero
        loadSuppliers(), 
        loadAccounts(), 
        loadExpenses()
    ]);
}

document.addEventListener("DOMContentLoaded", init);