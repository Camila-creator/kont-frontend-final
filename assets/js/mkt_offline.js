/* =========================================================
   PUBLICIDAD OFFLINE & BTL JS - Integrado con Kont
   ========================================================= */

// 1. Configuración de Endpoints (Heredando de main.js)
const API_OFFLINE = `${API_BASE}/mkt-offline/activities`;
let dbOffline = [];

// 2. Inicialización
document.addEventListener('DOMContentLoaded', () => { 
    loadOfflineAds(); 
});

document.addEventListener("visibilitychange", () => { 
    if (document.visibilityState === "visible") loadOfflineAds(); 
});

/**
 * CARGA DE ACTIVIDADES DESDE EL SERVIDOR
 */
async function loadOfflineAds() {
    try {
        // apiFetch ya gestiona token y errores 401/403 desde main.js
        const json = await apiFetch(API_OFFLINE);
        
        if (json && (json.success || Array.isArray(json))) { 
            dbOffline = json.data || json; 
            applyFilters(); 
        }
    } catch(e) { 
        console.error("Error conectando con el módulo Offline:", e); 
    }
}

/**
 * APLICACIÓN DE FILTROS Y RENDERIZADO
 */
function applyFilters() { 
    renderDashboard(); 
    renderActivities(); 
}

/**
 * ACTUALIZAR MÉTRICAS DEL DASHBOARD (PRESUPUESTO VS GASTO)
 */
function renderDashboard() {
    let totalPresupuesto = 0; 
    let totalGasto = 0; 
    let activas = 0;
    
    const filtroEl = document.getElementById('filtroMes');
    const filtro = filtroEl ? filtroEl.value : 'todos';
    const mesActual = new Date().getMonth(); 
    const anioActual = new Date().getFullYear();

    dbOffline.forEach(act => {
        let entraEnFiltro = true;
        
        if (filtro === 'mes_actual' && act.fecha_inicio) {
            const fechaAct = new Date(act.fecha_inicio.split('T')[0] + "T00:00:00");
            if (fechaAct.getMonth() !== mesActual || fechaAct.getFullYear() !== anioActual) {
                entraEnFiltro = false;
            }
        }

        if (entraEnFiltro) {
            totalPresupuesto += parseFloat(act.presupuesto || 0);
            totalGasto += parseFloat(act.gasto_real || 0);
        }

        if (act.estado === 'Planeado' || act.estado === 'En Ejecución') {
            activas++;
        }
    });

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setVal('dashPresupuesto', `$ ${totalPresupuesto.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
    setVal('dashGasto', `$ ${totalGasto.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
    setVal('dashActivas', activas);
}

/**
 * RENDERIZADO DE LA LISTA DE ACTIVIDADES (BTL/OFFLINE)
 */
function renderActivities() {
    const grid = document.getElementById('offlineList');
    if (!grid) return;
    grid.innerHTML = '';
    
    const filtroEl = document.getElementById('filtroMes');
    const filtro = filtroEl ? filtroEl.value : 'todos';
    const mesActual = new Date().getMonth(); 
    const anioActual = new Date().getFullYear();

    dbOffline.forEach((act, idx) => {
        let entraEnFiltro = true;
        if (filtro === 'mes_actual' && act.fecha_inicio) {
            const fechaAct = new Date(act.fecha_inicio.split('T')[0] + "T00:00:00");
            if (fechaAct.getMonth() !== mesActual || fechaAct.getFullYear() !== anioActual) {
                entraEnFiltro = false;
            }
        }
        if (!entraEnFiltro) return;

        // Formateo de clases y estados
        let cardStatusClass = (act.estado || '').toLowerCase().replace(/\s+/g, ''); 
        if(cardStatusClass === 'enejecución') cardStatusClass = 'ejecucion';

        const badgeMap = {
            'Evento/Feria': 'badge-evento',
            'Impresos': 'badge-impresos',
            'Valla/Exteriores': 'badge-valla',
            'Merchandising': 'badge-merch'
        };
        const badgeClass = badgeMap[act.categoria] || 'badge-otro';

        const iconMap = {
            'En Ejecución': '🚀',
            'Finalizado': '✅',
            'Cancelado': '❌',
            'Planeado': '🗓️'
        };
        const estadoIcon = iconMap[act.estado] || '📍';

        const fechaInicio = act.fecha_inicio ? act.fecha_inicio.split('T')[0] : '';
        const fechaFin = act.fecha_fin ? act.fecha_fin.split('T')[0] : '';

        grid.innerHTML += `
            <div class="activity-card ${cardStatusClass}" onclick="openOfflineModal(${idx})">
                <div class="act-title">${act.nombre} <span class="act-badge ${badgeClass}">${act.categoria}</span></div>
                <div class="act-location"><i class="bi bi-geo-alt-fill"></i> ${act.ubicacion || 'Sin ubicación'}</div>
                <div class="act-data">
                    <div class="act-row">
                        <span><strong>Presupuesto:</strong> $${parseFloat(act.presupuesto || 0).toLocaleString('en-US')}</span>
                        <span><strong>Estado:</strong> ${act.estado} ${estadoIcon}</span>
                    </div>
                    <div class="act-row date-row">
                        <span><i class="bi bi-calendar"></i> ${fechaInicio} ${fechaFin ? `al ${fechaFin}` : ''}</span>
                    </div>
                </div>
            </div>`;
    });
}

/**
 * GESTIÓN DE MODALES Y FORMULARIOS
 */
function openOfflineModal(idx = null) {
    const form = document.getElementById('offlineForm');
    if (!form) return;
    form.reset();
    document.getElementById('actId').value = '';
    
    const tabs = document.querySelectorAll('.tab-btn');
    if (tabs.length > 0) tabs[0].click();

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

function closeModal() { 
    const modal = document.getElementById('offlineModal');
    if (modal) modal.classList.remove('active'); 
}

async function saveActivity(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('actId').value;
    
    const payload = {
        nombre: document.getElementById('actNombre').value, 
        categoria: document.getElementById('actCategoria').value, 
        estado: document.getElementById('actEstado').value, 
        ubicacion: document.getElementById('actUbicacion').value,
        fecha_inicio: document.getElementById('actFechaInicio').value, 
        fecha_fin: document.getElementById('actFechaFin').value || null, 
        objetivo: document.getElementById('actObjetivo').value,
        presupuesto: parseFloat(document.getElementById('actPresupuesto').value) || 0, 
        gasto_real: parseFloat(document.getElementById('actGastoReal').value) || 0, 
        resultados: document.getElementById('actResultados').value,
        proveedor: document.getElementById('actProveedor').value, 
        contacto: document.getElementById('actContacto').value, 
        drive_link: document.getElementById('actDriveLink').value, 
        notas: document.getElementById('actNotas').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_OFFLINE}/${id}` : API_OFFLINE;

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal(); 
        loadOfflineAds(); 
    } catch (error) { 
        console.error("Error guardando actividad offline:", error); 
        alert("Hubo un error al guardar."); 
    }
}

function switchTab(evt, tabName) {
    if (evt && evt.preventDefault) evt.preventDefault(); 
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    const target = document.getElementById(tabName);
    if (target) target.classList.add("active");
    if (evt) evt.currentTarget.classList.add("active");
}