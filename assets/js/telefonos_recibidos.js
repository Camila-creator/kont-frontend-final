// ---------------- API ----------------
const API_RECEIVED = `${API_BASE}/received-phones`; 
const API_PRODUCTS = `${API_BASE}/products`;
const API_SUPPLIES = `${API_BASE}/supplies`;

// ---------------- ELEMENTOS ----------------
const tableBody = document.querySelector("#received-table tbody");
const searchInput = document.getElementById("search-received");

const modal = document.getElementById("process-modal");
const form = document.getElementById("process-form");

const inputId = document.getElementById("receive-id");
const inputName = document.getElementById("proc-name");
const inputImei = document.getElementById("proc-imei");
const inputDestination = document.getElementById("proc-destination");
const inputCategory = document.getElementById("proc-category");
const inputCost = document.getElementById("proc-cost");
const inputPrice = document.getElementById("proc-price");
const priceGroup = document.getElementById("price-group");

const btnCancel = document.getElementById("btn-process-cancel");

// ---------------- ESTADO ----------------
let receivedItems = [];

// ---------------- HELPERS (Sin redeclarar money para evitar errores) ----------------
function safeText(v) { return (v ?? "").toString().trim(); }
function parseNumber(v) { const num = Number(v); return Number.isNaN(num) ? 0 : num; }

// ---------------- API FETCH ----------------
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, {
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}`, 
            ...(options.headers || {}) 
        },
        ...options,
    });
    
    let data = null;
    try { data = await res.json(); } catch {}
    
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("agromedic_token");
        window.location.replace("../pages/login.html");
        return;
    }

    if (!res.ok) throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`);
    return data;
}

// ---------------- LOADERS ----------------
async function loadReceivedItems() {
    try {
        // Ajustado a la ruta que definimos en el backend
        const json = await apiFetch(`${API_RECEIVED}`); 
        receivedItems = json.data || [];
        renderTable(searchInput?.value || "");
    } catch (err) {
        if (typeof openAlert === 'function') {
            openAlert({ title: "Error de Conexión", message: err.message });
        }
    }
}

// ---------------- RENDER TABLE ----------------
function renderTable(filterText = "") {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const term = filterText.toLowerCase();
    const filtered = receivedItems.filter(item => {
        const mod = safeText(item.model_description).toLowerCase();
        const cli = safeText(item.customer_name).toLowerCase();
        // Agregamos el número de orden a la búsqueda
        const ord = safeText(item.order_number).toLowerCase(); 
        return mod.includes(term) || cli.includes(term) || ord.includes(term);
    });

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center; color:#64748b;">No hay equipos pendientes.</td></tr>`;
        return;
    }

    filtered.forEach((item) => {
        const tr = document.createElement("tr");
        
        // Formateamos el número para que siempre tenga 4 dígitos (ej: 50 -> #0050)
        const displayOrder = item.order_number 
            ? String(item.order_number).padStart(4, '0') 
            : '---';

        tr.innerHTML = `
            <td style="padding:15px; color:#64748b;">${new Date(item.created_at).toLocaleDateString()}</td>
            <td style="padding:15px; font-weight:700; color:#475569;">#${displayOrder}</td>
            <td style="padding:15px;">${safeText(item.customer_name)}</td>
            <td style="padding:15px; font-weight:600;">${safeText(item.model_description)}</td>
            <td style="padding:15px; font-weight:700; color:#10b981;">$ ${money(item.amount || item.credit_amount)}</td>
            <td style="padding:15px; text-align:center;">
                <button class="btn-primary btn-process" data-id="${item.id}" style="padding:6px 12px; font-size:0.8rem; background:#10b981; border:none; border-radius:4px; color:white; cursor:pointer;">
                    <i class="bi bi-box-arrow-in-down"></i> Procesar
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll(".btn-process").forEach(b => {
        b.onclick = () => onOpenProcess(b.dataset.id);
    });
}

// ---------------- MODAL ----------------
function onOpenProcess(id) {
    const item = receivedItems.find(x => Number(x.id) === Number(id));
    if (!item) return;

    form.reset();
    inputId.value = item.id;
    inputName.value = item.model_description;
    inputCost.value = item.amount || item.credit_amount;
    
    priceGroup?.classList.remove("hidden");
    if(inputPrice) inputPrice.required = true;

    modal?.classList.remove("hidden");
}

async function onSubmit(e) {
    e.preventDefault();
    const destination = inputDestination.value;

    const payload = {
        id: Number(inputId.value),
        name: safeText(inputName.value),
        imei: safeText(inputImei.value),
        destination: destination,
        category: safeText(inputCategory.value),
        cost: parseNumber(inputCost.value),
        price: destination === 'PRODUCTO' ? parseNumber(inputPrice.value) : 0
    };

    try {
        const ok = await openConfirm({ 
            title: "Ingresar a Inventario", 
            message: `¿Confirmas el ingreso de este equipo como ${destination}?`, 
            okText: "Confirmar Ingreso"
        });

        if (!ok) return;

        await apiFetch(`${API_RECEIVED}/process`, { 
            method: "POST", 
            body: JSON.stringify(payload) 
        });

        openAlert({ title: "Éxito", message: "El equipo ha sido ingresado correctamente." });
        modal?.classList.add("hidden");
        await loadReceivedItems();
    } catch (err) {
        openAlert({ title: "Error", message: err.message });
    }
}

// ---------------- EVENTOS ----------------
inputDestination?.addEventListener("change", (e) => {
    if (e.target.value === "INSUMO") {
        priceGroup?.classList.add("hidden");
        if(inputPrice) {
            inputPrice.required = false;
            inputPrice.value = "0";
        }
    } else {
        priceGroup?.classList.remove("hidden");
        if(inputPrice) inputPrice.required = true;
    }
});

// ✅ CORRECCIÓN DE LA LÍNEA 174
if (btnCancel) {
    btnCancel.onclick = () => modal?.classList.add("hidden");
}

async function init() {
    await loadReceivedItems();
    form?.addEventListener("submit", onSubmit);
    searchInput?.addEventListener("input", (e) => renderTable(e.target.value));
}

document.addEventListener("DOMContentLoaded", init);