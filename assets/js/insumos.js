// frontend/assets/js/insumos.js

// ---------------- API & CONFIG ----------------
const API_SUPPLIES = `${API_BASE}/supplies`;
const API_SUPPLIERS = `${API_BASE}/suppliers`;
const API_CATEGORIES = `${API_BASE}/supply-categories`;

// ---------------- ELEMENTOS DEL DOM ----------------
const tableBody = document.querySelector("#raw-table tbody");

const btnNew = document.getElementById("btn-new-raw");
const inputSearch = document.getElementById("raw-search");
const filterCategory = document.getElementById("raw-filter-category");
const filterSupplier = document.getElementById("raw-filter-supplier");
const btnClear = document.getElementById("raw-clear");

// Modal Principal (Insumos)
const modal = document.getElementById("raw-modal");
const modalTitle = document.getElementById("raw-modal-title");
const form = document.getElementById("raw-form");

const inputId = document.getElementById("raw-id");
const inputName = document.getElementById("raw-name");
const inputCategory = document.getElementById("raw-category");
const inputSupplier = document.getElementById("raw-supplier");
const inputUnit = document.getElementById("raw-unit");

const inputCost = document.getElementById("raw-cost");
const inputStock = document.getElementById("raw-stock");
const inputMinStock = document.getElementById("raw-min-stock");

const btnCancel = document.getElementById("raw-cancel");
const btnQuickCategory = document.getElementById("btn-quick-category");

// Modal Nueva Categoría
const catModal = document.getElementById("category-modal");
const inputNewCatName = document.getElementById("new-cat-name");
const inputNewCatColor = document.getElementById("new-cat-color");
const btnCatSave = document.getElementById("btn-cat-save");
const btnCatCancel = document.getElementById("btn-cat-cancel");

// ---------------- ESTADO LOCAL ----------------
let supplies = [];
let suppliers = [];
let categories = []; 
let confirmResolver = null;

// ---------------- HELPERS LOCALES ----------------

function getCategoryBadge(categoryId, categoryName){
    const cat = categories.find(c => Number(c.id) === Number(categoryId));
    const color = cat ? cat.color : "#64748b"; 
    const name = categoryName || (cat ? cat.name : "Sin Categoría");
    
    return `<span class="badge" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">${name}</span>`;
}

function supplierNameById(id){
    const s = suppliers.find(x => Number(x.id) === Number(id));
    return s ? (s.nombre || s.name || "-") : "-";
}

function isLowStock(item){
    const stockActual = Number(item.stock ?? 0);
    const min = Number(item.min_stock ?? item.minStock ?? 0);
    if(min <= 0) return false;
    return stockActual <= min;
}

// ---------------- MODALES REUTILIZABLES ----------------
function openConfirm({ title="Confirmar", message="¿Estás segura?", okText="Sí", okVariant="danger" } = {}){
    const titleEl = document.getElementById("confirm-title");
    const msgEl = document.getElementById("confirm-message");
    if(!titleEl || !msgEl) return Promise.resolve(window.confirm(message));

    titleEl.textContent = title;
    msgEl.textContent = message;
    const btn = document.getElementById("confirm-ok");
    btn.textContent = okText;
    btn.className = `btn-${okVariant}`;
    
    const cModal = document.getElementById("confirm-modal");
    cModal.classList.remove("hidden");
    cModal.style.zIndex = "3000"; 
    
    return new Promise(resolve => { confirmResolver = resolve; });
}

function closeConfirm(){ document.getElementById("confirm-modal").classList.add("hidden"); }

document.getElementById("confirm-ok")?.addEventListener("click", ()=>{ confirmResolver?.(true); closeConfirm(); });
document.getElementById("confirm-cancel")?.addEventListener("click", ()=>{ confirmResolver?.(false); closeConfirm(); });

function openAlert({ title="Aviso", message="" } = {}){
    const titleEl = document.getElementById("alert-title");
    const msgEl = document.getElementById("alert-message");
    if(!titleEl) return window.alert(message);

    titleEl.textContent = title;
    msgEl.textContent = message;
    const aModal = document.getElementById("alert-modal");
    aModal.classList.remove("hidden");
    aModal.style.zIndex = "4000";
}
document.getElementById("alert-ok")?.addEventListener("click", () => document.getElementById("alert-modal").classList.add("hidden"));

function openModal(){ 
    modal?.classList.remove("hidden"); 
    modal.style.zIndex = "1000";
}
function closeModal(){ modal?.classList.add("hidden"); }

