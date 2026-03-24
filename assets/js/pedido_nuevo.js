// --- ESTADO GLOBAL ---
let clients = [];
let products = [];
let items = [];
let rates = { USD: 1, EUR: 1 };
let selectedCurrency = "USD";

// 🛡️ DETECTAR CATEGORÍA PARA LÓGICA DE TELÉFONOS
const userData = JSON.parse(localStorage.getItem("agromedic_user") || "{}");
const isPhoneStore = Number(userData.tenant_category_id) === 1;

// --- REFERENCIAS UI ---
const selClient = document.getElementById("order-client");
const selTerms = document.getElementById("order-terms");
const selMode = document.getElementById("order-price-mode");
const inputThreshold = document.getElementById("order-wholesale-threshold");
const inputNotes = document.getElementById("order-notes");
const inputDiscount = document.getElementById("order-discount");
const elAutoResult = document.getElementById("order-auto-result");

const selProduct = document.getElementById("item-product");
const inputQty = document.getElementById("item-qty");
const elItemPrice = document.getElementById("item-price");

// 📱 Nuevo campo para IMEIs (Solo visible en telefonía)
const inputSerials = document.getElementById("item-serials"); 

const btnAdd = document.getElementById("btn-add-item");
const btnSave = document.getElementById("btn-save-draft");

const itemsTbody = document.querySelector("#items-table tbody");
const elUnits = document.getElementById("sum-units");
const elSubtotal = document.getElementById("sum-subtotal");
const elTotal = document.getElementById("sum-total");
const elTotalBs = document.getElementById("total-bs-amount");
const elLabelBs = document.getElementById("label-bs-currency");

// Botones de Tasa
const btnRateUsd = document.getElementById("btn-rate-usd");
const btnRateEur = document.getElementById("btn-rate-eur");
const valRateUsd = document.getElementById("val-rate-usd");
const valRateEur = document.getElementById("val-rate-eur");

// Alert Modal
const alertModal = document.getElementById("alert-modal");
const alertTitle = document.getElementById("alert-title");
const alertMessage = document.getElementById("alert-message");
const alertOk = document.getElementById("alert-ok");

// ----------------- HELPERS -----------------
function safeText(v) { return (v ?? "").toString().trim(); }
function toInt(v) { const n = parseInt(v, 10); return Number.isNaN(n) ? 0 : n; }
function toNum(v) { const n = Number(v); return Number.isNaN(n) ? 0 : n; }

// Se cambió el nombre de 'money' a 'formatMoney' para evitar conflictos de identificador
function formatMoney(n) {
    return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchJson(url, opts = {}) {
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
    if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
    return res.json();
}

// ----------------- MODALES -----------------
function openAlert({ title = "Aviso", message = "" } = {}) {
    if (!alertModal) return window.alert(`${title}\n\n${message}`);
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertModal.classList.remove("hidden");
}
if (alertOk) alertOk.onclick = () => alertModal.classList.add("hidden");

// ----------------- CARGA DE DATOS -----------------

async function loadSystemRate() {
    try {
        const response = await fetchJson(`${API_BASE}/exchange`); 
        const data = response.latest || response.data || [];
        const usdData = data.find(r => r.currency_code === 'USD');
        const eurData = data.find(r => r.currency_code === 'EUR');
        if (usdData) rates.USD = toNum(usdData.rate_value);
        if (eurData) rates.EUR = toNum(eurData.rate_value);
        if (valRateUsd) valRateUsd.textContent = formatMoney(rates.USD);
        if (valRateEur) valRateEur.textContent = formatMoney(rates.EUR);
    } catch (err) { console.error("Error cargando tasas:", err); }
}

async function loadClients() {
    const res = await fetchJson(`${API_BASE}/customers`);
    const data = res.data || res.rows || res || [];
    clients = data.map(c => ({
        id: Number(c.id),
        name: c.nombre || c.name || c.razon_social || "Sin nombre",
        type: (c.tipo || c.type || "").toString().toUpperCase() === "MAYORISTA" ? "MAYORISTA" : "RETAIL",
        terms: (c.terms || c.condicion || "").toString().trim().toUpperCase() === "CREDITO" ? "CREDITO" : "CONTADO"
    }));
}

async function loadProducts() {
    const res = await fetchJson(`${API_BASE}/products`);
    const data = res.data || res.rows || res || [];
    products = data.map(p => ({
        id: Number(p.id),
        name: p.name || p.nombre || "Sin nombre",
        priceRetail: toNum(p.retail_price ?? p.precio_retail ?? 0),
        priceMayor: toNum(p.mayor_price ?? p.precio_mayor ?? 0)
    }));
}

function fillClients() {
    selClient.innerHTML = `<option value="">Selecciona cliente...</option>`;
    clients.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.type})`;
        selClient.appendChild(opt);
    });
}

function fillProducts() {
    selProduct.innerHTML = `<option value="">Selecciona producto...</option>`;
    products.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.name} — Detal: $${formatMoney(p.priceRetail)} / Mayor: $${formatMoney(p.priceMayor)}`;
        selProduct.appendChild(opt);
    });
}

