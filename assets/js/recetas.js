// frontend/assets/js/recetas.js

const API_PRODUCTS = `${API_BASE}/products`;
const API_SUPPLIERS = `${API_BASE}/supplies`;
const API_RECIPES = `${API_BASE}/recipes`;

// ---------------- UI ELEMENTS ----------------
const tableBody = document.querySelector("#recipes-table tbody");
const inputSearch = document.getElementById("recipes-search");
const btnClear = document.getElementById("recipes-clear");
const btnNew = document.getElementById("btn-new-recipe");

// modal
const modal = document.getElementById("recipe-modal");
const modalTitle = document.getElementById("recipe-modal-title");
const form = document.getElementById("recipe-form");

const inputProductId = document.getElementById("recipe-product-id");
const selProduct = document.getElementById("recipe-product");
const inputWaste = document.getElementById("recipe-waste");

const selRaw = document.getElementById("recipe-raw");
const inputRawQty = document.getElementById("recipe-raw-qty");
const btnAddRaw = document.getElementById("btn-add-raw");
const itemsTbody = document.querySelector("#recipe-items-table tbody");
const btnCancel = document.getElementById("recipe-cancel");

// state
let products = [];
let supplies = [];
let recipesByProductId = new Map(); 
let draftItems = []; 

// ---------------- HELPERS ----------------
function safeText(v){ return (v ?? "").toString().trim(); }
function toNum(v){ const n = Number(v); return Number.isNaN(n) ? 0 : n; }
function toInt(v){ const n = Number.parseInt(v,10); return Number.isNaN(n) ? 0 : n; }

// ---------------- API FETCH (Con Seguridad SaaS) ----------------
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

// ---------------- MODALES REUTILIZABLES ----------------
let confirmResolver = null;
function openConfirm({ title="Confirmar", message="¿Estás segura?", okText="Sí", okVariant="danger" } = {}){
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-message").textContent = message;
  const btn = document.getElementById("confirm-ok");
  btn.textContent = okText;
  btn.className = `btn-${okVariant}`;
  document.getElementById("confirm-modal").classList.remove("hidden");
  return new Promise(resolve => { confirmResolver = resolve; });
}
function closeConfirm(){ document.getElementById("confirm-modal").classList.add("hidden"); }
document.getElementById("confirm-ok")?.addEventListener("click", ()=>{ confirmResolver?.(true); closeConfirm(); });
document.getElementById("confirm-cancel")?.addEventListener("click", ()=>{ confirmResolver?.(false); closeConfirm(); });

function openAlert({ title="Aviso", message="" } = {}){
  document.getElementById("alert-title").textContent = title;
  document.getElementById("alert-message").textContent = message;
  document.getElementById("alert-modal").classList.remove("hidden");
}
document.getElementById("alert-ok")?.addEventListener("click", () => document.getElementById("alert-modal").classList.add("hidden"));

function openModal(){ modal?.classList.remove("hidden"); }
function closeModal(){ 
    modal?.classList.add("hidden"); 
    // Limpiamos el ID de la URL para que no se reabra al recargar
    window.history.replaceState({}, document.title, window.location.pathname);
}

// ---------------- LOADERS ----------------
async function loadProducts(){
  const json = await apiFetch(API_PRODUCTS);
  products = json.data || [];
}
async function loadSupplies(){
  const json = await apiFetch(API_SUPPLIERS);
  supplies = json.data || [];
}
async function loadRecipesForAllProducts(){
  recipesByProductId = new Map();
  for (const p of products) {
    try {
      const json = await apiFetch(`${API_RECIPES}/${p.id}`);
      if (json.data) recipesByProductId.set(Number(p.id), json.data);
    } catch { /* si no existe receta, lo ignoramos */ }
  }
}

function fillProductsSelect(){
  selProduct.innerHTML = `<option value="">Selecciona producto...</option>`;
  products.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p.id; opt.textContent = p.nombre ?? p.name ?? `Producto #${p.id}`;
    selProduct.appendChild(opt);
  });
}

function fillSuppliesSelect(){
  selRaw.innerHTML = `<option value="">Selecciona insumo...</option>`;
  if(!supplies.length){
    selRaw.innerHTML = `<option value="">No hay insumos aún</option>`;
    return;
  }
  supplies.forEach(s=>{
    const opt = document.createElement("option");
    opt.value = s.id; opt.textContent = `${(s.nombre ?? s.name)} (${(s.unidad ?? s.unit) || "-"})`;
    selRaw.appendChild(opt);
  });
}