// ---------------- CARGA DE DATOS ----------------
async function loadSuppliers(){
    const json = await apiFetch(API_SUPPLIERS);
    suppliers = json.data || [];
    fillSupplierSelects();
}

async function loadCategories(){
    const json = await apiFetch(API_CATEGORIES);
    categories = json.data || [];
    fillCategorySelects();
}

async function loadSupplies(){
    const json = await apiFetch(API_SUPPLIES);
    supplies = json.data || [];
    renderTable(); 
}

function fillSupplierSelects(){
    if(!inputSupplier || !filterSupplier) return;
    inputSupplier.innerHTML = `<option value="">Selecciona proveedor...</option>`;
    filterSupplier.innerHTML = `<option value="">Todos los proveedores</option>`;
    
    suppliers.forEach(s => {
        const name = s.nombre || s.name || `Proveedor #${s.id}`;
        const opt1 = document.createElement("option");
        opt1.value = s.id; opt1.textContent = name;
        inputSupplier.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = s.id; opt2.textContent = name;
        filterSupplier.appendChild(opt2);
    });
}

function fillCategorySelects(){
    if(!inputCategory || !filterCategory) return;
    inputCategory.innerHTML = `<option value="">Selecciona categoría...</option>`;
    filterCategory.innerHTML = `<option value="">Todas las categorías</option>`;
    
    categories.forEach(c => {
        const opt1 = document.createElement("option");
        opt1.value = c.id; opt1.textContent = c.name;
        inputCategory.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = c.id; opt2.textContent = c.name;
        filterCategory.appendChild(opt2);
    });
}

