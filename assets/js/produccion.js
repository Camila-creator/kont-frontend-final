// ---------------- CONFIGURACIÓN API ----------------
const API_PRODUCTS = `${API_BASE}/products`;
const API_PRODUCTION = `${API_BASE}/production`;

// ---------------- ELEMENTOS UI ----------------
const selProduct = document.getElementById("prod-product");
const inputQty = document.getElementById("prod-qty");
const consumptionTbody = document.querySelector("#consumption-table tbody");
const warningDiv = document.getElementById("prod-warning");
const btnRun = document.getElementById("btn-run-production");
const historyContainer = document.getElementById("history-container");

// ---------------- HELPERS ----------------
function toInt(v){ const n = Number.parseInt(v,10); return Number.isNaN(n) ? 1 : n; }
function fmtQty(n) { return Number(n).toLocaleString("es-ES", { maximumFractionDigits: 3 }); }

function fmtDate(iso){
  if(!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" }) + 
         " - " + d.toLocaleTimeString("es-ES", {hour: '2-digit', minute:'2-digit'});
}

// 🚀 LA FUNCIÓN QUE FALTABA: apiFetch
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

// ---------------- LÓGICA DE PRODUCTOS ----------------
async function loadProducts(){
  try {
    const res = await apiFetch(API_PRODUCTS);
    const products = res.data || [];
    selProduct.innerHTML = `<option value="">Selecciona un producto...</option>`;
    // Dentro de loadProducts()
products.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    // USAR .name porque así está en tu base de datos (Screenshot 2)
    opt.textContent = p.name || `Producto #${p.id}`; 
    selProduct.appendChild(opt);
});
  } catch (err) {
    console.error("Error cargando productos:", err);
  }
}

// ---------------- VISTA PREVIA DE CONSUMO ----------------
function renderPreview(preview){
  consumptionTbody.innerHTML = "";
  warningDiv.style.display = "none"; // 🚀 Escondemos el aviso de "Faltan insumos"

  if(!preview || !preview.ok){
    consumptionTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #94a3b8;">Selecciona un producto para evaluar la receta.</td></tr>`;
    btnRun.disabled = true;
    btnRun.style.opacity = "0.5";
    return;
  }

  const items = preview.items || [];
  if(items.length === 0){
    consumptionTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #ef4444;">Este producto no tiene una receta configurada.</td></tr>`;
    btnRun.disabled = true;
    return;
  }

  items.forEach(it => {
    const tr = document.createElement("tr");
    const isOk = Number(it.missing) === 0;
    tr.innerHTML = `
      <td style="font-weight: 600;">${it.name}</td>
      <td>${fmtQty(it.stock)} ${it.unit}</td>
      <td style="font-weight: 700; color: #0f766e;">${fmtQty(it.required)} ${it.unit}</td>
      <td style="text-align: center;">${isOk ? '✅' : '❌'}</td>
    `;
    consumptionTbody.appendChild(tr);
  });

  btnRun.disabled = !preview.can_produce;
  btnRun.style.opacity = preview.can_produce ? "1" : "0.5";
  
  if(!preview.can_produce) warningDiv.style.display = "flex";
}

// ---------------- HISTORIAL DE PRODUCCIÓN ----------------
async function loadHistory(){
  try {
    const res = await apiFetch(API_PRODUCTION);
    const list = res.data || [];
    historyContainer.innerHTML = list.length ? "" : `<div style="text-align:center; padding: 20px; color: #94a3b8;">No hay producciones registradas.</div>`;

    list.forEach(h => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div class="hi-top">
          <span class="hi-id">ORD-${h.id}</span>
          <span class="hi-date">${fmtDate(h.production_date)}</span>
        </div>
        <div class="hi-product" style="font-weight: bold;">${h.product_name || 'Producto'}</div>
        <div class="hi-bottom">
          <span class="hi-qty">+ ${Number(h.qty_made)} Unidades</span>
          <span class="hi-status">Completada</span>
        </div>
      `;
      historyContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Error cargando historial:", err);
  }
}

// ---------------- EJECUTAR PRODUCCIÓN ----------------
async function runProduction(){
    const pid = toInt(selProduct.value);
    const qty = Math.max(1, toInt(inputQty.value));
    if(!pid) return;

    try {
        btnRun.disabled = true;
        btnRun.innerText = "Procesando...";

        await apiFetch(API_PRODUCTION, {
            method: "POST",
            body: JSON.stringify({
                product_id: pid,
                qty_made: qty,
                notes: "Producción automática",
                production_date: new Date().toISOString()
            })
        });

        alert("¡Producción registrada con éxito!");
        selProduct.value = "";
        inputQty.value = "1";
        renderPreview(null);
        await Promise.all([loadProducts(), loadHistory()]);
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btnRun.disabled = false;
        btnRun.innerText = "Iniciar Producción";
    }
}

// ---------------- INICIALIZACIÓN ----------------
async function init(){
  // 1. Cargamos datos
  await loadProducts();
  await loadHistory();
  
  // 2. Limpiamos la UI
  renderPreview(null);

  // 3. Eventos
  selProduct?.addEventListener("change", async () => {
  const pid = toInt(selProduct.value);
  const qty = Math.max(1, toInt(inputQty.value));
  if(!pid) return renderPreview(null);
  
  // Dentro del init(), en el evento change del selProduct
try {
  const json = await apiFetch(`${API_PRODUCTION}/preview?product_id=${pid}&qty_made=${qty}`);
  renderPreview(json.data);
} catch(err) {
  // Si el error es "Producto sin receta", lo mostramos bonito en la tabla
  if (err.message === "Producto sin receta.") {
      consumptionTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding: 20px; color: #f59e0b;">
            ⚠️ Este producto no tiene una receta configurada. <br>
            <small>Ve a Inventario > Recetas para añadir sus insumos.</small>
          </td>
        </tr>`;
      btnRun.disabled = true;
      btnRun.style.opacity = "0.5";
  } else {
      console.error("Error real:", err);
      renderPreview(null);
  }
}
});

  inputQty?.addEventListener("input", () => {
    if(selProduct.value) selProduct.dispatchEvent(new Event('change'));
  });

  btnRun?.addEventListener("click", runProduction);
}

document.addEventListener("DOMContentLoaded", init);