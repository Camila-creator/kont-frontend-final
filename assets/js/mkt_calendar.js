/* =========================================================
   MKT_CALENDAR.JS - Full CRUD & Operaciones (KONT)
   ========================================================= */

// 1. Configuración de Endpoints (Heredando de main.js)
const API_POSTS = `${API_BASE}/mkt-calendar/posts`;
const API_METRICS = `${API_BASE}/mkt-calendar/metrics`;
const API_ADS = `${API_BASE}/mkt-ads/campaigns`; 
const API_OFFLINE = `${API_BASE}/mkt-offline/activities`;

// 2. Estado Global
let currentDate = new Date(); 
let currentMonth = currentDate.getMonth(); 
let currentYear = currentDate.getFullYear();
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

let dbPosts = []; 
let dbAds = []; 
let dbOffline = []; 
let currentMetrics = null;

// 3. Inicialización
document.addEventListener('DOMContentLoaded', () => { 
    loadAllData();
    const postForm = document.getElementById('postForm');
    if (postForm) postForm.onsubmit = savePost;
});

document.addEventListener("visibilitychange", () => { 
    if (document.visibilityState === "visible") loadAllData(); 
});

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

        if (jsonPosts?.success || Array.isArray(jsonPosts)) dbPosts = jsonPosts.data || jsonPosts;
        if (jsonMetrics?.success || jsonMetrics) currentMetrics = jsonMetrics.data || jsonMetrics;
        if (jsonAds?.success || Array.isArray(jsonAds)) dbAds = jsonAds.data || jsonAds;
        if (jsonOffline?.success || Array.isArray(jsonOffline)) dbOffline = jsonOffline.data || jsonOffline;
        
        renderMetrics(); 
        renderCalendar();
    } catch (e) { 
        console.error("Error crítico cargando datos de Marketing:", e); 
    }
}

/**
 * Renderizado de Métricas en el Header
 */
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
 * Renderizado del Calendario (Lógica de Negocio)
 */
function renderCalendar() {
    const monthDisplay = document.getElementById('monthDisplay');
    const grid = document.getElementById('calendarDays'); 
    if (!grid || !monthDisplay) return;

    monthDisplay.innerText = `${monthNames[currentMonth]} ${currentYear}`;
    grid.innerHTML = '';

    let firstDay = new Date(currentYear, currentMonth, 1).getDay() - 1;
    if (firstDay === -1) firstDay = 6; 
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) { 
        grid.innerHTML += `<div class="calendar-cell empty"></div>`; 
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cellDateObj = new Date(currentYear, currentMonth, day);
        cellDateObj.setHours(0,0,0,0);
        
        let classToday = (cellDateObj.getTime() === today.getTime()) ? 'today' : '';

        const dayPosts = dbPosts.filter(p => (p.fecha_publicacion || p.fecha)?.split('T')[0] === cellDateStr);
        const dayAds = dbAds.filter(ad => !ad.post_id && ad.fecha_inicio?.split('T')[0] === cellDateStr);
        const dayOffline = dbOffline.filter(act => act.fecha_inicio?.split('T')[0] === cellDateStr);

        let contentHtml = '';

        // 1. Eventos BTL
        dayOffline.forEach(act => {
            contentHtml += `
                <div class="post-chip chip-offline" onclick="goToOfflineManager(event)">
                    <div class="post-header"><strong><i class="bi bi-geo-alt-fill"></i> BTL</strong></div>
                    <div class="post-title">${act.nombre}</div>
                </div>`;
        });

        // 2. Posts Redes Sociales
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
                statusBadge = `<div class="status-alert" style="color:#10b981;">✅ OK</div>`; 
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

        // 3. Campañas Ads
        dayAds.forEach(ad => {
            contentHtml += `
                <div class="post-chip chip-ads" onclick="goToAdsManager(event)">
                    <div class="post-header"><strong><i class="bi bi-megaphone-fill"></i> ADS</strong></div>
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

// === CRUD Y MODALES ===
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
    } catch(err) { 
        alert('Error: ' + err.message); 
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
        // Fallback si no hay PATCH parcial
        const post = dbPosts.find(p => p.id === id);
        await apiFetch(`${API_POSTS}/${id}`, { method: 'PUT', body: JSON.stringify({ ...post, estado: 'Publicado' }) });
        closeModal('postModal');
        loadAllData();
    }
}

// === HELPERS DE NAVEGACIÓN Y UI ===
function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function getIcon(platform) {
    const icons = { 'Instagram': 'instagram', 'Facebook': 'facebook', 'WhatsApp': 'whatsapp', 'TikTok': 'tiktok' };
    return icons[platform] || 'circle';
}

function closeModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active'); 
}

function goToAdsManager(e) { e.stopPropagation(); window.location.href = 'mkt_ads.html'; }
function goToOfflineManager(e) { e.stopPropagation(); window.location.href = 'mkt_offline.html'; }