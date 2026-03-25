/* =========================================================
   INFLUENCERS & EMBAJADORES JS - Conectado a PostgreSQL
   ========================================================= */

const API_INFLUENCERS = 'https://kont-backend-final.onrender.com/api/mkt-influencers';
let dbInfluencers = [];

document.addEventListener('DOMContentLoaded', () => { loadInfluencers(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadInfluencers(); });

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

async function loadInfluencers() {
    try {
        const json = await apiFetch(API_INFLUENCERS);
        if(json && json.success) { dbInfluencers = json.data; renderDashboard(); renderInfluencers(); }
    } catch(e) { console.error("Error al cargar influencers", e); }
}

function renderDashboard() {
    let activos = 0; let inversionTotal = 0; let pendientesTotales = 0;
    dbInfluencers.forEach(inf => {
        if (inf.estatus === 'Activo' || inf.estatus === 'En Negociación') activos++;
        inversionTotal += parseFloat(inf.inversion) || 0;
        pendientesTotales += parseInt(inf.num_pendientes) || 0;
    });
    document.getElementById('dashActivos').innerText = activos;
    document.getElementById('dashInversion').innerText = `$ ${inversionTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('dashPendientes').innerText = pendientesTotales;
}

function renderInfluencers() {
    const grid = document.getElementById('influencerList');
    grid.innerHTML = '';
    
    dbInfluencers.forEach((inf, idx) => {
        let cardStatusClass = inf.estatus.toLowerCase().replace(' ', '-'); 
        let typeBadge = inf.tipo_contrato === 'Embajador' ? `<span class="badge badge-embajador"><i class="bi bi-shield-check"></i> Embajador</span>` : `<span class="badge badge-puntual">Puntual</span>`;
        let payBadge = '';
        if(inf.modalidad_pago === 'Solo Canje') payBadge = `<span class="badge badge-canje">Canje</span>`;
        if(inf.modalidad_pago === 'Solo Pago') payBadge = `<span class="badge badge-pago">Pago $</span>`;
        if(inf.modalidad_pago === 'Mixto') payBadge = `<span class="badge badge-embajador">Mixto</span>`;

        let pendientesHtml = inf.num_pendientes > 0 ? `<div style="background:#fffbeb; color:#d97706; padding:8px; border-radius:6px; font-size:0.8rem; margin-top:10px; border: 1px dashed #fcd34d;"><strong>Pendientes:</strong> ${inf.num_pendientes} pieza(s)</div>` : '';
        let cuotaHtml = (inf.tipo_contrato === 'Embajador' && inf.cuota) ? `<div class="data-row" style="color:#c026d3; font-weight:600;"><i class="bi bi-arrow-repeat me-1"></i> Cuota: ${inf.cuota}</div>` : '';

        grid.innerHTML += `
            <div class="inf-card ${cardStatusClass}" onclick="openInfluencerModal(${idx})">
                <div class="inf-header"><div class="inf-avatar">${inf.nombre.charAt(0).toUpperCase()}</div><div><h4 class="inf-name">${inf.nombre}</h4><p class="inf-handle">${inf.handle} <i class="bi bi-${inf.plataforma.toLowerCase()}"></i></p></div></div>
                <div class="inf-badges">${typeBadge}${payBadge}<span class="badge" style="background:#f3f4f6; color:#4b5563; border:1px solid #d1d5db;">${inf.nicho || 'Sin nicho'}</span></div>
                <div class="inf-data">
                    <div class="data-row"><span><strong>Estatus:</strong></span> <span>${inf.estatus}</span></div>
                    <div class="data-row"><span><strong>Seguidores:</strong></span> <span>${(inf.seguidores || 0).toLocaleString()}</span></div>
                    <div class="data-row"><span><strong>Evaluación:</strong></span> <span>${inf.evaluacion || 'Pendiente'}</span></div>
                    ${cuotaHtml}${pendientesHtml}
                </div>
            </div>
        `;
    });
}

function showCustomAlert(title, message, type = 'success') {
    const iconContainer = document.getElementById('alertIcon'); const btn = document.getElementById('alertBtn');
    if (type === 'success') { iconContainer.innerHTML = '<i class="bi bi-check-circle-fill" style="color: #10b981;"></i>'; btn.style.background = '#10b981'; btn.style.color = 'white'; } 
    else if (type === 'warning') { iconContainer.innerHTML = '<i class="bi bi-exclamation-triangle-fill" style="color: #f59e0b;"></i>'; btn.style.background = '#f59e0b'; btn.style.color = 'white'; }
    document.getElementById('alertTitle').innerText = title; document.getElementById('alertMessage').innerText = message; document.getElementById('customAlertModal').classList.add('active');
}

function switchTab(evt, tabName) {
    if (evt && evt.preventDefault) evt.preventDefault(); 
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function toggleEmbajadorBox() {
    const tipo = document.getElementById('infTipoContrato').value;
    document.getElementById('embajadorBox').style.display = (tipo === 'Embajador') ? 'block' : 'none';
}

function descontarEntregable() {
    let inputNum = document.getElementById('infNumPendientes'); let cajaTexto = document.getElementById('infPendientes');
    let currentCount = parseInt(inputNum.value) || 0;
    if (currentCount > 0) {
        inputNum.value = currentCount - 1;
        const today = new Date().toISOString().split('T')[0]; 
        cajaTexto.value = `[${today} - ✅ 1 Pieza Entregada]\n` + cajaTexto.value;
        cajaTexto.focus();
    } else { showCustomAlert("¡Todo al día!", "Este creador no tiene piezas pendientes en este momento.", "warning"); }
}

function openInfluencerModal(idx = null) {
    document.getElementById('influencerForm').reset(); document.getElementById('infId').value = '';
    document.querySelectorAll('.tab-btn')[0].click(); toggleEmbajadorBox(); 

    if (idx !== null) {
        const inf = dbInfluencers[idx];
        document.getElementById('modalTitle').innerText = 'Perfil del Creador'; document.getElementById('infId').value = inf.id;
        document.getElementById('infNombre').value = inf.nombre || ''; document.getElementById('infHandle').value = inf.handle || '';
        document.getElementById('infPlataforma').value = inf.plataforma || 'Instagram'; document.getElementById('infNicho').value = inf.nicho || '';
        document.getElementById('infSeguidores').value = inf.seguidores || ''; document.getElementById('infEstatus').value = inf.estatus || 'En Negociación';
        document.getElementById('infTelefono').value = inf.telefono || ''; document.getElementById('infLink').value = inf.link_perfil || '';
        document.getElementById('infTipoContrato').value = inf.tipo_contrato || 'Colaboración Puntual'; toggleEmbajadorBox(); 
        document.getElementById('infFechaInicio').value = inf.fecha_inicio ? inf.fecha_inicio.split('T')[0] : '';
        document.getElementById('infFechaFin').value = inf.fecha_fin ? inf.fecha_fin.split('T')[0] : '';
        document.getElementById('infCuota').value = inf.cuota || ''; document.getElementById('infModalidadPago').value = inf.modalidad_pago || 'Solo Canje';
        document.getElementById('infInversion').value = inf.inversion || ''; document.getElementById('infPendientes').value = inf.pendientes_texto || '';
        document.getElementById('infNumPendientes').value = inf.num_pendientes || 0; document.getElementById('infNotasResultados').value = inf.notas_resultados || '';
        document.getElementById('infLeads').value = inf.leads || ''; document.getElementById('infEvaluacion').value = inf.evaluacion || 'Pendiente';
    } else { document.getElementById('modalTitle').innerText = 'Registrar Nuevo Perfil'; }
    document.getElementById('influencerModal').classList.add('active');
}

function closeModal(id) { 
    if(id) { document.getElementById(id).classList.remove('active'); } else { document.getElementById('influencerModal').classList.remove('active'); }
}

async function saveInfluencer(e) {
    e.preventDefault();
    const id = document.getElementById('infId').value;
    const payload = {
        nombre: document.getElementById('infNombre').value, handle: document.getElementById('infHandle').value, plataforma: document.getElementById('infPlataforma').value, nicho: document.getElementById('infNicho').value,
        seguidores: parseInt(document.getElementById('infSeguidores').value) || 0, estatus: document.getElementById('infEstatus').value, telefono: document.getElementById('infTelefono').value, link_perfil: document.getElementById('infLink').value,
        tipo_contrato: document.getElementById('infTipoContrato').value, fecha_inicio: document.getElementById('infFechaInicio').value || null, fecha_fin: document.getElementById('infFechaFin').value || null, cuota: document.getElementById('infCuota').value,
        modalidad_pago: document.getElementById('infModalidadPago').value, inversion: parseFloat(document.getElementById('infInversion').value) || 0, num_pendientes: parseInt(document.getElementById('infNumPendientes').value) || 0, pendientes_texto: document.getElementById('infPendientes').value,
        notas_resultados: document.getElementById('infNotasResultados').value, leads: parseInt(document.getElementById('infLeads').value) || 0, evaluacion: document.getElementById('infEvaluacion').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_INFLUENCERS}/${id}` : API_INFLUENCERS;

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('influencerModal'); loadInfluencers(); showCustomAlert("¡Perfil Guardado!", "La información del creador ha sido actualizada.", "success");
    } catch(err) { console.error(err); alert('Hubo un error de conexión'); }
}