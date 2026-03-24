// ---------------- API & CONFIG ----------------
const API_PRODUCTS = `${API_BASE}/products`;
const API_SUPPLIERS = `${API_BASE}/suppliers`;

// ---------------- ELEMENTOS DEL DOM ----------------
const tableBody = document.querySelector("#products-table tbody");
const btnNew = document.getElementById("btn-new-product");
const searchInput = document.getElementById("search-product");

const modal = document.getElementById("product-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("product-form");

const inputId = document.getElementById("product-id");
const inputName = document.getElementById("product-name");
const inputCategory = document.getElementById("product-category"); 
const inputSupplier = document.getElementById("product-supplier");
const inputUnit = document.getElementById("product-unit");

// Lógica de Kit
const chkIsKit = document.getElementById("product-is-kit");

// Precios y Stock
const inputCost = document.getElementById("product-cost"); 
const inputRetail = document.getElementById("product-price-retail");
const inputMayor = document.getElementById("product-price-mayor");
const inputStock = document.getElementById("product-stock");
const inputMinStock = document.getElementById("product-min-stock");

// Lógica de Vencimiento
const chkHasExpiry = document.getElementById("product-has-expiry");
const expiryWrap = document.getElementById("expiry-wrap");
const inputExpiryDate = document.getElementById("product-expiry-date");

const btnCancel = document.getElementById("btn-cancel");
const linkViewRecipe = document.getElementById("view-recipe-link");

// ---------------- ESTADO LOCAL ----------------
let products = [];
let suppliers = [];

// ---------------- HELPERS DE FORMATEO ----------------
function safeText(v) { return (v ?? "").toString().trim(); }
function parseNumber(v) { const num = Number(v); return Number.isNaN(num) ? 0 : num; }

function getCategoryBadge(category) {
    const cat = safeText(category);
    if (!cat) return `<span class="badge" style="background:#f1f5f9; color:#475569;">Sin categoría</span>`;
    return `<span class="badge" style="background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-transform: capitalize;">${cat}</span>`;
}

function supplierNameById(id) {
    const s = suppliers.find((x) => Number(x.id) === Number(id));
    return s ? (s.nombre || s.name || "-") : "-";
}

// ---------------- CARGA DE DATOS ----------------
async function loadSuppliers() {
    const json = await apiFetch(API_SUPPLIERS);
    suppliers = json.data || [];
    fillSuppliersSelect();
}

async function loadProducts() {
    const json = await apiFetch(API_PRODUCTS);
    products = json.data || [];
    updateCategoryDatalist();
}

function fillSuppliersSelect() {
    if (!inputSupplier) return;
    inputSupplier.innerHTML = `<option value="">Selecciona proveedor...</option>`;
    suppliers.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nombre || s.name || `Proveedor #${s.id}`;
        inputSupplier.appendChild(opt);
    });
}

function updateCategoryDatalist() {
    const datalist = document.getElementById("category-list");
    if (!datalist) return;
    datalist.innerHTML = ""; 
    const uniqueCats = [...new Set(products.map(p => safeText(p.category ?? p.categoria)))].filter(c => c !== "");
    uniqueCats.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        datalist.appendChild(opt);
    });
}