// ----------------- LÓGICA DE NEGOCIO -----------------
function resolveOrderTerms() {
    const v = safeText(selTerms?.value).toUpperCase();
    if (v === "CONTADO" || v === "CREDITO") return v;
    const client = clients.find(c => c.id == selClient.value);
    return (client?.terms || "CONTADO").toUpperCase() === "CREDITO" ? "CREDITO" : "CONTADO";
}

function resolvePriceType() {
    const mode = safeText(selMode?.value).toUpperCase();
    if (mode === "RETAIL" || mode === "MAYORISTA") return mode;
    const client = clients.find(c => c.id == selClient.value);
    const units = items.reduce((a, b) => a + toNum(b.qty), 0);
    const threshold = Math.max(1, toInt(inputThreshold?.value || 6));
    if (client?.type === "MAYORISTA" || units >= threshold) return "MAYORISTA";
    return "RETAIL";
}

function getUnitPrice(product) {
    return resolvePriceType() === "MAYORISTA" ? product.priceMayor : product.priceRetail;
}

function updateAutoResult() {
    if (!elAutoResult) return;
    if (!selClient.value) {
        elAutoResult.innerHTML = `<span class="badge b-null">Esperando cliente...</span>`;
        return;
    }
    const priceType = resolvePriceType();
    const terms = resolveOrderTerms();
    elAutoResult.innerHTML = `
        <span class="badge ${priceType === 'MAYORISTA' ? 'b-mayor' : 'b-retail'}">${priceType}</span>
        <span class="badge ${terms === 'CREDITO' ? 'b-credito' : 'b-contado'}">${terms}</span>
    `;
}

