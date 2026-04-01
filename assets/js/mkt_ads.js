/* =========================================================
   MKT_ADS.JS - Gestión de Pauta Digital (Integrado con Kont)
   ========================================================= */

// 1. Configuración de Endpoints (Heredando de main.js)
const API_CAMPAIGNS = `${API_BASE}/mkt-ads/campaigns`;
const API_AUDIENCES = `${API_BASE}/mkt-ads/audiences`;
const API_CALENDAR = `${API_BASE}/mkt-calendar/posts`;

// 2. Estado Global
let currentDate = new Date(); 
let dbAds = []; 
let savedAudiences = []; 
let calendarPosts = [];

// 3. Inicialización y Eventos de Visibilidad
document.addEventListener("visibilitychange", () => { 
    if (document.visibilityState === "visible") loadAllData(); 
});

document.addEventListener('DOMContentLoaded', () => { 
    loadAllData(); 
});

/**
 * Carga masiva de datos (Usa el apiFetch central de main.js)
 */
async function loadAllData() {
    try {
        // apiFetch ya maneja el token y los errores 401/403 globalmente
        const [jsonAds, jsonAud, jsonCal] = await Promise.all([ 
            apiFetch(API_CAMPAIGNS), 
            apiFetch(API_AUDIENCES), 
            apiFetch(API_CALENDAR) 
        ]);

        // Adaptación flexible para la estructura de respuesta (success o array directo)
        dbAds = jsonAds?.data || jsonAds || [];
        savedAudiences = jsonAud?.data || jsonAud || [];
        calendarPosts = jsonCal?.data || jsonCal || [];

        renderAds(); 
        updateAudienceSelectors(); 
        renderAudienceList(); 
        checkPendingCalendarAds(); 
    } catch(e) { 
        console.error("Error cargando el módulo de Ads:", e); 
    }
}

/**
 * Lógica de Alerta: Cruce entre Calendario y Ads Creados
 */
function checkPendingCalendarAds() {
    const pendingPosts = calendarPosts.filter(post => { 
        return post.anuncio === true && !dbAds.some(ad => ad.post_id === post.id); 
    });
    
    const alertBox = document.getElementById('pendingCalendarAds');
    if (!alertBox) return;

    if (pendingPosts.length > 0) {
        alertBox.style.display = 'flex'; 
        const post = pendingPosts[0]; 
        const fechaFormat = (post.fecha_publicacion || post.fecha).split('T')[0];
        const postDate = new Date(fechaFormat + "T00:00:00"); 
        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        if (postDate < today) {
            alertBox.style.background = '#fef2f2'; 
            alertBox.style.borderColor = '#fca5a5'; 
            alertBox.style.borderLeftColor = '#ef4444';
            alertBox.innerHTML = `
                <div>
                    <h4 style="margin:0; color:#b91c1c;"><i class="bi bi-exclamation-octagon-fill"></i> Anuncio Vencido</h4>
                    <p style="margin:5px 0 0 0; color:#4b5563; font-size:0.9rem;">El calendario indicaba que <strong>"${post.titulo}"</strong> saldría el ${fechaFormat}, pero no se configuró.</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-outline" style="border-color:#b91c1c; color:#b91c1c; background:white;" onclick="openCancelAdModal(${post.id}, '${post.titulo}')">Cancelar</button>
                    <button class="btn-primary" style="background:#ef4444;" onclick="openRedirectModal()">Reagendar</button>
                </div>`;
        } else {
            alertBox.style.background = '#eff6ff'; 
            alertBox.style.borderColor = '#bfdbfe'; 
            alertBox.style.borderLeftColor = '#3b82f6';
            alertBox.innerHTML = `
                <div>
                    <h4 style="margin:0; color:#1d4ed8;"><i class="bi bi-info-circle-fill"></i> Publicación pendiente</h4>
                    <p style="margin:5px 0 0 0; color:#4b5563; font-size:0.9rem;">El calendario indica que <strong>"${post.titulo}"</strong> (${fechaFormat}) será pautado.</p>
                </div>
                <button class="btn-primary" onclick="createAdFromCalendar(${post.id}, '${post.titulo}', '${fechaFormat}', '${post.plataforma}')">Configurar Anuncio</button>`;
        }
    } else { 
        alertBox.style.display = 'none'; 
    }
}

