/* =========================================================
   DASHBOARD DE RESULTADOS Y ROI JS (Conectado a PostgreSQL)
   ========================================================= */

const API_RESULTS = 'https://kont-backend-final.onrender.com/api/mkt-results';

let chartFinanzasInstance = null;
let chartDistribucionInstance = null;

document.addEventListener('DOMContentLoaded', () => { updateDashboard(); });

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

// === 1. FETCH DE DATOS DESDE EL BACKEND ===
async function updateDashboard() {
    const filter = document.getElementById('timeFilter').value;
    try {
        const json = await apiFetch(`${API_RESULTS}?filter=${filter}`);
        if (json && json.success) {
            const data = json.data;
            renderKPIs(data.kpis);
            renderChartFinanzas(data.graficoFinanzas);
            renderChartDistribucion(data.graficoDistribucion);
            renderSalondeLaFama(data.topPerformers);
        }
    } catch (error) { console.error("Error cargando dashboard real:", error); }
}

// === 2. ACTUALIZAR TARJETAS (NÚMEROS DUROS) ===
function renderKPIs(kpis) {
    document.getElementById('val-ingresos').innerText = `$ ${kpis.ingresos.toLocaleString('en-US')}`;
    document.getElementById('val-gastos').innerText = `$ ${kpis.gastos.toLocaleString('en-US')}`;
    document.getElementById('val-seguidores').innerText = `+${(kpis.seguidores || 0).toLocaleString('en-US')}`;
    
    let roi = 0;
    if (kpis.gastos > 0) roi = ((kpis.ingresos - kpis.gastos) / kpis.gastos) * 100;

    const roiEl = document.getElementById('val-roi');
    const roiSubEl = document.getElementById('val-roi-sub');

    roiEl.innerText = `${roi.toFixed(1)}%`;
    
    if (roi > 0) {
        roiEl.style.color = '#16a34a'; roiSubEl.innerHTML = `<i class="bi bi-graph-up-arrow"></i> Retorno Positivo`; roiSubEl.style.color = '#16a34a';
    } else if (roi < 0) {
        roiEl.style.color = '#ef4444'; roiSubEl.innerHTML = `<i class="bi bi-graph-down-arrow"></i> Pérdida MKT`; roiSubEl.style.color = '#ef4444';
    } else {
        roiEl.style.color = '#4f46e5'; roiSubEl.innerHTML = `Punto de equilibrio`; roiSubEl.style.color = '#4f46e5';
    }
}

// === 3. GRÁFICO: FINANZAS ===
function renderChartFinanzas(dataGrafico) {
    const ctx = document.getElementById('chartFinanzas').getContext('2d');
    if (chartFinanzasInstance) chartFinanzasInstance.destroy();

    chartFinanzasInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dataGrafico.etiquetas,
            datasets: [
                { label: 'Ventas ($)', data: dataGrafico.ingresos, backgroundColor: 'rgba(22, 163, 74, 0.8)', borderRadius: 6, barPercentage: 0.6 },
                { label: 'Inversión MKT ($)', data: dataGrafico.gastos, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: 6, barPercentage: 0.6 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { mode: 'index', intersect: false } }, scales: { y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#e5e7eb' } }, x: { grid: { display: false } } } }
    });
}

// === 4. GRÁFICO: DISTRIBUCIÓN ===
function renderChartDistribucion(dataDistribucion) {
    const ctx = document.getElementById('chartDistribucion').getContext('2d');
    if (chartDistribucionInstance) chartDistribucionInstance.destroy();

    chartDistribucionInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Meta Ads', 'Publicidad Offline', 'Influencers / PR'],
            datasets: [{ label: 'Inversión Total ($)', data: [dataDistribucion.ads, dataDistribucion.offline, dataDistribucion.influencers], backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(236, 72, 153, 0.8)'], borderRadius: 6 }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return '$ ' + context.parsed.x.toLocaleString('en-US'); } } } }, scales: { x: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#e5e7eb' } }, y: { grid: { display: false } } } }
    });
}

// === 5. SALÓN DE LA FAMA ===
function renderSalondeLaFama(top) {
    if(!top) return;
    document.getElementById('fame-influencer').innerText = top.influencer.nombre || 'N/A';
    document.getElementById('fame-influencer-metric').innerText = top.influencer.metrica || '-';
    document.getElementById('fame-campana').innerText = top.campana.nombre || 'N/A';
    document.getElementById('fame-campana-metric').innerText = top.campana.metrica || '-';
    document.getElementById('fame-post').innerText = top.post.nombre || 'N/A';
    document.getElementById('fame-post-metric').innerText = top.post.metrica || '-';
    document.getElementById('fame-persona').innerText = top.persona.nombre || 'N/A';
    document.getElementById('fame-persona-metric').innerText = top.persona.metrica || '-';
}