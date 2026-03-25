/* =========================================================
   PUBLICIDAD OFFLINE & BTL JS - Conectado a PostgreSQL
   ========================================================= */

const API_OFFLINE = 'https://kont-backend-final.onrender.com/api/mkt-offline/activities';
let dbOffline = [];

document.addEventListener('DOMContentLoaded', () => { loadOfflineAds(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadOfflineAds(); });

// === API FETCH CON GAFETE ===
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) },
        ...options,
    });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("agromedic_token");
        window.location.replace("../pages/login.html");
        return;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`);
    return data;
}

async function loadOfflineAds() {
    try {
        const json = await apiFetch(API_OFFLINE);
        if (json && json.success) { dbOffline = json.data; applyFilters(); }
    } catch(e) { console.error("Error conectando con el servidor", e); }
}

function applyFilters() { renderDashboard(); renderActivities(); }

function renderDashboard() {
    let totalPresupuesto = 0; let totalGasto = 0; let activas = 0;
    const filtro = document.getElementById('filtroMes').value;
    const mesActual = new Date().getMonth(); const anioActual = new Date().getFullYear();

    dbOffline.forEach(act => {
        let entraEnFiltro = true;
        if (filtro === 'mes_actual' && act.fecha_inicio) {
            const fechaAct = new Date(act.fecha_inicio.split('T')[0] + "T00:00:00");
            if (fechaAct.getMonth() !== mesActual || fechaAct.getFullYear() !== anioActual) entraEnFiltro = false;
        }
        if (entraEnFiltro) {
            totalPresupuesto += parseFloat(act.presupuesto) || 0;
            totalGasto += parseFloat(act.gasto_real) || 0;
        }
        if (act.estado === 'Planeado' || act.estado === 'En Ejecución') activas++;
    });

    document.getElementById('dashPresupuesto').innerText = `$ ${totalPresupuesto.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('dashGasto').innerText = `$ ${totalGasto.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('dashActivas').innerText = activas;
}

function renderActivities() {
    const grid = document.getElementById('offlineList');
    grid.innerHTML = '';
    const filtro = document.getElementById('filtroMes').value;
    const mesActual = new Date().getMonth(); const anioActual = new Date().getFullYear();

    dbOffline.forEach((act, idx) => {
        let entraEnFiltro = true;
        if (filtro === 'mes_actual' && act.fecha_inicio) {
            const fechaAct = new Date(act.fecha_inicio.split('T')[0] + "T00:00:00");
            if (fechaAct.getMonth() !== mesActual || fechaAct.getFullYear() !== anioActual) entraEnFiltro = false;
        }
        if (!entraEnFiltro) return;

        let cardStatusClass = act.estado.toLowerCase().replace(' ', ''); 
        if(cardStatusClass === 'enejecución') cardStatusClass = 'ejecucion';

        let badgeClass = 'badge-otro';
        if (act.categoria === 'Evento/Feria') badgeClass = 'badge-evento';
        if (act.categoria === 'Impresos') badgeClass = 'badge-impresos';
        if (act.categoria === 'Valla/Exteriores') badgeClass = 'badge-valla';
        if (act.categoria === 'Merchandising') badgeClass = 'badge-merch';

        let estadoIcon = '🗓️';
        if (act.estado === 'En Ejecución') estadoIcon = '🚀';
        if (act.estado === 'Finalizado') estadoIcon = '✅';
        if (act.estado === 'Cancelado') estadoIcon = '❌';

        const fechaInicioLimpia = act.fecha_inicio ? act.fecha_inicio.split('T')[0] : '';
        const fechaFinLimpia = act.fecha_fin ? act.fecha_fin.split('T')[0] : '';

        grid.innerHTML += `
            <div class="activity-card ${cardStatusClass}" onclick="openOfflineModal(${idx})">
                <div class="act-title">${act.nombre} <span class="act-badge ${badgeClass}">${act.categoria}</span></div>
                <div style="font-size:0.85rem; color:#6b7280; margin-bottom:5px;"><i class="bi bi-geo-alt-fill"></i> ${act.ubicacion || 'Ubicación no especificada'}</div>
                <div class="act-data">
                    <div class="act-row"><span><strong>Presupuesto:</strong> $${(parseFloat(act.presupuesto)||0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span><span><strong>Estado:</strong> ${act.estado} ${estadoIcon}</span></div>
                    <div class="act-row" style="margin-top:5px; font-size: 0.8rem;"><span><i class="bi bi-calendar"></i> ${fechaInicioLimpia} ${fechaFinLimpia ? `al ${fechaFinLimpia}` : ''}</span></div>
                </div>
            </div>
        `;
    });
}

function switchTab(evt, tabName) {
    if (evt && evt.preventDefault) evt.preventDefault(); 
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function openOfflineModal(idx = null) {
    document.getElementById('offlineForm').reset();
    document.getElementById('actId').value = '';
    document.querySelectorAll('.tab-btn')[0].click();

    if (idx !== null) {
        const act = dbOffline[idx];
        document.getElementById('modalTitle').innerText = 'Editar Actividad';
        document.getElementById('actId').value = act.id;
        document.getElementById('actNombre').value = act.nombre || '';
        document.getElementById('actCategoria').value = act.categoria || 'Evento/Feria';
        document.getElementById('actEstado').value = act.estado || 'Planeado';
        document.getElementById('actUbicacion').value = act.ubicacion || '';
        document.getElementById('actFechaInicio').value = act.fecha_inicio ? act.fecha_inicio.split('T')[0] : '';
        document.getElementById('actFechaFin').value = act.fecha_fin ? act.fecha_fin.split('T')[0] : '';
        document.getElementById('actObjetivo').value = act.objetivo || '';
        document.getElementById('actPresupuesto').value = act.presupuesto || '';
        document.getElementById('actGastoReal').value = act.gasto_real || '';
        document.getElementById('actResultados').value = act.resultados || '';
        document.getElementById('actProveedor').value = act.proveedor || '';
        document.getElementById('actContacto').value = act.contacto || '';
        document.getElementById('actDriveLink').value = act.drive_link || '';
        document.getElementById('actNotas').value = act.notas || '';
    } else {
        document.getElementById('modalTitle').innerText = 'Registrar Nueva Actividad Offline';
    }
    document.getElementById('offlineModal').classList.add('active');
}

function closeModal() { document.getElementById('offlineModal').classList.remove('active'); }

async function saveActivity(e) {
    e.preventDefault();
    const id = document.getElementById('actId').value;
    const payload = {
        nombre: document.getElementById('actNombre').value, categoria: document.getElementById('actCategoria').value, estado: document.getElementById('actEstado').value, ubicacion: document.getElementById('actUbicacion').value,
        fecha_inicio: document.getElementById('actFechaInicio').value, fecha_fin: document.getElementById('actFechaFin').value || null, objetivo: document.getElementById('actObjetivo').value,
        presupuesto: parseFloat(document.getElementById('actPresupuesto').value) || 0, gasto_real: parseFloat(document.getElementById('actGastoReal').value) || 0, resultados: document.getElementById('actResultados').value,
        proveedor: document.getElementById('actProveedor').value, contacto: document.getElementById('actContacto').value, drive_link: document.getElementById('actDriveLink').value, notas: document.getElementById('actNotas').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_OFFLINE}/${id}` : API_OFFLINE;

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal(); loadOfflineAds();
    } catch (error) { console.error("Error guardando:", error); alert("Hubo un error al guardar la actividad."); }
}