// ---------------- RENTABILIDAD Y ROI ----------------
function calcularRentabilidad() {
    const costoReceta = parseNumber(inputCost.dataset.calculatedCost);
    const costoManual = parseNumber(inputCost.value);
    
    // El costo efectivo depende de si es kit o tiene receta calculada
    const costoEfectivo = (chkIsKit && chkIsKit.checked) || costoReceta > 0 ? (costoReceta || costoManual) : costoManual;
    const retail = parseNumber(inputRetail.value);
    
    let alertDiv = document.getElementById("rentabilidad-alert");
    if (!alertDiv) {
        alertDiv = document.createElement("div");
        alertDiv.id = "rentabilidad-alert";
        alertDiv.className = "col-span-full mt-2 transition-all";
        form.insertBefore(alertDiv, form.querySelector('.modal-actions'));
    }

    if (costoEfectivo <= 0 || retail <= 0) { alertDiv.innerHTML = ""; return; }

    const ganancia = retail - costoEfectivo;
    const margenPorc = (ganancia / costoEfectivo) * 100;

    if (retail < costoEfectivo) {
        inputRetail.style.borderColor = "#ef4444";
        alertDiv.innerHTML = `<div class="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold animate-pulse">
            <i class="bi bi-x-circle-fill"></i> ¡PÉRDIDA! El costo ($${costoEfectivo.toFixed(2)}) supera al precio.
        </div>`;
    } else if (margenPorc < 50) {
        inputRetail.style.borderColor = "#f59e0b";
        alertDiv.innerHTML = `<div class="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs">
            <b>⚠️ Margen bajo (${margenPorc.toFixed(1)}%).</b> Ganancia: $${ganancia.toFixed(2)}. <br>
            Sugerido para 50%: <b>$${(costoEfectivo * 1.5).toFixed(2)}</b>
        </div>`;
    } else {
        inputRetail.style.borderColor = "#10b981";
        const isPremium = margenPorc >= 100;
        alertDiv.innerHTML = `<div class="p-3 ${isPremium ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} border rounded-xl text-xs">
            <i class="bi bi-check-circle-fill"></i> <b>Margen ${isPremium ? 'Premium' : 'Saludable'} (${margenPorc.toFixed(1)}%).</b> Ganancia: $${ganancia.toFixed(2)}.
        </div>`;
    }
}

// ---------------- LÓGICA DE FORMULARIO ----------------
function handleKitSwitch() {
    const isKit = chkIsKit.checked;
    if (isKit) {
        inputCost.readOnly = true;
        inputCost.classList.add("bg-slate-50");
    } else {
        const costoReceta = parseNumber(inputCost.dataset.calculatedCost);
        if (costoReceta === 0) {
            inputCost.readOnly = false;
            inputCost.classList.remove("bg-slate-50");
        }
    }
    calcularRentabilidad();
}

function resetFormForCreate() {
    modalTitle.textContent = "Nuevo Producto";
    form.reset();
    inputId.value = "";
    inputCost.dataset.calculatedCost = "0";
    inputCost.readOnly = false;
    inputCost.classList.remove("bg-slate-50");
    linkViewRecipe?.classList.add("hidden");
    if(chkIsKit) chkIsKit.checked = false;
    expiryWrap?.classList.add("hidden");
    if (document.getElementById("rentabilidad-alert")) document.getElementById("rentabilidad-alert").innerHTML = "";
}

function fillFormForEdit(p) {
    modalTitle.textContent = "Editar Producto";
    inputId.value = p.id;
    inputName.value = p.nombre ?? p.name ?? "";
    inputCategory.value = p.category ?? p.categoria ?? "";
    inputSupplier.value = p.supplier_id ?? p.proveedor_id ?? "";
    inputUnit.value = p.unit ?? p.unidad ?? "UNIDAD";

    const costoReceta = parseNumber(p.costo_real_insumos); 
    inputCost.dataset.calculatedCost = costoReceta;

    const isKit = !!(p.is_kit || costoReceta > 0);
    if(chkIsKit) chkIsKit.checked = isKit;

    if (isKit || costoReceta > 0) {
        inputCost.value = (costoReceta || p.buy_cost || 0).toFixed(2);
        inputCost.readOnly = true;
        inputCost.classList.add("bg-slate-50");
        linkViewRecipe?.classList.remove("hidden");
    } else {
        inputCost.value = p.buy_cost ?? p.costo_compra ?? 0;
        inputCost.readOnly = false;
        inputCost.classList.remove("bg-slate-50");
        linkViewRecipe?.classList.add("hidden");
    }

    inputRetail.value = p.retail_price ?? p.precio_retail ?? 0;
    inputMayor.value = p.mayor_price ?? p.precio_mayor ?? 0;
    inputStock.value = p.stock ?? 0;
    inputMinStock.value = p.min_stock ?? 5;

    chkHasExpiry.checked = !!(p.has_expiry);
    if (p.expiry_date) inputExpiryDate.value = String(p.expiry_date).slice(0, 10);
    
    expiryWrap?.classList.toggle("hidden", !chkHasExpiry.checked);
    calcularRentabilidad();
}

