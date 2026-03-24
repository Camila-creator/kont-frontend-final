// --- UTILIDADES ---
// Eliminamos la función money() de aquí porque ya existe globalmente.

function fmtDate(iso) { 
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES") + " - " + d.toLocaleTimeString("es-ES", {hour: '2-digit', minute:'2-digit'});
}

async function api(url, opts={}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, {
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}`, 
            ...(opts.headers || {}) 
        },
        ...opts
    });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("agromedic_token");
        window.location.replace("../pages/login.html");
        return;
    }
    if(!res.ok) throw new Error(await res.text() || "Error API");
    return res.json();
}

function unwrap(d) { return Array.isArray(d) ? d : (d.data || d.rows || []); }

// --- CONTROL DE MODALES (Restaurados para independencia del archivo) ---
const alertModal = document.getElementById("alert-modal");
const alertTitle = document.getElementById("alert-title");
const alertMessage = document.getElementById("alert-message");
const alertOk = document.getElementById("alert-ok");

const confirmModal = document.getElementById("confirm-modal");
const confirmOk = document.getElementById("confirm-ok");
const confirmCancel = document.getElementById("confirm-cancel");
let confirmResolver = null;

function openAlert({title, message}) {
    alertTitle.textContent = title; alertMessage.textContent = message;
    alertModal.classList.remove("hidden");
}
function closeAlert() { alertModal.classList.add("hidden"); }

function openConfirm({ title="Confirmar", message="¿Estás segura?" }) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    confirmModal.classList.remove("hidden");
    return new Promise(resolve => { confirmResolver = resolve; });
}
function closeConfirm() { confirmModal.classList.add("hidden"); }

if(confirmOk) confirmOk.onclick = () => { confirmResolver?.(true); closeConfirm(); };
if(confirmCancel) confirmCancel.onclick = () => { confirmResolver?.(false); closeConfirm(); };
if(alertOk) alertOk.onclick = closeAlert;

// --- ELEMENTOS DE LA UI ---
const pageTitle = document.getElementById("page-title");
const elClient = document.getElementById("order-client");
const elTerms = document.getElementById("order-terms");
const elType = document.getElementById("order-type");
const elDate = document.getElementById("order-date");
const selStatus = document.getElementById("order-status");
const inputNotes = document.getElementById("order-notes");
const elDiscount = document.getElementById("sum-discount");
const btnSave = document.getElementById("btn-save-order");
const btnDelete = document.getElementById("btn-delete-order");
const btnQuickPay = document.getElementById("btn-quick-pay");

const itemsTbody = document.querySelector("#items-table tbody");
const paymentsTbody = document.querySelector("#payments-table tbody");

const elSubtotal = document.getElementById("sum-subtotal");
const elTotal = document.getElementById("sum-total");
const elPaid = document.getElementById("sum-paid");
const elPending = document.getElementById("sum-pending");

const payModal = document.getElementById("pay-modal");
const payForm = document.getElementById("pay-form");
const paymentLinesContainer = document.getElementById("payment-lines-container");
const btnAddPaymentLine = document.getElementById("btn-add-payment-line");
const payDate = document.getElementById("pay-date");
const payCancel = document.getElementById("pay-cancel");
const elPayRateInfo = document.getElementById("pay-rate-info");
const payModalPending = document.getElementById("pay-modal-pending");

// Estado
let order = null;
let payments = [];
let accounts = [];

// --- CARGA DE DATOS ---
async function loadData(id) {
    try {
        const resOrder = await api(`${API_BASE}/orders/${id}?t=${Date.now()}`);
        order = { ...resOrder, exchange_rate: Number(resOrder.exchange_rate || 1) };
        
        accounts = unwrap(await api(`${API_BASE}/finance/accounts`));
        
        const allPayments = unwrap(await api(`${API_BASE}/customer-payments?t=${Date.now()}`));
        payments = allPayments.filter(p => Number(p.order_id) === Number(id));
        
        render();
    } catch (err) { 
        console.error(err);
        openAlert({title: "Error", message: "No se pudo cargar el pedido."}); 
    }
}

// --- CREADOR DE LÍNEAS DE PAGO ---
function createPaymentLine(amount = "") {
    const div = document.createElement("div");
    div.className = "payment-line";
    
    let accOptions = `<option value="">Selecciona cuenta...</option>`;
    accounts.forEach(acc => {
        accOptions += `<option value="${acc.id}">${acc.name} (${acc.currency})</option>`;
    });

    div.innerHTML = `
        <button type="button" class="btn-remove-line" title="Eliminar pago"><i class="bi bi-trash"></i></button>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom: 12px; margin-top: 5px;">
            <div class="form-group">
                <label class="label-account" style="color: #475569;"><i class="bi bi-bank" style="color:#10b981"></i> Cuenta Destino *</label>
                <select class="line-account" required>${accOptions}</select>
            </div>
            <div class="form-group">
                <label>Método *</label>
                <select class="line-method" required>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="PAGO_MOVIL">Pago móvil</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="ZELLE">Zelle</option>
                    <option value="BINANCE">Binance</option>
                    <option value="PUNTO_VENTA">Punto Venta</option>
                    <option value="EQUIPO_USADO">📱 Equipo como pago</option>
                </select>
            </div>
        </div>

        <div class="form-group phone-model-wrapper hidden" style="margin-bottom: 15px; background: #f0f4ff; padding: 12px; border-radius: 8px; border: 1px dashed #6366f1;">
            <label style="font-size: 0.75rem; color: #4338ca; font-weight: 800;">DETALLES DEL EQUIPO RECIBIDO *</label>
            <input type="text" class="line-phone-model" placeholder="Ej: iPhone 13 Pro Max Blue 128GB">
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
            <div class="form-group">
                <label>Monto a Registrar ($) *</label>
                <input type="number" class="line-amount" step="0.01" required value="${amount}" style="font-weight: 800; font-size: 1.1rem;">
                <span class="line-bs-info" style="font-size: 0.85rem; color: #64748b; margin-top: 5px; display: block; font-weight:600;">Eq. Bs: 0.00</span>
            </div>
            <div class="form-group">
                <label>Ref. (Opcional)</label>
                <input type="text" class="line-ref" placeholder="Ej: 1234">
            </div>
        </div>
    `;

    const inputAmount = div.querySelector(".line-amount");
    const selectAccount = div.querySelector(".line-account");
    const selectMethod = div.querySelector(".line-method");
    const phoneWrapper = div.querySelector(".phone-model-wrapper");
    const labelAcc = div.querySelector(".label-account");
    const bsInfo = div.querySelector(".line-bs-info");

    const updateLineBs = () => {
        const accId = selectAccount.value;
        const acc = accounts.find(a => String(a.id) === String(accId));
        const curr = acc ? acc.currency : 'USD';
        const val = Number(inputAmount.value || 0);
        const rate = Number(order.exchange_rate || 1);
        
        if (curr === 'VES') {
            div.style.background = "#f0fdf4";
            bsInfo.innerHTML = `Cobrar: <span style="color:#16a34a; font-weight:800;">Bs. ${money(val * rate)}</span>`;
        } else {
            div.style.background = selectMethod.value === "EQUIPO_USADO" ? "#f8faff" : "white";
            bsInfo.innerHTML = `Ref: Bs. ${money(val * rate)}`;
        }
    };

    selectMethod.addEventListener("change", () => {
        if (selectMethod.value === "EQUIPO_USADO") {
            phoneWrapper.classList.remove("hidden");
            div.style.borderLeft = "5px solid #6366f1";
            div.style.background = "#f8faff";
            selectAccount.value = "";
            selectAccount.disabled = true;
            selectAccount.required = false;
            selectAccount.style.background = "#e2e8f0";
            labelAcc.innerHTML = `<i class="bi bi-box-seam" style="color:#6366f1"></i> Destino: Almacén de Equipos`;
        } else {
            phoneWrapper.classList.add("hidden");
            div.style.borderLeft = "none";
            div.style.background = "white";
            selectAccount.disabled = false;
            selectAccount.required = true;
            selectAccount.style.background = "white";
            labelAcc.innerHTML = `<i class="bi bi-bank" style="color:#10b981"></i> Cuenta Destino *`;
        }
        updateLineBs();
    });

    inputAmount.addEventListener("input", updateLineBs);
    selectAccount.addEventListener("change", updateLineBs);
    div.querySelector(".btn-remove-line").onclick = () => {
        if(document.querySelectorAll(".payment-line").length > 1) div.remove();
    };

    paymentLinesContainer.appendChild(div);
    if(amount) updateLineBs();
}

// --- RENDER ---
function render() {
    if (!order) return;

    pageTitle.innerHTML = `Pedido <span style="color:#0284c7;">#${order.order_number || order.id}</span>`;
    elClient.innerHTML = `<i class="bi bi-person-circle"></i> ${order.customer_name || `ID: ${order.customer_id}`}`;
    elDate.innerHTML = `<i class="bi bi-calendar3"></i> ${fmtDate(order.created_at || order.order_date)}`;
    
    const termsClass = (order.terms || "CONTADO").toUpperCase() === "CREDITO" ? "b-credito" : "b-contado";
    elTerms.innerHTML = `<span class="badge ${termsClass}">${order.terms || "CONTADO"}</span>`;
    
    const typeClass = (order.price_mode || "RETAIL").toUpperCase() === "MAYORISTA" ? "b-mayor" : "b-retail";
    elType.innerHTML = `<span class="badge ${typeClass}">${order.price_mode || "RETAIL"}</span>`;
    
    selStatus.value = order.status || "BORRADOR";
    inputNotes.value = order.notes || "";

    itemsTbody.innerHTML = "";
    let subtotal = 0;
    (order.items || []).forEach(it => {
        const totalItem = Number(it.qty) * Number(it.unit_price);
        subtotal += totalItem;
        itemsTbody.innerHTML += `
            <tr>
                <td>${it.product_name || it.name}</td>
                <td style="text-align:center;">${it.qty}</td>
                <td class="money-col">$ ${money(it.unit_price)}</td>
                <td class="money-col">$ ${money(totalItem)}</td>
            </tr>`;
    });

    paymentsTbody.innerHTML = "";
    let totalPaid = 0;
    const listaPagos = order.payments || []; 

    if (listaPagos.length === 0) {
        paymentsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color:#94a3b8;">No hay abonos registrados.</td></tr>`;
    } else {
        listaPagos.forEach(p => {
            totalPaid += Number(p.amount);
            const isPhone = p.method === "EQUIPO_USADO";
            const rowStyle = isPhone ? 'style="background-color: #f8faff; border-left: 3px solid #6366f1;"' : '';
            const nombreCuenta = p.account_name || (p.finance_account_id ? `ID: ${p.finance_account_id}` : 'No asignada');

            paymentsTbody.innerHTML += `
                <tr ${rowStyle}>
                    <td>#${p.id}</td>
                    <td>${fmtDate(p.paid_at)}</td>
                    <td><span style="font-weight:600; color:${isPhone ? '#4338ca':'#1e293b'}">${isPhone ? '📱 ' : ''}${p.method}</span></td>
                    <td>${isPhone ? '<span class="badge" style="background:#e0e7ff; color:#4338ca;">RECIBIDO EN DEPÓSITO</span>' : nombreCuenta}</td> 
                    <td>${p.ref || p.reference || '-'}</td>
                    <td class="money-col" style="color: #16a34a; font-weight: bold;">+ $ ${money(p.amount)}</td>
                </tr>`;
        });
    }

    const discount = Number(order.discount_amount || 0);
    const totalNeto = subtotal - discount;
    const pending = Math.max(0, totalNeto - totalPaid);
    
    if (elSubtotal) elSubtotal.textContent = `$ ${money(subtotal)}`;
    if (elDiscount) elDiscount.textContent = `- $ ${money(discount)}`;
    elTotal.textContent = `$ ${money(totalNeto)}`;
    elPaid.textContent = `$ ${money(totalPaid)}`;
    elPending.textContent = `$ ${money(pending)}`;

    if (order.status === "ANULADO" || pending <= 0.01) {
        btnQuickPay.disabled = true;
        btnQuickPay.style.opacity = "0.7";
    } else {
        btnQuickPay.disabled = false;
        btnQuickPay.dataset.pending = pending; 
    }
}