// ----------------- GESTIÓN DE ITEMS -----------------
function renderItems() {
    if (!itemsTbody) return;
    itemsTbody.innerHTML = "";
    if (items.length === 0) {
        itemsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">No hay productos.</td></tr>`;
        return;
    }
    items.forEach((it, i) => {
        const serialsHtml = (isPhoneStore && it.serials.length > 0) 
            ? `<div style="font-size: 0.75rem; color: #6366f1;">IMEIs: ${it.serials.join(", ")}</div>` 
            : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div style="font-weight: 600;">${it.name}</div>
                ${serialsHtml}
            </td>
            <td style="text-align: center; font-weight: 800;">${it.qty}</td>
            <td class="money-col">$ ${formatMoney(it.price)}</td>
            <td class="money-col" style="font-weight: 800;">$ ${formatMoney(it.price * it.qty)}</td>
            <td style="text-align: center;">
                <button class="btn-icon btn-del" onclick="removeItem(${i})"><i class="bi bi-trash"></i></button>
            </td>
        `;
        itemsTbody.appendChild(tr);
    });
}

window.removeItem = (index) => {
    items.splice(index, 1);
    renderItems();
    refreshSummary();
    updateItemPricePreview();
};

function refreshSummary() {
    const units = items.reduce((a, b) => a + toNum(b.qty), 0);
    const subtotal = items.reduce((a, b) => a + (toNum(b.qty) * toNum(b.price)), 0);
    const discount = toNum(inputDiscount?.value || 0);
    const totalUsd = subtotal - discount;

    const activeRate = rates[selectedCurrency] || 1;
    const totalBs = totalUsd * activeRate;

    if (elUnits) elUnits.textContent = String(units);
    if (elSubtotal) elSubtotal.textContent = `$ ${formatMoney(subtotal)}`;
    if (elTotal) elTotal.textContent = `$ ${formatMoney(totalUsd)}`;
    if (elTotalBs) elTotalBs.textContent = `Bs. ${formatMoney(totalBs)}`;
    if (elLabelBs) elLabelBs.textContent = `Efectivo Bs. (${selectedCurrency})`;

    updateAutoResult();
}

function updateItemPricePreview() {
    const p = products.find(p => p.id == selProduct.value);
    if (!p) {
        if (elItemPrice) elItemPrice.textContent = "$ 0.00";
        updateAutoResult();
        return;
    }
    if (elItemPrice) elItemPrice.textContent = `$ ${formatMoney(getUnitPrice(p))}`;
    updateAutoResult();
}

function addItem() {
    const product = products.find(p => p.id == selProduct.value);
    if (!product) return openAlert({ title: "Atención", message: "Selecciona un producto." });
    
    const qty = Math.max(1, toNum(inputQty.value || 1));
    const price = getUnitPrice(product);
    
    let serialsArray = [];
    if (isPhoneStore && inputSerials) {
        const raw = inputSerials.value.trim();
        if (raw) {
            serialsArray = raw.split(",").map(s => s.trim().toUpperCase()).filter(s => s !== "");
        }
    }

    // Buscamos si ya existe para acumular (pero solo si no tienen seriales para no mezclarlos)
    const existing = items.find(i => i.productId === product.id && toNum(i.price) === toNum(price) && i.serials.length === 0);
    
    if (existing && serialsArray.length === 0) { 
        existing.qty += qty; 
    } else { 
        items.push({ 
            productId: product.id, 
            name: product.name, 
            qty, 
            price,
            serials: serialsArray 
        }); 
    }

    selProduct.value = "";
    inputQty.value = "1";
    if (inputSerials) inputSerials.value = ""; 

    renderItems();
    refreshSummary();
    updateItemPricePreview();
}

async function saveDraft() {
    const customerId = toInt(selClient.value);
    if (!customerId) return openAlert({ title: "Falta Cliente", message: "Selecciona un cliente." });
    if (items.length === 0) return openAlert({ title: "Pedido Vacío", message: "Agrega productos." });

    const payload = {
        customer_id: customerId,
        status: "BORRADOR",
        terms: resolveOrderTerms(),
        price_mode: resolvePriceType(),
        wholesale_threshold: Math.max(1, toInt(inputThreshold.value || 6)),
        notes: safeText(inputNotes.value),
        discount_amount: toNum(inputDiscount.value || 0),
        exchange_rate: rates[selectedCurrency],
        items: items.map(it => ({ 
            product_id: it.productId, 
            qty: toNum(it.qty), 
            unit_price: toNum(it.price),
            serials: it.serials 
        }))
    };

    try {
        btnSave.disabled = true;
        const res = await fetchJson(`${API_BASE}/orders`, { method: "POST", body: JSON.stringify(payload) });
        const newId = res.id || (res.data && res.data.id);
        window.location.href = `./pedido_detalle.html?id=${newId}`;
    } catch (err) {
        btnSave.disabled = false;
        openAlert({ title: "Error", message: err.message });
    }
}

async function init() {
    const serialContainer = document.getElementById("serial-input-container");
    if (serialContainer) {
        serialContainer.style.display = isPhoneStore ? "block" : "none";
    }

    try {
        await Promise.all([loadSystemRate(), loadClients(), loadProducts()]);
        fillClients();
        fillProducts();
    } catch (err) { console.error(err); }

    btnRateUsd.onclick = () => { selectedCurrency = "USD"; btnRateUsd.classList.add("active"); btnRateEur.classList.remove("active"); refreshSummary(); };
    btnRateEur.onclick = () => { selectedCurrency = "EUR"; btnRateEur.classList.add("active"); btnRateUsd.classList.remove("active"); refreshSummary(); };

    selProduct.onchange = updateItemPricePreview;
    selClient.onchange = () => { updateItemPricePreview(); refreshSummary(); };
    selTerms.onchange = updateAutoResult;
    inputDiscount.oninput = refreshSummary;
    selMode.onchange = () => {
        const mode = resolvePriceType();
        items.forEach(it => {
            const p = products.find(prod => prod.id === it.productId);
            if (p) it.price = mode === "MAYORISTA" ? p.priceMayor : p.priceRetail;
        });
        renderItems(); refreshSummary(); updateItemPricePreview();
    };

    btnAdd.onclick = (e) => { e.preventDefault(); addItem(); };
    btnSave.onclick = (e) => { e.preventDefault(); saveDraft(); };
    
    updateAutoResult(); 
    renderItems();
    refreshSummary();
}

document.addEventListener("DOMContentLoaded", init);