// ---------------- CRUD PRINCIPAL ----------------
async function onSubmit(e) {
    e.preventDefault();
    
    const costo = parseNumber(inputCost.dataset.calculatedCost) || parseNumber(inputCost.value);
    const retail = parseNumber(inputRetail.value);
    
    if (!chkIsKit.checked && retail < costo && retail > 0) {
        openAlert({ title: "Error de Precio", message: "No puedes establecer un precio menor al costo de adquisición." });
        return;
    }

    const payload = {
        name: safeText(inputName.value),
        category: safeText(inputCategory.value),
        supplier_id: Number(inputSupplier.value),
        unit: safeText(inputUnit.value),
        buy_cost: parseNumber(inputCost.value),
        retail_price: retail,
        mayor_price: parseNumber(inputMayor.value),
        stock: parseNumber(inputStock.value),
        min_stock: parseNumber(inputMinStock.value),
        has_expiry: chkHasExpiry.checked,
        expiry_date: chkHasExpiry.checked && inputExpiryDate.value ? inputExpiryDate.value : null,
        is_kit: chkIsKit.checked
    };

    try {
        const id = inputId.value;
        if (!id) {
            const res = await apiFetch(API_PRODUCTS, { method: "POST", body: JSON.stringify(payload) });
            if (chkIsKit.checked && res.data?.id) {
                const go = await openConfirm({ title: "Producto Creado", message: "¿Deseas ir ahora a configurar la receta/insumos de este kit?", okText: "Ir a Receta", okVariant: "primary" });
                if (go) return window.location.href = `recetas.html?product_id=${res.data.id}`;
            }
        } else {
            const ok = await openConfirm({ title: "Actualizar", message: "¿Guardar cambios en este producto?", okText: "Guardar", okVariant: "primary" });
            if (!ok) return;
            await apiFetch(`${API_PRODUCTS}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        }
        await loadProducts();
        renderTable();
        modal.classList.add("hidden");
    } catch (err) { openAlert({ title: "Error", message: err.message }); }
}

// ---------------- RENDERIZADO DE TABLA (MODIFICADO PARA PRODUCT_NUMBER) ----------------
function renderTable(filterText = "") {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const term = filterText.toLowerCase();
    const filtered = products.filter(p => {
        const nom = safeText(p.nombre ?? p.name).toLowerCase();
        const cat = safeText(p.category ?? p.categoria).toLowerCase();
        const pNum = String(p.product_number || "").toLowerCase();
        
        return nom.includes(term) || cat.includes(term) || pNum.includes(term);
    });

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="9" style="padding:20px; text-align:center; color:#64748b;">No se encontraron productos.</td></tr>`;
        return;
    }

    filtered.forEach((p) => {
        const currentStock = parseNumber(p.stock ?? 0);
        const minStock = parseNumber(p.min_stock ?? 0);
        const isLow = minStock > 0 && currentStock <= minStock;

        // Mostramos el product_number amigable, si no existe usamos el id
        const displayId = p.product_number ? p.product_number : p.id;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="padding:15px; font-weight:700; color:#0f766e;">#${displayId}</td>
            <td style="padding:15px; font-weight:600;">${safeText(p.nombre ?? p.name)}</td>
            <td style="padding:15px;">${getCategoryBadge(p.category ?? p.categoria)}</td>
            <td style="padding:15px;">${supplierNameById(p.supplier_id ?? p.proveedor_id)}</td>
            <td style="padding:15px; font-weight:600;">$${money(p.retail_price ?? p.precio_retail)}</td>
            <td style="padding:15px; color:#64748b;">$${money(p.mayor_price ?? p.precio_mayor)}</td>
            <td style="padding:15px;">
                <span class="badge ${isLow ? 'badge-stock-low' : 'badge-stock-ok'}">
                    ${currentStock} ${p.unit ?? 'UND'}
                </span>
            </td>
            <td style="padding:15px; font-size:0.8rem;">${p.expiry_date ? String(p.expiry_date).slice(0,10) : '-'}</td>
            <td style="padding:15px;">
                <div class="table-actions">
                    <button class="btn-icon btn-recipe" data-id="${p.id}" title="Ver Receta"><i class="bi bi-list-check"></i></button>
                    <button class="btn-icon btn-edit" data-id="${p.id}" title="Editar"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn-icon btn-del" data-id="${p.id}" data-name="${p.nombre ?? p.name}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Delegación de eventos
    tableBody.querySelectorAll(".btn-recipe").forEach(b => b.onclick = () => window.location.href = `recetas.html?product_id=${b.dataset.id}`);
    tableBody.querySelectorAll(".btn-edit").forEach(b => b.onclick = () => onEdit(b.dataset.id));
    tableBody.querySelectorAll(".btn-del").forEach(b => b.onclick = () => onDelete(b.dataset.id, b.dataset.name));
}

function onEdit(id) {
    const p = products.find(x => Number(x.id) === Number(id));
    if (p) { fillFormForEdit(p); modal.classList.remove("hidden"); }
}

async function onDelete(id, name) {
    const ok = await openConfirm({ title: "Eliminar", message: `¿Borrar "${name}"?`, okText: "Eliminar", okVariant: "danger" });
    if (ok) {
        try {
            await apiFetch(`${API_PRODUCTS}/${id}`, { method: "DELETE" });
            await loadProducts();
            renderTable();
        } catch (err) { openAlert({ title: "Error", message: err.message }); }
    }
}

// ---------------- MODALES PERSONALIZADOS ----------------
let confirmResolver = null;
function openConfirm({ title, message, okText, okVariant }) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    const btn = document.getElementById("confirm-ok");
    btn.textContent = okText; 
    btn.className = `btn-${okVariant}`;
    document.getElementById("confirm-modal").classList.remove("hidden");
    return new Promise(res => confirmResolver = res);
}

document.getElementById("confirm-ok")?.addEventListener("click", () => { confirmResolver?.(true); document.getElementById("confirm-modal").classList.add("hidden"); });
document.getElementById("confirm-cancel")?.addEventListener("click", () => { confirmResolver?.(false); document.getElementById("confirm-modal").classList.add("hidden"); });

function openAlert({ title, message }) {
    document.getElementById("alert-title").textContent = title;
    document.getElementById("alert-message").textContent = message;
    document.getElementById("alert-modal").classList.remove("hidden");
}
document.getElementById("alert-ok")?.addEventListener("click", () => document.getElementById("alert-modal").classList.add("hidden"));

// ---------------- INICIALIZACIÓN ----------------
async function init() {
    try {
        await Promise.all([loadSuppliers(), loadProducts()]);
        renderTable();
    } catch (err) { openAlert({ title: "Error de Conexión", message: err.message }); }

    btnNew?.addEventListener("click", () => { resetFormForCreate(); modal.classList.remove("hidden"); });
    btnCancel?.addEventListener("click", () => modal.classList.add("hidden"));
    chkHasExpiry?.addEventListener("change", () => expiryWrap?.classList.toggle("hidden", !chkHasExpiry.checked));
    chkIsKit?.addEventListener("change", handleKitSwitch);
    form?.addEventListener("submit", onSubmit);
    searchInput?.addEventListener("input", (e) => renderTable(e.target.value));
    inputCost?.addEventListener("input", calcularRentabilidad);
    inputRetail?.addEventListener("input", calcularRentabilidad);
}

document.addEventListener("DOMContentLoaded", init);