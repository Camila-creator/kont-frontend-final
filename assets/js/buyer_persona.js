/* =========================================================
   BUYER PERSONA JS - Conectado al Backend SaaS
   ========================================================= */
const API_URL = 'https://kont-backend-final.onrender.com/api/buyer-personas';
let currentPersonas = []; let charts = [];

document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadPersonas(); });
document.addEventListener('DOMContentLoaded', () => { loadPersonas(); });

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) }, ...options });
    if (res.status === 401 || res.status === 403) { localStorage.removeItem("agromedic_token"); window.location.replace("../pages/login.html"); return; }
    if (!res.ok) throw new Error(`Error del servidor`);
    return res.json();
}

async function loadPersonas() {
    try {
        const json = await apiFetch(API_URL);
        if (json && json.success) {
            currentPersonas = json.data; renderList();
            if (currentPersonas.length > 0) selectPersona(0); else document.getElementById('persona-detail').innerHTML = `<div style="text-align:center; padding:15vh 20px; color:#9ca3af;"><i class="bi bi-person-bounding-box" style="font-size: 4rem; opacity: 0.5;"></i><h3 style="font-weight: 500;">Aún no hay perfiles</h3><p>Haz clic en el botón "+" para crear tu primera estrategia.</p></div>`;
        }
    } catch (e) { console.error("Error:", e); alert("Error de conexión con la API."); }
}

function renderList() {
    const container = document.getElementById('persona-list'); container.innerHTML = '';
    currentPersonas.forEach((p, idx) => { container.innerHTML += `<div class="persona-item" onclick="selectPersona(${idx})" id="item-${idx}"><i class="bi bi-person-circle" style="font-size: 1.8rem; color: #9ca3af;"></i><div><div style="font-weight: 700; color: #1f2937;">${p.nombre}</div><small style="color: #6b7280; font-size: 0.8rem;">${p.descripcion ? p.descripcion.substring(0, 30) + '...' : 'Sin descripción'}</small></div></div>`; });
}

function selectPersona(idx) {
    // 1. Manejo de estado visual en la lista
    document.querySelectorAll('.persona-item').forEach(e => e.classList.remove('active'));
    const selectedItem = document.getElementById(`item-${idx}`);
    if (selectedItem) selectedItem.classList.add('active');

    // 2. Extracción de datos con valores por defecto para evitar "undefined"
    const p = currentPersonas[idx];
    if (!p) return;

    const r = p.data_real || {};
    const i = p.data_ideal || {};
    const container = document.getElementById('persona-detail');

    // 3. Renderizado del HTML
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; gap: 15px;">
            <div>
                <h2 style="margin: 0 0 5px 0; color: #111827;">${p.nombre}</h2>
                <p style="color: #4b5563; margin: 0; font-size: 0.95rem;">${p.descripcion || 'Sin descripción detallada.'}</p>
            </div>
            <button class="btn-outline" onclick="openModal(${idx})" style="white-space: nowrap;">
                <i class="bi bi-pencil-square me-2"></i> Editar
            </button>
        </div>

        <div class="comparison-container">
            <div class="card-real">
                <div class="card-title real"><i class="bi bi-building me-2"></i> Realidad Actual</div>
                <div class="data-row"><span class="data-label">Edad Promedio:</span> <span>${r.edad || '-'}</span></div>
                <div class="data-row"><span class="data-label">Género Frecuente:</span> <span>${r.genero || '-'}</span></div>
                <div class="data-row"><span class="data-label">Ubicación Fuerte:</span> <span>${r.ubicacion || '-'}</span></div>
                <div class="data-row" style="display:block; border-bottom: none;">
                    <span class="data-label">Intereses / Gustos:</span>
                    <small style="color: #64748b; display:block; margin-top:5px; line-height: 1.4;">${r.intereses || 'No definidos'}</small>
                </div>
                
                <hr style="border-top: 1px dashed #e5e7eb; margin: 15px 0;">
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <div style="text-align:center; font-size:0.75rem; font-weight:bold; color:#64748b; text-transform:uppercase;">Pago</div>
                        <div class="chart-mini"><canvas id="chartPagoReal"></canvas></div>
                    </div>
                    <div>
                        <div style="text-align:center; font-size:0.75rem; font-weight:bold; color:#64748b; text-transform:uppercase;">Cliente</div>
                        <div class="chart-mini"><canvas id="chartTipoReal"></canvas></div>
                    </div>
                </div>
            </div>

            <div class="card-ideal">
                <div class="card-title ideal"><i class="bi bi-rocket-takeoff me-2"></i> Objetivo Meta</div>
                <div class="data-row"><span class="data-label">Edad Target:</span> <span>${i.edad || '-'}</span></div>
                <div class="data-row"><span class="data-label">Género Target:</span> <span>${i.genero || '-'}</span></div>
                <div class="data-row"><span class="data-label">Ubicación Target:</span> <span>${i.ubicacion || '-'}</span></div>
                <div class="data-row" style="display:block; border-bottom: none;">
                    <span class="data-label">Intereses a captar:</span>
                    <small style="color: #64748b; display:block; margin-top:5px; line-height: 1.4;">${i.intereses || 'No definidos'}</small>
                </div>

                <hr style="border-top: 1px dashed #bfdbfe; margin: 15px 0;">

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <div style="text-align:center; font-size:0.75rem; font-weight:bold; color:#0d6efd; text-transform:uppercase;">Meta Pago</div>
                        <div class="chart-mini"><canvas id="chartPagoIdeal"></canvas></div>
                    </div>
                    <div>
                        <div style="text-align:center; font-size:0.75rem; font-weight:bold; color:#0d6efd; text-transform:uppercase;">Meta Cliente</div>
                        <div class="chart-mini"><canvas id="chartTipoIdeal"></canvas></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 4. Scroll automático para móvil (Valencia tech life!)
    if (window.innerWidth < 900) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 5. Renderizado de gráficos con los datos procesados
    renderCharts(r, i);
}