// === GESTIÓN DE MODALES Y NAVEGACIÓN ===
function openRedirectModal() { document.getElementById('redirectCalendarModal').classList.add('active'); }
function openCancelAdModal(postId, titulo) { 
    document.getElementById('cancelPostId').value = postId; 
    document.getElementById('cancelAdTitle').innerText = titulo; 
    document.getElementById('cancelAdReason').value = ''; 
    document.getElementById('cancelAdModal').classList.add('active'); 
}

async function confirmCancelAd(e) {
    e.preventDefault(); 
    const postId = document.getElementById('cancelPostId').value; 
    const reason = document.getElementById('cancelAdReason').value;
    const postIndex = calendarPosts.findIndex(p => p.id == postId);
    if (postIndex > -1) { 
        calendarPosts[postIndex].anuncio = false; 
        calendarPosts[postIndex].nota_cancelacion = reason; 
    }
    alert("¡Anuncio cancelado!"); 
    closeModal('cancelAdModal'); 
    checkPendingCalendarAds(); 
}

/**
 * Renderizado de Cards de Campañas
 */
function renderAds() {
    const grid = document.getElementById('campaignList'); 
    if (!grid) return;
    grid.innerHTML = '';

    dbAds.forEach((ad, idx) => {
        let badgeClass = ad.plataforma_origen === 'Meta' ? 'badge-meta' : (ad.plataforma_origen === 'Google' ? 'badge-google' : 'badge-tiktok');
        let cardClass = ad.estado === 'Finalizada' ? 'finalizada' : ''; 
        let estadoLabel = ad.estado === 'Activa' ? '<span style="color:#10b981;">● Activa</span>' : `<span>${ad.estado}</span>`;
        let fechaInicio = ad.fecha_inicio ? ad.fecha_inicio.split('T')[0] : ''; 
        let fechaFin = ad.fecha_fin ? ad.fecha_fin.split('T')[0] : '';
        
        let res = ad.resultados;
        if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e){ res = {}; } }

        let resultadosHtml = '';
        if (res && (res.impresiones || res.clics)) {
            resultadosHtml = `
                <div class="camp-results">
                    <div class="results-box">
                        <div class="res-metrics">
                            <span title="Impresiones"><i class="bi bi-eye"></i> ${res.impresiones.toLocaleString()}</span>
                            <span title="Clics"><i class="bi bi-hand-index"></i> ${res.clics.toLocaleString()}</span>
                            <span title="CTR">CTR: ${res.ctr || 0}%</span>
                        </div>
                        <div class="res-evals">
                            <div class="eval-badge user"><span><i class="bi bi-person-workspace"></i> Publicista:</span> <span>${ad.eval_manual || 'Pendiente'}</span></div>
                            <div class="eval-badge system"><span><i class="bi bi-robot"></i> Sistema:</span> <span>${ad.eval_sistema || 'Pendiente'}</span></div>
                        </div>
                    </div>
                </div>`;
        } else { 
            resultadosHtml = `<div class="camp-results empty">Recopilando datos de rendimiento...</div>`; 
        }

        grid.innerHTML += `
            <div class="campaign-card ${cardClass}" onclick="openAdModal(${idx})">
                <div class="camp-title">${ad.nombre_campana} <span class="camp-badge ${badgeClass}">${ad.plataforma_origen}</span></div>
                <div style="font-size:0.85rem; color:#6b7280; margin-bottom:10px;">Inicio: ${fechaInicio} | ${ad.es_continuo ? 'Continua' : `Fin: ${fechaFin}`}</div>
                <div class="camp-data">
                    <div><strong>$ ${parseFloat(ad.presupuesto_diario || 0).toFixed(2)}</strong> / día</div>
                    <div>${estadoLabel}</div>
                </div>
                ${resultadosHtml}
            </div>`;
    });
}

