/* =========================================================
   BUYER PERSONA JS - Estrategia de Cliente (KONT)
   ========================================================= */

const API_URL = '/buyer-personas'; // Ruta relativa para usar con tu apiFetch global
let currentPersonas = []; 
let charts = [];

document.addEventListener("visibilitychange", () => { 
    if (document.visibilityState === "visible") loadPersonas(); 
});

document.addEventListener('DOMContentLoaded', () => { 
    loadPersonas(); 
});

// === CARGAR PERFILES DE CLIENTE ===
async function loadPersonas() {
    try {
        const json = await apiFetch(API_URL);
        if (json && (json.success || json.data)) {
            currentPersonas = json.data || json;
            renderList();
            
            if (currentPersonas.length > 0) {
                selectPersona(0); 
            } else {
                showEmptyState();
            }
        }
    } catch (e) { 
        console.error("Error cargando personas:", e); 
    }
}

function showEmptyState() {
    const detail = document.getElementById('persona-detail');
    if (!detail) return;
    detail.innerHTML = `
        <div style="text-align:center; padding:15vh 20px; color:#9ca3af;">
            <i class="bi bi-person-bounding-box" style="font-size: 4rem; opacity: 0.3;"></i>
            <h3 style="font-weight: 600; margin-top: 20px; color: #4b5563;">Define a tu cliente ideal</h3>
            <p style="max-width: 400px; margin: 10px auto;">Compara quién te compra hoy frente a quién quieres que te compre mañana.</p>
            <button class="btn-primary" onclick="openModal()" style="margin-top: 20px;">
                <i class="bi bi-plus-lg"></i> Crear Primer Perfil
            </button>
        </div>`;
}

