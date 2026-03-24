// Configuración de Endpoints
const API_POSTS = `${API_BASE}/mkt-calendar/posts`;
const API_METRICS = `${API_BASE}/mkt-calendar/metrics`;
const API_ADS = `${API_BASE}/mkt-ads/campaigns`; 
const API_OFFLINE = `${API_BASE}/mkt-offline/activities`;

// Estado Global
let currentDate = new Date(); 
let currentMonth = currentDate.getMonth(); 
let currentYear = currentDate.getFullYear();
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

let dbPosts = []; 
let dbAds = []; 
let dbOffline = []; 
let currentMetrics = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => { 
    loadAllData();
    // Escuchar el submit del formulario (si no está en el HTML)
    const postForm = document.getElementById('postForm');
    if (postForm) postForm.onsubmit = savePost;
});

// Recargar datos cuando el usuario vuelve a la pestaña
document.addEventListener("visibilitychange", () => { 
    if (document.visibilityState === "visible") loadAllData(); 
});

/**
 * Fetch Wrapper con manejo de Auth y Errores
 */
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    
    const defaultHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    try {
        const res = await fetch(url, { 
            ...options,
            headers: { ...defaultHeaders, ...(options.headers || {}) }
        });

        if (res.status === 401 || res.status === 403) { 
            localStorage.removeItem("agromedic_token"); 
            window.location.replace("../pages/login.html"); 
            return; 
        }

        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || `Error ${res.status}`);
        return data;
    } catch (err) {
        console.error(`Fetch error en ${url}:`, err);
        throw err;
    }
}

/**
 * Carga masiva de datos con Promise.all
 */
async function loadAllData() {
    try {
        const [jsonPosts, jsonMetrics, jsonAds, jsonOffline] = await Promise.all([ 
            apiFetch(API_POSTS), 
            apiFetch(API_METRICS), 
            apiFetch(API_ADS), 
            apiFetch(API_OFFLINE) 
        ]);

        if (jsonPosts?.success) dbPosts = jsonPosts.data;
        if (jsonMetrics?.success) currentMetrics = jsonMetrics.data;
        if (jsonAds?.success) dbAds = jsonAds.data;
        if (jsonOffline?.success) dbOffline = jsonOffline.data;
        
        renderMetrics(); 
        renderCalendar();
    } catch (e) { 
        console.error("Error crítico cargando datos:", e); 
    }
}

function renderMetrics() {
    const m = currentMetrics || { seguidores: 0, engagement: 0, clics: 0, pregunta_frecuente: 'Sin datos' };
    const safeSetText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    safeSetText('val-seguidores', m.seguidores?.toLocaleString() || '0');
    safeSetText('val-engagement', `${m.engagement || 0}%`);
    safeSetText('val-clics', m.clics?.toLocaleString() || '0');
    safeSetText('val-pregunta', m.pregunta_frecuente || 'N/A');
}

/**
 * Renderizado del Calendario
 */