function switchTab(evt, tabName) {
    if (evt && evt.preventDefault) evt.preventDefault(); 
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    if (evt) evt.currentTarget.classList.add("active");
}

function openAdModal(idx = null) {
    const form = document.getElementById('adsForm');
    if (!form) return;
    form.reset(); 
    
    document.getElementById('adId').value = ''; 
    document.getElementById('adPostId').value = ''; 
    document.getElementById('displayTotalBudget').innerText = '$ 0.00'; 
    document.getElementById('tabResultsBtn').style.display = 'none'; 
    document.getElementById('btnStopAd').style.display = 'none'; 
    document.getElementById('evalSystem').innerText = 'Pendiente...';
    
    // Abrir la primera pestaña por defecto
    const tabs = document.querySelectorAll('.tab-btn');
    if (tabs.length > 0) tabs[0].click();

    if (idx !== null) {
        const ad = dbAds[idx]; 
        document.getElementById('modalTitle').innerText = 'Gestionar Campaña'; 
        document.getElementById('adId').value = ad.id; 
        document.getElementById('adPostId').value = ad.post_id || ''; 
        document.getElementById('adName').value = ad.nombre_campana; 
        document.getElementById('adPlatform').value = ad.plataforma_origen; 
        document.getElementById('adPlacement').value = ad.ubicacion_red || ''; 
        document.getElementById('adDailyBudget').value = ad.presupuesto_diario; 
        document.getElementById('adStartDate').value = ad.fecha_inicio ? ad.fecha_inicio.split('T')[0] : '';
        
        if (ad.es_continuo) {
            document.getElementById('adContinuous').checked = true;
        } else {
            document.getElementById('adEndDate').value = ad.fecha_fin ? ad.fecha_fin.split('T')[0] : '';
        }

        document.getElementById('audAge').value = ad.publico_edad || ''; 
        document.getElementById('audGender').value = ad.publico_genero || ''; 
        document.getElementById('audLocation').value = ad.publico_ubicacion || ''; 
        document.getElementById('audInterests').value = ad.publico_intereses || '';

        let res = ad.resultados; 
        if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e){ res = {}; } }
        
        if (res && (res.impresiones || res.clics)) { 
            document.getElementById('resImpressions').value = res.impresiones || ''; 
            document.getElementById('resClicks').value = res.clics || ''; 
            document.getElementById('resCpc').value = res.cpc || ''; 
            document.getElementById('resCtr').value = res.ctr || ''; 
            document.getElementById('evalManual').value = ad.eval_manual || ''; 
            runSystemEvaluation(); 
        }
        
        calculateBudget(); 
        document.getElementById('tabResultsBtn').style.display = 'block'; 
        if(ad.estado === 'Activa') document.getElementById('btnStopAd').style.display = 'block';
    } else { 
        document.getElementById('modalTitle').innerText = 'Nueva Campaña Publicitaria'; 
    }
    document.getElementById('adModal').classList.add('active');
}

function createAdFromCalendar(postId, titulo, fecha, plataforma) {
    openAdModal(); 
    document.getElementById('adPostId').value = postId; 
    document.getElementById('adName').value = `Promo: ${titulo}`; 
    document.getElementById('adStartDate').value = fecha;
    let platMatch = 'Meta'; 
    if(plataforma === 'Google' || plataforma === 'TikTok') platMatch = plataforma; 
    document.getElementById('adPlatform').value = platMatch;
}

function closeModal(modalId) { 
    const id = modalId || 'adModal';
    document.getElementById(id).classList.remove('active'); 
}

