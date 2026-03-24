// ---------------- STATE ----------------
let suppliers = [];
let purchases = [];
let accounts = [];
let paymentsHistory = [];

// ---------------- ELEMENTOS DOM ----------------
const tableBody = document.querySelector("#supp-payments-table tbody");
const modal = document.getElementById("supp-payment-modal");
const form = document.getElementById("supp-payment-form");
const searchInput = document.getElementById("search-supplier");

const inputSupplier = document.getElementById("supp-payment-supplier");
const inputPurchase = document.getElementById("supp-payment-purchase");
const inputAccount = document.getElementById("supp-payment-account");
const inputAmount = document.getElementById("supp-payment-amount");
const inputMethod = document.getElementById("supp-payment-method");
const inputRef = document.getElementById("supp-payment-ref");
const inputDate = document.getElementById("supp-payment-date");
const purchaseHint = document.getElementById("purchase-hint");

// ---------------- HELPERS ----------------
const unwrap = (res) => (Array.isArray(res) ? res : res?.data || res?.rows || res?.result || []);
const upper = (v) => String(v || "").trim().toUpperCase();

// Calcula el acumulado pagado de una compra específica para determinar saldo
function getPaidAmount(purchaseId) {
    return paymentsHistory
        .filter(pay => Number(pay.purchase_id) === Number(purchaseId))
        .reduce((acc, pay) => acc + Number(pay.amount || 0), 0);
}

// ---------------- CARGA DE DATOS ----------------
async function loadAll() {
    try {
        const [resSupp, resPur, resAcc, resPay] = await Promise.all([
            apiFetch(`/suppliers`),
            apiFetch(`/purchases`),
            apiFetch(`/finance/accounts`),
            apiFetch(`/supplier-payments`)
        ]);

        suppliers = unwrap(resSupp);
        purchases = unwrap(resPur);
        accounts = unwrap(resAcc);
        paymentsHistory = unwrap(resPay);
    } catch (error) {
        console.error("Error cargando datos:", error);
        if (typeof openAlert === 'function') {
            openAlert({ title: "Error de Conexión", message: "No se pudieron obtener los datos de proveedores o pagos." });
        }
    }
}

// ---------------- UI FILLERS ----------------
function fillSelects() {
    if (!inputSupplier || !inputAccount) return;

    inputSupplier.innerHTML = '<option value="">Selecciona proveedor...</option>';
    suppliers.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nombre || s.name || `Proveedor ${s.id}`;
        inputSupplier.appendChild(opt);
    });

    inputAccount.innerHTML = '<option value="">Selecciona cuenta de origen...</option>';
    accounts.forEach(acc => {
        const opt = document.createElement("option");
        opt.value = acc.id;
        opt.textContent = `${acc.name} (${acc.currency})`;
        inputAccount.appendChild(opt);
    });
}

// ---------------- LÓGICA DE NEGOCIO (SALDOS) ----------------
inputSupplier?.addEventListener("change", () => {
    const suppId = inputSupplier.value;
    inputPurchase.innerHTML = '<option value="">Selecciona factura...</option>';
    if (purchaseHint) purchaseHint.innerHTML = "";
    inputAmount.value = "";

    if (!suppId) return;

    // Filtrar compras a crédito no anuladas de este proveedor
    const pendingInvoices = purchases.filter(p => {
        return Number(p.supplier_id) === Number(suppId) && 
               upper(p.condition) === "CREDITO" &&
               upper(p.status) !== "ANULADA";
    });

    let count = 0;
    pendingInvoices.forEach(p => {
        const total = Number(p.total || 0);
        const pagado = getPaidAmount(p.id);
        const pendiente = total - pagado;

        if (pendiente > 0.001) { // Evitar problemas de decimales
            count++;
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `Factura #${p.id} - Saldo: ${money(pendiente)}`;
            opt.dataset.pending = pendiente; 
            inputPurchase.appendChild(opt);
        }
    });

    if (count === 0 && purchaseHint) {
        purchaseHint.innerHTML = `<span style="color:#10b981;"><i class="bi bi-check-circle-fill"></i> Proveedor sin deudas pendientes.</span>`;
    }
});

inputPurchase?.addEventListener("change", () => {
    const selected = inputPurchase.selectedOptions[0];
    if (selected && selected.dataset.pending) {
        const deuda = Number(selected.dataset.pending);
        inputAmount.value = deuda.toFixed(2);
        if (purchaseHint) purchaseHint.innerHTML = `<i class="bi bi-info-circle-fill"></i> Saldo pendiente: ${money(deuda)}`;
    } else {
        inputAmount.value = "";
        if (purchaseHint) purchaseHint.innerHTML = "";
    }
});