function renderCalendar() {
    const monthDisplay = document.getElementById('monthDisplay');
    const grid = document.getElementById('calendarDays'); 
    if (!grid || !monthDisplay) return;

    monthDisplay.innerText = `${monthNames[currentMonth]} ${currentYear}`;
    grid.innerHTML = '';

    // Lógica de días
    let firstDay = new Date(currentYear, currentMonth, 1).getDay() - 1;
    if (firstDay === -1) firstDay = 6; // Ajuste para que semana empiece en Lunes
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Celdas vacías mes anterior
    for (let i = 0; i < firstDay; i++) { 
        grid.innerHTML += `<div class="calendar-cell empty"></div>`; 
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Renderizado de días reales
    for (let day = 1; day <= daysInMonth; day++) {
        // Formato YYYY-MM-DD para matching
        const cellDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cellDateObj = new Date(currentYear, currentMonth, day);
        cellDateObj.setHours(0,0,0,0);
        
        let classToday = (cellDateObj.getTime() === today.getTime()) ? 'today' : '';

        // Filtrado por fecha (Normalizando el campo fecha de la DB)
        const dayPosts = dbPosts.filter(p => (p.fecha_publicacion || p.fecha)?.split('T')[0] === cellDateStr);
        const dayAds = dbAds.filter(ad => !ad.post_id && ad.fecha_inicio?.split('T')[0] === cellDateStr);
        const dayOffline = dbOffline.filter(act => act.fecha_inicio?.split('T')[0] === cellDateStr);

        let contentHtml = '';

        // 1. Eventos Offline
        dayOffline.forEach(act => {
            contentHtml += `
                <div class="post-chip chip-offline" onclick="goToOfflineManager(event)">
                    <div class="post-header"><strong><i class="bi bi-geo-alt-fill"></i> BTL</strong><span>🎪</span></div>
                    <div class="post-title">${act.nombre}</div>
                </div>`;
        });

        // 2. Posts Redes
        dayPosts.forEach(post => {
            let chipClass = `post-chip chip-${(post.plataforma || '').toLowerCase()}`;
            let statusBadge = ''; 
            const isAd = post.anuncio ? '<span class="badge bg-warning text-dark" style="font-size:0.6rem">ADS</span>' : '';
            
            if (post.estado !== 'Publicado') {
                if (cellDateObj < today) { 
                    chipClass += ' chip-overdue'; 
                    statusBadge = `<div class="status-alert">❌ Reagendar</div>`; 
                } else if (cellDateObj.getTime() === today.getTime()) { 
                    chipClass += ' chip-pending-today'; 
                    statusBadge = `<div class="status-alert">⚠️ Hoy</div>`; 
                }
            } else { 
                statusBadge = `<div class="status-alert" style="color:#10b981; background:transparent;">✅ OK</div>`; 
            }

            const hora = post.hora_publicacion?.substring(0, 5) || post.hora?.substring(0, 5) || '--:--';
            contentHtml += `
                <div class="${chipClass}" onclick="openPostModal(${post.id}, event)">
                    <div class="post-header">
                        <strong><i class="bi bi-${getIcon(post.plataforma)}"></i> ${hora}</strong>
                        ${isAd}
                    </div>
                    <div class="post-title">${post.titulo}</div>
                    ${statusBadge}
                </div>`;
        });

        // 3. Campañas Ads Directas
        dayAds.forEach(ad => {
            contentHtml += `
                <div class="post-chip" style="background:#f0fdf4; color:#166534; border: 1px dashed #22c55e;" onclick="goToAdsManager(event)">
                    <div class="post-header"><strong><i class="bi bi-megaphone-fill"></i> ADS</strong><span>🎯</span></div>
                    <div class="post-title">${ad.nombre_campana}</div>
                </div>`;
        });

        grid.innerHTML += `
            <div class="calendar-cell ${classToday}" onclick="openPostModal(null, event, '${cellDateStr}')">
                <span class="day-number">${day}</span>
                <div class="cell-content">${contentHtml}</div>
            </div>`;
    }
}

// Helpers
function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function getIcon(platform) {
    const icons = { 'Instagram': 'instagram', 'Facebook': 'facebook', 'WhatsApp': 'whatsapp', 'LinkedIn': 'linkedin', 'TikTok': 'tiktok' };
    return icons[platform] || 'circle';
}

function goToAdsManager(e) { e.stopPropagation(); window.location.href = 'mkt_ads.html'; }
function goToOfflineManager(e) { e.stopPropagation(); window.location.href = 'mkt_offline.html'; }

function closeModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active'); 
}

/**
 * CRUD de Posts
 */