function renderCharts(real, ideal) {
    charts.forEach(c => c.destroy());
    charts = [];

    const createChart = (id, labels, data, colors) => {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { boxWidth: 8, font: { size: 10 }, padding: 10 } 
                    }
                }
            }
        });
        charts.push(chart);
    };

    // Usamos exactamente los nombres que envías en savePersona
    createChart('chartPagoReal', ['Contado', 'Crédito'], [real.pago_contado || 0, real.pago_credito || 0], ['#64748b', '#cbd5e1']);
    createChart('chartTipoReal', ['Mayorista', 'Detal'], [real.tipo_mayorista || 0, real.tipo_detal || 0], ['#64748b', '#cbd5e1']);
    createChart('chartPagoIdeal', ['Contado', 'Crédito'], [ideal.pago_contado || 0, ideal.pago_credito || 0], ['#0d6efd', '#93c5fd']);
    createChart('chartTipoIdeal', ['Mayorista', 'Detal'], [ideal.tipo_mayorista || 0, ideal.tipo_detal || 0], ['#0d6efd', '#93c5fd']);
}

function openModal(idx = null) {
    const f = document.forms['personaForm']; f.reset(); f.id.value = '';
    if (idx !== null) {
        const p = currentPersonas[idx]; const r = p.data_real || {}; const i = p.data_ideal || {};
        f.id.value = p.id; f.nombre.value = p.nombre; f.descripcion.value = p.descripcion || '';
        f.r_edad.value = r.edad || ''; f.r_genero.value = r.genero || ''; f.r_ubicacion.value = r.ubicacion || ''; f.r_intereses.value = r.intereses || ''; f.r_contado.value = r.pago_contado || ''; f.r_credito.value = r.pago_credito || ''; f.r_mayorista.value = r.tipo_mayorista || ''; f.r_detal.value = r.tipo_detal || '';
        f.i_edad.value = i.edad || ''; f.i_genero.value = i.genero || ''; f.i_ubicacion.value = i.ubicacion || ''; f.i_intereses.value = i.intereses || ''; f.i_contado.value = i.pago_contado || ''; f.i_credito.value = i.pago_credito || ''; f.i_mayorista.value = i.tipo_mayorista || ''; f.i_detal.value = i.tipo_detal || '';
    }
    document.getElementById('personaModal').classList.add('active');
}

function closeModal() { document.getElementById('personaModal').classList.remove('active'); }
document.getElementById('personaModal').addEventListener('click', (e) => { if (e.target.id === 'personaModal') closeModal(); });

async function savePersona(e) {
    e.preventDefault(); const f = e.target;
    const data_real = { edad: f.r_edad.value, genero: f.r_genero.value, ubicacion: f.r_ubicacion.value, intereses: f.r_intereses.value, pago_contado: Number(f.r_contado.value), pago_credito: Number(f.r_credito.value), tipo_mayorista: Number(f.r_mayorista.value), tipo_detal: Number(f.r_detal.value) };
    const data_ideal = { edad: f.i_edad.value, genero: f.i_genero.value, ubicacion: f.i_ubicacion.value, intereses: f.i_intereses.value, pago_contado: Number(f.i_contado.value), pago_credito: Number(f.i_credito.value), tipo_mayorista: Number(f.i_mayorista.value), tipo_detal: Number(f.i_detal.value) };
    const payload = { nombre: f.nombre.value, descripcion: f.descripcion.value, data_real, data_ideal };
    const id = f.id.value; const method = id ? 'PUT' : 'POST'; const url = id ? `${API_URL}/${id}` : API_URL;
    try { await apiFetch(url, { method, body: JSON.stringify(payload) }); alert(id ? 'Actualizado' : 'Creado'); closeModal(); loadPersonas(); } catch(err) { console.error(err); alert('Error al guardar'); }
}