// ---------------- RENDER TABLA ----------------
function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const term = (searchInput?.value || "").toLowerCase();

    const filtered = paymentsHistory.filter(p => {
        const supp = suppliers.find(s => s.id == p.supplier_id);
        const suppName = (supp?.nombre || supp?.name || "").toLowerCase();
        return !term || suppName.includes(term) || String(p.id).includes(term) || (p.method || "").toLowerCase().includes(term);
    });

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 25px; color: #64748b;">No se encontraron egresos.</td></tr>`;
        return;
    }
    
    filtered.sort((a, b) => b.id - a.id).forEach(item => {
        const acc = accounts.find(a => a.id == item.finance_account_id);
        const supp = suppliers.find(s => s.id == item.supplier_id);
        const suppName = supp ? (supp.nombre || supp.name) : `ID: ${item.supplier_id}`;

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        // En pago_proveedores.js, dentro de renderTable(), cuando creas el tr:
tr.innerHTML = `
    <td data-label="ID Pago" style="padding:15px; font-weight:800; color:#94a3b8;">OUT-${item.id}</td>
    <td data-label="Fecha">${fmtDate(item.paid_at)}</td>
    <td data-label="Proveedor" style="padding:15px; font-weight:600; color:#1e293b;"><i class="bi bi-truck"></i> ${suppName}</td>
    <td data-label="Factura" style="padding:15px; text-align:center;"><span class="badge-purchase">#${item.purchase_id}</span></td>
    <td data-label="Método"><span class="badge-method">${upper(item.method) || "-"}</span></td>
    <td data-label="Cuenta" style="color:#9f1239; font-weight:600;"><i class="bi bi-bank"></i> ${acc?.name || "-"}</td>
    <td data-label="Referencia">${item.ref || "-"}</td>
    <td data-label="Monto" class="money-col money-out">- ${money(item.amount)}</td>
`;
        tableBody.appendChild(tr);
    });
}

// ---------------- ACCIONES ----------------
async function refreshUI() {
    await loadAll();
    fillSelects();
    renderTable();
}

form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const monto = Number(inputAmount.value);
    const selected = inputPurchase.selectedOptions[0];
    const maximo = selected ? Number(selected.dataset.pending || 0) : 0;

    if (monto <= 0) return openAlert({ title: "Monto Inválido", message: "El pago debe ser mayor a cero." });
    
    // Validación de seguridad para no sobrepagar facturas
    if (maximo > 0 && monto > maximo + 0.01) {
        return openAlert({ title: "Pago Excedido", message: `El monto ingresado excede el saldo de la factura (${money(maximo)})` });
    }

    const payload = {
        supplier_id: Number(inputSupplier.value),
        purchase_id: Number(inputPurchase.value),
        finance_account_id: Number(inputAccount.value),
        amount: monto,
        method: upper(inputMethod.value),
        ref: inputRef.value,
        paid_at: inputDate.value
    };

    const btn = form.querySelector('button[type="submit"]');
    try {
        if (btn) { btn.disabled = true; btn.textContent = "Registrando..."; }

        await apiFetch(`/supplier-payments`, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (modal) modal.classList.add("hidden");
        
        if (typeof showToast === 'function') {
            showToast("Egreso registrado correctamente");
        } else {
            openAlert({ title: "Pago Registrado ✅", message: "El egreso ha sido procesado exitosamente." });
        }
        
        await refreshUI();

    } catch (err) {
        openAlert({ title: "Error", message: err.message });
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="bi bi-box-arrow-right"></i> Registrar Pago`; }
    }
});

// ---------------- EVENTOS INICIALES ----------------
function setupUI() {
    document.getElementById("btn-new-supp-payment")?.addEventListener("click", () => {
        form?.reset();
        if (inputDate) inputDate.value = new Date().toISOString().split("T")[0];
        if (inputPurchase) inputPurchase.innerHTML = '<option value="">Selecciona proveedor primero...</option>';
        if (purchaseHint) purchaseHint.innerHTML = "";
        modal?.classList.remove("hidden");
    });

    document.getElementById("btn-cancel")?.addEventListener("click", () => {
        modal?.classList.add("hidden");
    });

    searchInput?.addEventListener("input", renderTable);
    
    // Si existe el botón de refrescar en el HTML:
    document.getElementById("btn-refresh")?.addEventListener("click", refreshUI);
}

document.addEventListener("DOMContentLoaded", async () => {
    setupUI();
    if (typeof alertOk !== 'undefined' && alertOk) {
        alertOk.addEventListener("click", () => alertModal?.classList.add("hidden"));
    }
    await refreshUI();
});