// ---------------- RENDERIZADO ----------------
function renderTable(){
    if(!tableBody) return;
    tableBody.innerHTML = "";

    const getVal = (el) => el?.value ? el.value.toString().trim().toLowerCase() : "";
    const q = getVal(inputSearch);
    const catFilter = getVal(filterCategory);
    const supFilter = getVal(filterSupplier);

    const filtered = supplies.filter(r => {
        const name = (r.nombre ?? r.name ?? "").toString().toLowerCase();
        const categoryId = String(r.category_id ?? r.categoria_id ?? "");
        const supplierId = String(r.proveedor_id ?? r.supplier_id ?? "");
        // Nueva lógica: permitir buscar por el número formateado (ej: 0005)
        const sNum = (r.supply_number ?? r.id ?? "").toString();

        const matchQ = !q || name.includes(q) || sNum.includes(q);
        const matchC = !catFilter || categoryId === catFilter;
        const matchS = !supFilter || supplierId === supFilter;
        return matchQ && matchC && matchS;
    });

    if(filtered.length === 0){
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align:center; color:#64748b;">No hay insumos.</td></tr>`;
        return;
    }

    filtered.forEach(r => {
        const low = isLowStock(r);
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        // Formatear el número correlativo (000X)
        const displayNum = r.supply_number 
            ? String(r.supply_number).padStart(4, '0') 
            : String(r.id).padStart(4, '0');

        tr.innerHTML = `
            <td style="padding:15px; font-weight:700; color:#94a3b8;">#${displayNum}</td>
            <td style="padding:15px; font-weight:600; color:#1e293b;">${r.nombre ?? r.name}</td>
            <td style="padding:15px;">${getCategoryBadge(r.category_id ?? r.categoria_id, r.categoria_nombre ?? r.category_name)}</td>
            <td style="padding:15px;">${supplierNameById(r.proveedor_id ?? r.supplier_id)}</td>
            <td style="padding:15px; font-weight:600; color:#475569;">$${money(r.costo ?? r.cost)}</td>
            <td style="padding:15px;">
                <span class="badge ${low ? 'badge-stock-low' : 'badge-stock-ok'}" style="font-size:0.85rem; padding: 4px 10px; border-radius:8px;">
                    ${low ? '<i class="bi bi-exclamation-triangle-fill"></i>' : ''} 
${ (r.unidad?.toUpperCase() === 'UNIDAD' || r.unidad?.toUpperCase() === 'PZA') 
    ? Math.floor(r.stock ?? 0) 
    : money(r.stock ?? 0) 
} ${(r.unidad ?? r.unit ?? "").toLowerCase()}
                </span>
            </td>
            <td style="padding:15px;">
                <div class="table-actions" style="display:flex; gap:8px; justify-content:center;">
                    <button class="btn-icon btn-edit" data-id="${r.id}"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn-icon btn-del" data-id="${r.id}"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll(".btn-edit").forEach(btn => {
        btn.onclick = () => onEdit(btn.dataset.id);
    });
    tableBody.querySelectorAll(".btn-del").forEach(btn => {
        btn.onclick = () => onDelete(btn.dataset.id);
    });
}

// ---------------- FORMULARIO ----------------
async function onSubmit(e){
    e.preventDefault();
    
    if(!inputName.value || !inputCategory.value || !inputSupplier.value){
        openAlert({ title:"Atención", message:"Nombre, Categoría y Proveedor son obligatorios." });
        return;
    }

    const id = inputId.value ? Number(inputId.value) : null;
    const payload = {
        nombre: inputName.value.trim(),
        categoria_id: Number(inputCategory.value),
        proveedor_id: Number(inputSupplier.value),
        unidad: inputUnit.value.trim(),
        costo: Number(inputCost.value) || 0,
        stock: Number(inputStock.value) || 0,
        min_stock: Number(inputMinStock.value) || 0
    };

    try {
        if(!id){
            await apiFetch(API_SUPPLIES, { method:"POST", body: JSON.stringify(payload) });
        } else {
            const ok = await openConfirm({ title: "Actualizar", message: "¿Guardar cambios?", okText: "Guardar", okVariant: "primary" });
            if(!ok) return;
            await apiFetch(`${API_SUPPLIES}/${id}`, { method:"PUT", body: JSON.stringify(payload) });
        }
        await loadSupplies();
        closeModal();
    } catch(err){
        openAlert({ title:"Error", message: err.message });
    }
}

function onEdit(id){
    const r = supplies.find(x => Number(x.id) === Number(id));
    if(!r) return;
    modalTitle.textContent = "Editar Insumo";
    inputId.value = r.id;
    inputName.value = r.nombre ?? r.name ?? "";
    inputCategory.value = r.category_id ?? r.categoria_id ?? "";
    inputSupplier.value = r.proveedor_id ?? r.supplier_id ?? "";
    inputUnit.value = r.unidad ?? r.unit ?? "ML";
    inputCost.value = r.costo ?? r.cost ?? 0;
    inputStock.value = r.stock ?? 0;
    inputMinStock.value = r.min_stock ?? r.minStock ?? 0;
    openModal();
}

async function onDelete(id){
    const ok = await openConfirm({ title: "Eliminar", message: "¿Borrar este insumo?", okText: "Eliminar", okVariant: "danger" });
    if(!ok) return;
    try {
        await apiFetch(`${API_SUPPLIES}/${id}`, { method:"DELETE" });
        await loadSupplies();
    } catch(err){
        openAlert({ title:"Error", message: err.message });
    }
}

// ---------------- CATEGORÍA RÁPIDA ----------------
async function saveQuickCategory() {
    const name = inputNewCatName.value.trim();
    const color = inputNewCatColor.value;
    if (!name) return openAlert({ message: "Escribe un nombre." });

    try {
        const res = await apiFetch(API_CATEGORIES, {
            method: "POST",
            body: JSON.stringify({ name, color })
        });
        await loadCategories(); 
        inputCategory.value = res.data.id; 
        catModal.classList.add("hidden");
    } catch (err) { openAlert({ message: err.message }); }
}

// ---------------- INICIALIZACIÓN ----------------
async function init(){
    try {
        await Promise.all([loadSuppliers(), loadCategories()]);
        await loadSupplies();
    } catch(err){ console.error(err); }

    btnNew?.addEventListener("click", ()=>{ 
        form.reset(); 
        inputId.value = ""; 
        modalTitle.textContent = "Nuevo Insumo";
        openModal(); 
    });
    btnCancel?.addEventListener("click", closeModal);
    btnQuickCategory?.addEventListener("click", () => {
        inputNewCatName.value = "";
        catModal.classList.remove("hidden");
        catModal.style.zIndex = "2000";
    });
    btnCatSave?.addEventListener("click", saveQuickCategory);
    btnCatCancel?.addEventListener("click", () => catModal.classList.add("hidden"));
    form?.addEventListener("submit", onSubmit);
    inputSearch?.addEventListener("input", renderTable);
    filterCategory?.addEventListener("change", renderTable);
    filterSupplier?.addEventListener("change", renderTable);
    btnClear?.addEventListener("click", ()=>{
        inputSearch.value = "";
        filterCategory.value = "";
        filterSupplier.value = "";
        renderTable();
    });
}

document.addEventListener("DOMContentLoaded", init);