// frontend/assets/js/produccion.js

// ---------------- CONFIGURACIÓN API ----------------
// ✅ CAMBIO: Rutas relativas para que el apiFetch global las maneje
const API_PRODUCTS = "/products";
const API_PRODUCTION = "/production";

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

// 🗑️ BORRADO: La función apiFetch local fue eliminada para usar la global del main.js

// ---------------- LÓGICA DE PRODUCTOS ----------------
async function loadProducts(){
    try {
        const res = await apiFetch(API_PRODUCTS);
        const products = res.data || res || [];
        selProduct.innerHTML = `<option value="">Selecciona un producto...</option>`;
        
        products.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            // Usamos .name o .nombre según lo que venga del backend
            opt.textContent = p.name || p.nombre || `Producto #${p.id}`; 
            selProduct.appendChild(opt);
        });
    } catch (err) {
        console.error("Error cargando productos:", err);
    }
}

// ---------------- VISTA PREVIA DE CONSUMO ----------------
function renderPreview(preview){
    consumptionTbody.innerHTML = "";
    if (warningDiv) warningDiv.style.display = "none"; 

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
            <td style="font-weight: 600; padding: 10px;">${it.name || it.nombre}</td>
            <td style="padding: 10px;">${fmtQty(it.stock)} ${it.unit || ''}</td>
            <td style="font-weight: 700; color: #0f766e; padding: 10px;">${fmtQty(it.required)} ${it.unit || ''}</td>
            <td style="text-align: center; padding: 10px;">${isOk ? '✅' : '❌'}</td>
        `;
        consumptionTbody.appendChild(tr);
    });

    btnRun.disabled = !preview.can_produce;
    btnRun.style.opacity = preview.can_produce ? "1" : "0.5";
    
    if(!preview.can_produce && warningDiv) warningDiv.style.display = "flex";
}

// ---------------- HISTORIAL DE PRODUCCIÓN ----------------
async function loadHistory(){
    try {
        const res = await apiFetch(API_PRODUCTION);
        const list = res.data || res || [];
        historyContainer.innerHTML = list.length ? "" : `<div style="text-align:center; padding: 20px; color: #94a3b8;">No hay producciones registradas.</div>`;

        list.forEach(h => {
            const div = document.createElement("div");
            div.className = "history-item";
            // Estilos mínimos para asegurar legibilidad
            div.style.borderBottom = "1px solid #f1f5f9";
            div.style.padding = "10px 0";
            
            div.innerHTML = `
                <div class="hi-top" style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b;">
                    <span class="hi-id" style="font-weight: bold;">ORD-${h.id}</span>
                    <span class="hi-date">${fmtDate(h.production_date || h.created_at)}</span>
                </div>
                <div class="hi-product" style="font-weight: bold; color: #1e293b; margin: 4px 0;">${h.product_name || h.nombre_producto || 'Producto'}</div>
                <div class="hi-bottom" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="hi-qty" style="color: #059669; font-weight: 800;">+ ${Number(h.qty_made)} Unidades</span>
                    <span class="hi-status" style="font-size: 0.75rem; background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px;">Completada</span>
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

        // ✅ Usamos una alerta más limpia (si tienes el modal de alerta configurado en el main.js)
        if (typeof openAlert === 'function') {
            openAlert({ title: "Éxito", message: "¡Producción registrada con éxito!" });
        } else {
            alert("¡Producción registrada con éxito!");
        }

        selProduct.value = "";
        inputQty.value = "1";
        renderPreview(null);
        await Promise.all([loadProducts(), loadHistory()]);
    } catch (err) {
        if (typeof openAlert === 'function') {
            openAlert({ title: "Error", message: err.message });
        } else {
            alert("Error: " + err.message);
        }
    } finally {
        btnRun.disabled = false;
        btnRun.innerText = "Iniciar Producción";
    }
}

// ---------------- INICIALIZACIÓN ----------------
async function init(){
    if (typeof apiFetch !== "function") {
        console.error("❌ Error Crítico: main.js no detectado.");
        return;
    }

    await loadProducts();
    await loadHistory();
    renderPreview(null);

    // Eventos
    selProduct?.addEventListener("change", async () => {
        const pid = toInt(selProduct.value);
        const qty = Math.max(1, toInt(inputQty.value));
        if(!pid) return renderPreview(null);
        
        try {
            const res = await apiFetch(`${API_PRODUCTION}/preview?product_id=${pid}&qty_made=${qty}`);
            renderPreview(res.data || res);
        } catch(err) {
            if (err.message.includes("receta")) {
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
                console.error("Error en preview:", err);
                renderPreview(null);
            }
        }
    });

    inputQty?.addEventListener("input", () => {
        if(selProduct.value) {
            // Un pequeño debounce o simplemente disparar el change del select
            selProduct.dispatchEvent(new Event('change'));
        }
    });

    btnRun?.addEventListener("click", runProduction);
}

document.addEventListener("DOMContentLoaded", init);