// --- ACCIONES ---
async function savePayment(e) {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalHTML = btnSubmit.innerHTML;

    try {
        const lines = document.querySelectorAll(".payment-line");
        const paymentsToSend = [];

        for (let line of lines) {
            const method = line.querySelector(".line-method").value;
            const accId = line.querySelector(".line-account").value;
            const amount = Number(line.querySelector(".line-amount").value);
            const ref = line.querySelector(".line-ref").value;
            const phoneModel = line.querySelector(".line-phone-model")?.value;

            if (method !== "EQUIPO_USADO" && !accId) throw new Error("Selecciona la cuenta destino.");
            if (amount <= 0) throw new Error("Monto inválido.");
            if (method === "EQUIPO_USADO" && (!phoneModel || !phoneModel.trim())) throw new Error("Indica el modelo del teléfono.");

            const selectedAccount = accounts.find(a => String(a.id) === String(accId));

            paymentsToSend.push({
                customer_id: order.customer_id, 
                order_id: order.id, 
                amount: amount, 
                currency: selectedAccount ? selectedAccount.currency : 'USD', 
                exchange_rate: Number(order.exchange_rate),
                method: method, 
                ref: ref, 
                phone_model: method === "EQUIPO_USADO" ? phoneModel : null,
                finance_account_id: method === "EQUIPO_USADO" ? null : accId,
                paid_at: payDate.value || new Date().toISOString()
            });
        }

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> Enviando...`;

        await Promise.all(paymentsToSend.map(body => 
            api(`${API_BASE}/customer-payments`, { method: "POST", body: JSON.stringify(body) })
        ));

        await loadData(order.id);

        const totalPagadoAcumulado = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const sub = (order.items || []).reduce((sum, it) => sum + (Number(it.qty) * Number(it.unit_price)), 0);
        const neto = sub - Number(order.discount_amount || 0);

        if (totalPagadoAcumulado >= (neto - 0.01) && order.status === "BORRADOR") {
            await api(`${API_BASE}/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: "CONFIRMADO" }) });
            await loadData(order.id); 
        }

        payModal.classList.add("hidden");
        openAlert({ title: "¡Éxito!", message: "Pagos registrados correctamente." });

    } catch (err) { openAlert({title: "Error", message: err.message}); } 
    finally { btnSubmit.disabled = false; btnSubmit.innerHTML = originalHTML; }
}

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return window.location.href = "./pedidos.html";

    if(btnSave) btnSave.onclick = async () => {
        try {
            await api(`${API_BASE}/orders/${order.id}`, { 
                method: "PATCH", 
                body: JSON.stringify({ status: selStatus.value, notes: inputNotes.value }) 
            });
            openAlert({ title: "Éxito", message: "Cambios guardados." });
            loadData(order.id);
        } catch (err) { openAlert({ title: "Error", message: err.message }); }
    };

    if(btnDelete) btnDelete.onclick = async () => {
        const ok = await openConfirm({ title: "Anular", message: "¿Estás segura de anular este pedido?" });
        if (ok) {
            await api(`${API_BASE}/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: "ANULADO" }) });
            loadData(order.id);
        }
    };

    btnQuickPay.onclick = () => {
        paymentLinesContainer.innerHTML = ""; 
        const pendingVal = Number(btnQuickPay.dataset.pending).toFixed(2);
        elPayRateInfo.textContent = `Tasa del pedido: ${money(order.exchange_rate)} Bs.`;
        payModalPending.textContent = `$ ${money(pendingVal)}`;
        payDate.value = new Date().toISOString().slice(0,10);
        createPaymentLine(pendingVal);
        payModal.classList.remove("hidden");
    };

    btnAddPaymentLine.onclick = () => createPaymentLine("");
    payCancel.onclick = () => payModal.classList.add("hidden");
    payForm.onsubmit = savePayment;

    loadData(id);
});