function openPostModal(id = null, event = null, dateStr = null) {
    if(event) event.stopPropagation(); 
    const modal = document.getElementById('postModal');
    const f = document.getElementById('postForm');
    const footer = document.getElementById('postFooter');
    
    if (!modal || !f) return;

    f.reset();
    document.getElementById('postId').value = id || '';

    if (id) {
        const post = dbPosts.find(p => p.id === id);
        if(!post) return;
        
        document.getElementById('postModalTitle').innerText = 'Gestionar Publicación';
        document.getElementById('postTitulo').value = post.titulo;
        document.getElementById('postPlataforma').value = post.plataforma;
        document.getElementById('postFecha').value = (post.fecha_publicacion || post.fecha).split('T')[0];
        document.getElementById('postHora').value = (post.hora_publicacion || post.hora).substring(0, 5);
        document.getElementById('postEstado').value = post.estado;
        document.getElementById('postAnuncio').value = String(post.anuncio);
        document.getElementById('postCopy').value = post.copy_text || post.copy || '';
        document.getElementById('postLink').value = post.link_multimedia || post.link || '';

        footer.innerHTML = `
            <button type="button" class="btn-outline" onclick="closeModal('postModal')">Cerrar</button>
            ${post.estado !== 'Publicado' ? `<button type="button" class="btn-success" onclick="marcarPublicado(${post.id})">Publicar ✅</button>` : ''}
            <button type="submit" class="btn-primary">Guardar Cambios</button>
        `;
    } else {
        document.getElementById('postModalTitle').innerText = 'Nueva Publicación';
        if(dateStr) document.getElementById('postFecha').value = dateStr;
        document.getElementById('postEstado').value = 'Programado';
        footer.innerHTML = `
            <button type="button" class="btn-outline" onclick="closeModal('postModal')">Cancelar</button>
            <button type="submit" class="btn-primary">Programar Post</button>
        `;
    }
    
    modal.classList.add('active');
}

async function savePost(e) {
    if(e) e.preventDefault();
    const id = document.getElementById('postId').value;
    
    // Mapeo exacto para el Backend
    const payload = {
        titulo: document.getElementById('postTitulo').value,
        plataforma: document.getElementById('postPlataforma').value,
        fecha: document.getElementById('postFecha').value,
        hora: document.getElementById('postHora').value,
        estado: document.getElementById('postEstado').value,
        anuncio: document.getElementById('postAnuncio').value === 'true',
        copy: document.getElementById('postCopy').value,
        link: document.getElementById('postLink').value
    };

    const method = id ? 'PUT' : 'POST'; 
    const url = id ? `${API_POSTS}/${id}` : API_POSTS;

    try { 
        await apiFetch(url, { method, body: JSON.stringify(payload) }); 
        closeModal('postModal'); 
        await loadAllData(); 
        alert(id ? 'Post actualizado' : 'Post programado con éxito');
    } catch(err) { 
        alert('Error al procesar la solicitud: ' + err.message); 
    }
}

async function marcarPublicado(id) {
    try {
        await apiFetch(`${API_POSTS}/${id}/status`, { 
            method: 'PATCH', 
            body: JSON.stringify({ estado: 'Publicado' }) 
        });
        closeModal('postModal');
        loadAllData();
    } catch(err) {
        // Si el endpoint PATCH no existe, intenta con PUT normal
        const post = dbPosts.find(p => p.id === id);
        const payload = { ...post, estado: 'Publicado' };
        await apiFetch(`${API_POSTS}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        closeModal('postModal');
        loadAllData();
    }
}

async function saveMetrics(e) {
    if(e) e.preventDefault();
    const payload = {
        periodo: document.getElementById('metPeriodo').value,
        seguidores: parseInt(document.getElementById('metSeguidores').value) || 0,
        engagement: parseFloat(document.getElementById('metEngagement').value) || 0,
        clics: parseInt(document.getElementById('metClics').value) || 0,
        pregunta: document.getElementById('metPregunta').value
    };

    try { 
        await apiFetch(API_METRICS, { method: 'POST', body: JSON.stringify(payload) }); 
        closeModal('metricsModal'); 
        loadAllData(); 
    } catch(err) { 
        alert('Error al registrar métricas'); 
    }
}