function calculateBudget() {
    const daily = parseFloat(document.getElementById('adDailyBudget').value) || 0; 
    const start = document.getElementById('adStartDate').value; 
    const end = document.getElementById('adEndDate').value; 
    const isCont = document.getElementById('adContinuous').checked; 
    const display = document.getElementById('displayTotalBudget');

    if (isCont) { 
        document.getElementById('adEndDate').disabled = true; 
        document.getElementById('adEndDate').value = ''; 
        display.innerHTML = '<span style="font-size:1rem;">♾️ Continua</span>'; 
        return; 
    }
    document.getElementById('adEndDate').disabled = false;
    if (start && end && daily > 0) { 
        const d1 = new Date(start); 
        const d2 = new Date(end); 
        const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1; 
        display.innerHTML = diffDays > 0 ? `$ ${(diffDays * daily).toFixed(2)}` : 'Fechas inválidas'; 
    } else { 
        display.innerHTML = '$ 0.00'; 
    }
}

// Evaluación automática de rendimiento
const ctrInput = document.getElementById('resCtr');
const cpcInput = document.getElementById('resCpc');
if(ctrInput) ctrInput.addEventListener('input', runSystemEvaluation); 
if(cpcInput) cpcInput.addEventListener('input', runSystemEvaluation);

function runSystemEvaluation() {
    const ctr = parseFloat(document.getElementById('resCtr').value) || 0; 
    const cpc = parseFloat(document.getElementById('resCpc').value) || 0; 
    const evalBox = document.getElementById('evalSystem');
    if (!evalBox) return;

    if (ctr === 0 && cpc === 0) { evalBox.innerText = 'Pendiente...'; evalBox.style.color = '#0d6efd'; return; }
    if (ctr >= 2.0 && cpc <= 0.20) { evalBox.innerText = 'Exitosa 🔥'; evalBox.style.color = '#10b981'; } 
    else if (ctr >= 1.0 && cpc <= 0.50) { evalBox.innerText = 'Buena 👍'; evalBox.style.color = '#3b82f6'; } 
    else if (ctr >= 0.5 && cpc <= 1.00) { evalBox.innerText = 'Regular 😐'; evalBox.style.color = '#f59e0b'; } 
    else { evalBox.innerText = 'Mala 📉'; evalBox.style.color = '#ef4444'; }
}

// === GESTIÓN DE AUDIENCIAS (TARGETING) ===
function updateAudienceSelectors() {
    const selector = document.getElementById('savedAudienceSelector'); 
    if(!selector) return;
    selector.innerHTML = '<option value="">-- Crear segmentación personalizada --</option>';
    savedAudiences.forEach(aud => { 
        selector.innerHTML += `<option value="${aud.id}">${aud.nombre}</option>`; 
    });
}

function renderAudienceList() {
    const container = document.getElementById('audienceListContainer'); 
    if(!container) return;
    container.innerHTML = '';
    savedAudiences.forEach(aud => { 
        container.innerHTML += `
            <div class="audience-item">
                <div>
                    <h5>${aud.nombre}</h5>
                    <p><strong>${aud.edad} | ${aud.genero}</strong> - ${aud.ubicacion}</p>
                    <p style="color:#0d6efd; font-size:0.75rem;">${aud.intereses}</p>
                </div>
                <button type="button" class="btn-outline" style="border-color:#fca5a5; color:#ef4444; padding: 4px 8px;" onclick="deleteAudience(${aud.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>`; 
    });
}

function loadSavedAudienceIntoAd(audId) {
    if (!audId) { 
        document.getElementById('audAge').value = ''; 
        document.getElementById('audGender').value = ''; 
        document.getElementById('audLocation').value = ''; 
        document.getElementById('audInterests').value = ''; 
        return; 
    }
    const aud = savedAudiences.find(a => a.id == audId);
    if(aud) { 
        document.getElementById('audAge').value = aud.edad; 
        document.getElementById('audGender').value = aud.genero; 
        document.getElementById('audLocation').value = aud.ubicacion; 
        document.getElementById('audInterests').value = aud.intereses; 
    }
}

async function createNewAudienceDirectly(e) {
    if(e) e.preventDefault();
    const payload = { 
        nombre: document.getElementById('mgrAudName').value, 
        edad: document.getElementById('mgrAudAge').value, 
        genero: document.getElementById('mgrAudGender').value, 
        ubicacion: document.getElementById('mgrAudLocation').value, 
        intereses: document.getElementById('mgrAudInterests').value 
    };
    try { 
        await apiFetch(API_AUDIENCES, { method: 'POST', body: JSON.stringify(payload) }); 
        document.getElementById('newAudienceForm').reset(); 
        loadAllData(); 
        alert("¡Público guardado!"); 
    } catch(e) { console.error(e); }
}