// === RENDERIZADO DE LISTA LATERAL ===
function renderList() {
    const container = document.getElementById('persona-list'); 
    if (!container) return;
    container.innerHTML = '';

    currentPersonas.forEach((p, idx) => { 
        const div = document.createElement('div');
        div.className = 'persona-item';
        div.id = `item-${idx}`;
        div.onclick = () => selectPersona(idx);
        
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="persona-avatar" style="width:40px; height:40px; background:#f1f5f9; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                    <i class="bi bi-person-fill" style="color: #94a3b8;"></i>
                </div>
                <div style="flex:1; overflow:hidden;">
                    <div style="font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nombre}</div>
                    <small style="color: #64748b; font-size: 0.75rem;">${p.descripcion ? p.descripcion.substring(0, 35) + '...' : 'Estrategia de cliente'}</small>
                </div>
            </div>`;
        container.appendChild(div);
    });
}

// === SELECCIONAR Y MOSTRAR DETALLE ===
function selectPersona(idx) {
    const p = currentPersonas[idx];
    if (!p) return;

    // Actualizar UI de la lista
    document.querySelectorAll('.persona-item').forEach(e => e.classList.remove('active'));
    document.getElementById(`item-${idx}`)?.classList.add('active');

    const r = p.data_real || {};
    const i = p.data_ideal || {};
    const container = document.getElementById('persona-detail');

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px;">
            <div>
                <h2 style="margin: 0; color: #0f172a; font-size: 1.5rem;">${p.nombre}</h2>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 0.9rem;">${p.descripcion || 'Sin descripción detallada.'}</p>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-outline" onclick="openModal(${idx})"><i class="bi bi-pencil"></i></button>
                <button class="btn-outline" style="color:#ef4444;" onclick="deletePersona(${p.id})"><i class="bi bi-trash"></i></button>
            </div>
        </div>

        <div class="comparison-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div class="card-real" style="background:#fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:15px; color: #64748b; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="bi bi-geo-fill"></i> Realidad Actual
                </div>
                ${renderDataRows(r)}
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top:20px;">
                    <div class="chart-container">
                        <small style="display:block; text-align:center; font-size:10px; margin-bottom:5px;">MÉTODO PAGO</small>
                        <canvas id="chartPagoReal" height="100"></canvas>
                    </div>
                    <div class="chart-container">
                        <small style="display:block; text-align:center; font-size:10px; margin-bottom:5px;">TIPO CLIENTE</small>
                        <canvas id="chartTipoReal" height="100"></canvas>
                    </div>
                </div>
            </div>

            <div class="card-ideal" style="background:#f0f7ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 20px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:15px; color: #2563eb; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="bi bi-rocket-takeoff-fill"></i> Objetivo Meta
                </div>
                ${renderDataRows(i)}
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top:20px;">
                    <div class="chart-container">
                        <small style="display:block; text-align:center; font-size:10px; margin-bottom:5px; color:#2563eb;">META PAGO</small>
                        <canvas id="chartPagoIdeal" height="100"></canvas>
                    </div>
                    <div class="chart-container">
                        <small style="display:block; text-align:center; font-size:10px; margin-bottom:5px; color:#2563eb;">META TIPO</small>
                        <canvas id="chartTipoIdeal" height="100"></canvas>
                    </div>
                </div>
            </div>
        </div>`;

    if (window.innerWidth < 900) container.scrollIntoView({ behavior: 'smooth' });
    renderCharts(r, i);
}

function renderDataRows(data) {
    return `
        <div class="data-row" style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem;">
            <span style="color:#64748b;">Edad:</span> <span style="font-weight:600;">${data.edad || '-'}</span>
        </div>
        <div class="data-row" style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem;">
            <span style="color:#64748b;">Ubicación:</span> <span style="font-weight:600;">${data.ubicacion || '-'}</span>
        </div>
        <div style="margin-top:12px;">
            <span style="color:#64748b; font-size:0.8rem;">Intereses:</span>
            <p style="margin:4px 0 0 0; font-size:0.85rem; line-height:1.4;">${data.intereses || 'No definidos'}</p>
        </div>`;
}

// === GESTIÓN DE GRÁFICOS (Chart.js) ===
function renderCharts(real, ideal) {
    charts.forEach(c => c.destroy());
    charts = [];

    const setup = (id, data, colors) => {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{ 
                    data: data, 
                    backgroundColor: colors, 
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                cutout: '75%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
        charts.push(chart);
    };

    // Datos procesados para asegurar que sean números
    setup('chartPagoReal', [real.pago_contado || 0, real.pago_credito || 0], ['#94a3b8', '#e2e8f0']);
    setup('chartTipoReal', [real.tipo_mayorista || 0, real.tipo_detal || 0], ['#94a3b8', '#e2e8f0']);
    setup('chartPagoIdeal', [ideal.pago_contado || 0, ideal.pago_credito || 0], ['#2563eb', '#dbeafe']);
    setup('chartTipoIdeal', [ideal.tipo_mayorista || 0, ideal.tipo_detal || 0], ['#2563eb', '#dbeafe']);
}

// === GUARDAR CAMBIOS ===
async function savePersona(e) {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');

    const payload = {
        nombre: f.nombre.value,
        descripcion: f.descripcion.value,
        data_real: {
            edad: f.r_edad.value,
            genero: f.r_genero.value,
            ubicacion: f.r_ubicacion.value,
            intereses: f.r_intereses.value,
            pago_contado: Number(f.r_contado.value) || 0,
            pago_credito: Number(f.r_credito.value) || 0,
            tipo_mayorista: Number(f.r_mayorista.value) || 0,
            tipo_detal: Number(f.r_detal.value) || 0
        },
        data_ideal: {
            edad: f.i_edad.value,
            genero: f.i_genero.value,
            ubicacion: f.i_ubicacion.value,
            intereses: f.i_intereses.value,
            pago_contado: Number(f.i_contado.value) || 0,
            pago_credito: Number(f.i_credito.value) || 0,
            tipo_mayorista: Number(f.i_mayorista.value) || 0,
            tipo_detal: Number(f.i_detal.value) || 0
        }
    };

    try {
        btn.disabled = true;
        const id = f.id.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;

        await apiFetch(url, { method, body: JSON.stringify(payload) });
        
        closeModal();
        await loadPersonas();
        
    } catch(err) {
        console.error(err);
        alert('Error al procesar la solicitud.');
    } finally {
        btn.disabled = false;
    }
}