function supplyById(id){
  return supplies.find(x=>Number(x.id)===Number(id)) || null;
}

// ---------------- LÓGICA DE FÓRMULAS (DRAFT) ----------------
function resetForm(){
  modalTitle.textContent = "Nueva Fórmula";
  inputProductId.value = "";
  selProduct.value = "";
  selProduct.disabled = false; 
  inputWaste.value = "2";
  selRaw.value = "";
  inputRawQty.value = "";
  draftItems = [];
  renderDraftItems();
}

function renderDraftItems(){
  itemsTbody.innerHTML = "";

  if(draftItems.length === 0){
    itemsTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 20px;">Sin ingredientes. Añade insumos arriba.</td></tr>`;
    return;
  }

  draftItems.forEach((it, idx)=>{
    const s = supplyById(it.supplyId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 600;">${s ? (s.nombre ?? s.name) : "Insumo Desconocido"}</td>
      <td style="color:#0f766e; font-weight:800;">${it.qty}</td>
      <td style="color:#64748b; font-size:0.8rem; font-weight:bold;">${it.unit || (s?.unidad ?? s?.unit) || "-"}</td>
      <td style="text-align:center;">
        <button class="btn-icon btn-del" type="button" data-action="remove" data-idx="${idx}" title="Quitar"><i class="bi bi-x-circle"></i></button>
      </td>
    `;
    itemsTbody.appendChild(tr);
  });

  itemsTbody.querySelectorAll('button[data-action="remove"]').forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.preventDefault();
      const idx = toInt(btn.getAttribute("data-idx"));
      draftItems.splice(idx,1);
      renderDraftItems();
    });
  });
}

function addSupplyToDraft(){
  const supplyId = toInt(selRaw.value);
  const qty = toNum(inputRawQty.value);

  if(!supplyId){ openAlert({ title:"Atención", message:"Selecciona un insumo de la lista." }); return; }
  if(qty <= 0){ openAlert({ title:"Atención", message:"La cantidad debe ser mayor que cero (0)." }); return; }

  const s = supplyById(supplyId);
  const unit = (s?.unidad ?? s?.unit ?? "").toString().trim();

  const ex = draftItems.find(x=>Number(x.supplyId)===Number(supplyId));
  if(ex) ex.qty = toNum(ex.qty) + qty;
  else draftItems.push({ supplyId, qty, unit });

  selRaw.value = "";
  inputRawQty.value = "";
  renderDraftItems();
}

// ---------------- GUARDAR Y RENDERIZAR ----------------
async function saveRecipe(e){
  e.preventDefault();

  const productId = toInt(selProduct.value);
  if(!productId){ openAlert({ title:"Falta producto", message:"Selecciona a qué producto pertenece esta fórmula." }); return; }
  if(draftItems.length === 0){ openAlert({ title:"Faltan insumos", message:"La fórmula está vacía. Agrega al menos 1 insumo." }); return; }

  const waste = toNum(inputWaste.value);
  if(waste < 0){ openAlert({ title:"Merma inválida", message:"La merma no puede ser negativa." }); return; }

  const ok = await openConfirm({ title: "Guardar Fórmula", message: "¿Aplicar esta fórmula al producto?", okText: "Guardar", okVariant: "primary" });
  if(!ok) return;

  const notes = `waste=${waste}`;
  const payload = {
    product_id: productId,
    notes,
    items: draftItems.map(it => ({
      supply_id: it.supplyId,
      qty: toNum(it.qty),
      unit: safeText(it.unit) || null,
    }))
  };

  try {
    await apiFetch(API_RECIPES, { method:"PUT", body: JSON.stringify(payload) });
    await loadRecipesForAllProducts();
    renderTable();
    closeModal();
  } catch (err) { openAlert({ title:"Error", message: err.message }); }
}

function wasteFromNotes(notes){
  const t = safeText(notes);
  const m = t.match(/waste\s*=\s*([0-9.]+)/i);
  return m ? toNum(m[1]) : 0;
}

async function editRecipe(productId){
  resetForm();
  modalTitle.textContent = "Gestionar Fórmula";
  selProduct.value = String(productId);
  selProduct.disabled = true; 

  const r = recipesByProductId.get(Number(productId)) || null;
  if (r) {
    const w = wasteFromNotes(r.notes);
    inputWaste.value = String(w);

    draftItems = (r.items || []).map(it => {
      const s = supplyById(it.supply_id);
      return { supplyId: Number(it.supply_id), qty: toNum(it.qty), unit: safeText(it.unit) || safeText(s?.unidad ?? s?.unit) || "" };
    });
  }

  renderDraftItems();
  openModal();
}

async function deleteRecipe(productId){
  const ok = await openConfirm({ title: "Eliminar Fórmula", message: "¿Borrar la receta de este producto? (El producto NO se borrará)", okText: "Eliminar", okVariant: "danger" });
  if(!ok) return;

  try {
    await apiFetch(`${API_RECIPES}/${productId}`, { method:"DELETE" });
    await loadRecipesForAllProducts();
    renderTable();
  } catch (err) { openAlert({ title:"Error", message: err.message }); }
}

function renderTable(){
  tableBody.innerHTML = "";
  const q = safeText(inputSearch.value).toLowerCase();

  const rows = products.filter(p => {
    const name = safeText(p.nombre ?? p.name).toLowerCase();
    return !q || name.includes(q);
  }).map(p=>{
    const r = recipesByProductId.get(Number(p.id)) || null;
    return {
      productId: p.id,
      productName: safeText(p.nombre ?? p.name),
      count: r?.items?.length || 0,
      waste: r ? `${wasteFromNotes(r.notes)}%` : "-",
      has: !!r
    };
  });

  if(rows.length === 0){
    tableBody.innerHTML = `<tr><td colspan="5" style="padding:20px; text-align:center; color:#64748b;">No se encontraron productos o fórmulas.</td></tr>`;
    return;
  }

  rows.forEach(row=>{
    const statusBadge = row.has 
      ? `<span class="badge badge-ok"><i class="bi bi-check-circle-fill"></i> Lista</span>` 
      : `<span class="badge badge-missing" title="El producto no se puede fabricar sin receta"><i class="bi bi-exclamation-circle-fill"></i> Faltante</span>`;

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.innerHTML = `
      <td style="padding:15px; font-weight:600; color:#1e293b;">${row.productName}</td>
      <td style="padding:15px; text-align:center;">
        <span class="badge badge-info">${row.count} insumos</span>
      </td>
      <td style="padding:15px; text-align:center; font-weight:700; color:#64748b;">${row.waste}</td>
      <td style="padding:15px;">${statusBadge}</td>
      <td style="padding:15px;">
        <div class="table-actions">
          <button class="btn-icon btn-edit" data-action="edit" data-id="${row.productId}" title="Editar Fórmula"><i class="bi bi-pencil-square"></i></button>
          <button class="btn-icon btn-del" data-action="delete" data-id="${row.productId}" title="Eliminar Fórmula"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  tableBody.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const action = btn.getAttribute("data-action");
      const pid = toInt(btn.getAttribute("data-id"));
      if(action==="edit") editRecipe(pid);
      if(action==="delete") deleteRecipe(pid);
    });
  });
}

// ---------------- INICIO ----------------
async function init(){
  try {
    await loadProducts();
    await loadSupplies();
    await loadRecipesForAllProducts();

    fillProductsSelect();
    fillSuppliesSelect();
    renderTable();

    // --- LÓGICA DE SALTO DESDE PRODUCTOS ---
    const urlParams = new URLSearchParams(window.location.search);
    const productIdFromUrl = urlParams.get('product_id');
    if (productIdFromUrl) {
        editRecipe(productIdFromUrl);
    }

  } catch (err) { openAlert({ title:"No pude conectar", message: err.message }); }

  inputSearch?.addEventListener("input", renderTable);
  btnClear?.addEventListener("click", ()=>{ inputSearch.value=""; renderTable(); });

  btnNew?.addEventListener("click", ()=>{
    resetForm();
    fillProductsSelect();
    fillSuppliesSelect();
    openModal();
  });

  btnAddRaw?.addEventListener("click", addSupplyToDraft);
  btnCancel?.addEventListener("click", closeModal);
  form?.addEventListener("submit", saveRecipe);
}

document.addEventListener("DOMContentLoaded", init);