async function deleteAudience(id) { 
    if(confirm("¿Seguro que deseas eliminar este público?")) { 
        try { 
            await apiFetch(`${API_AUDIENCES}/${id}`, { method: 'DELETE' }); 
            loadAllData(); 
        } catch(e) { console.error(e); } 
    } 
}

function openAudienceManagerModal() { document.getElementById('audienceManagerModal').classList.add('active'); }

// === PERSISTENCIA DE CAMPAÑA ===
async function saveAd(e) {
    if(e) e.preventDefault();
    
    // Guardar audiencia al vuelo si el checkbox está activo
    if(document.getElementById('saveAudienceOnTheFly')?.checked) {
        const audName = document.getElementById('newAudienceName').value;
        if(audName) { 
            await apiFetch(API_AUDIENCES, { 
                method: 'POST', 
                body: JSON.stringify({ 
                    nombre: audName, 
                    edad: document.getElementById('audAge').value, 
                    genero: document.getElementById('audGender').value, 
                    ubicacion: document.getElementById('audLocation').value, 
                    intereses: document.getElementById('audInterests').value 
                }) 
            }); 
        }
    }

    const id = document.getElementById('adId').value; 
    const postId = document.getElementById('adPostId').value;
    const resultados = { 
        impresiones: parseInt(document.getElementById('resImpressions').value) || 0, 
        clics: parseInt(document.getElementById('resClicks').value) || 0, 
        cpc: parseFloat(document.getElementById('resCpc').value) || 0, 
        ctr: parseFloat(document.getElementById('resCtr').value) || 0 
    };

    const payload = { 
        post_id: postId ? parseInt(postId) : null, 
        nombre_campana: document.getElementById('adName').value, 
        plataforma_origen: document.getElementById('adPlatform').value, 
        ubicacion_red: document.getElementById('adPlacement').value, 
        publico_edad: document.getElementById('audAge').value, 
        publico_genero: document.getElementById('audGender').value, 
        publico_ubicacion: document.getElementById('audLocation').value, 
        publico_intereses: document.getElementById('audInterests').value, 
        presupuesto_diario: parseFloat(document.getElementById('adDailyBudget').value), 
        fecha_inicio: document.getElementById('adStartDate').value, 
        fecha_fin: document.getElementById('adContinuous').checked ? null : document.getElementById('adEndDate').value, 
        es_continuo: document.getElementById('adContinuous').checked, 
        estado: (resultados.impresiones > 0 && !document.getElementById('adContinuous').checked && new Date(document.getElementById('adEndDate').value) < new Date()) ? 'Finalizada' : 'Activa', 
        resultados: resultados, 
        eval_manual: document.getElementById('evalManual').value, 
        eval_sistema: document.getElementById('evalSystem').innerText 
    };

    const method = id ? 'PUT' : 'POST'; 
    const url = id ? `${API_CAMPAIGNS}/${id}` : API_CAMPAIGNS;

    try { 
        await apiFetch(url, { method: method, body: JSON.stringify(payload) }); 
        closeModal('adModal'); 
        loadAllData(); 
    } catch(err) { 
        console.error(err); 
        alert('Error al guardar campaña'); 
    }
}

function stopCampaign() { 
    if(confirm("¿Pausar inversión y detener campaña?")) { 
        document.getElementById('btnStopAd').style.display = 'none'; 
        const tabs = document.querySelectorAll('.tab-btn');
        if(tabs.length > 2) tabs[2].click(); // Mover a la pestaña de resultados
    } 
}

function goToAdsManager(e) { e.stopPropagation(); window.location.href = 'mkt_ads.html'; }
function goToOfflineManager(e) { e.stopPropagation(); window.location.href = 'mkt_offline.html'; }