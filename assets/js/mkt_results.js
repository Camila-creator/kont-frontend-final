/* =========================================================
   DASHBOARD DE RESULTADOS Y ROI JS (Integrado con Kont)
   ========================================================= */

// 1. Configuración de Endpoints (Heredando de main.js)
const API_RESULTS = `${API_BASE}/mkt-results`;

// 2. Estado Global de Gráficos
let chartFinanzasInstance = null;
let chartDistribucionInstance = null;

// 3. Inicialización
document.addEventListener('DOMContentLoaded', () => { 
    updateDashboard(); 
});

/**
 * FETCH DE DATOS DESDE EL BACKEND
 * Obtiene métricas financieras y de rendimiento filtradas por tiempo.
 */
async function updateDashboard() {
    const filterEl = document.getElementById('timeFilter');
    const filter = filterEl ? filterEl.value : 'mes'; // Fallback por si el select no carga
    
    try {
        // apiFetch ya maneja el token y errores 401/403 desde main.js
        const json = await apiFetch(`${API_RESULTS}?filter=${filter}`);
        
        if (json && json.success) {
            const data = json.data;
            
            // Renderizado de componentes
            renderKPIs(data.kpis);
            renderChartFinanzas(data.graficoFinanzas);
            renderChartDistribucion(data.graficoDistribucion);
            renderSalondeLaFama(data.topPerformers);
        }
    } catch (error) { 
        console.error("Error cargando dashboard en tiempo real:", error); 
    }
}

/**
 * ACTUALIZAR TARJETAS (Métricas de Negocio)
 * Calcula el ROI dinámicamente y ajusta los colores de éxito/pérdida.
 */
function renderKPIs(kpis) {
    const safeSetText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    safeSetText('val-ingresos', `$ ${kpis.ingresos.toLocaleString('en-US')}`);
    safeSetText('val-gastos', `$ ${kpis.gastos.toLocaleString('en-US')}`);
    safeSetText('val-seguidores', `+${(kpis.seguidores || 0).toLocaleString('en-US')}`);
    
    let roi = 0;
    if (kpis.gastos > 0) roi = ((kpis.ingresos - kpis.gastos) / kpis.gastos) * 100;

    const roiEl = document.getElementById('val-roi');
    const roiSubEl = document.getElementById('val-roi-sub');

    if (roiEl) {
        roiEl.innerText = `${roi.toFixed(1)}%`;
        
        if (roi > 0) {
            roiEl.style.color = '#16a34a'; 
            if (roiSubEl) {
                roiSubEl.innerHTML = `<i class="bi bi-graph-up-arrow"></i> Retorno Positivo`; 
                roiSubEl.style.color = '#16a34a';
            }
        } else if (roi < 0) {
            roiEl.style.color = '#ef4444'; 
            if (roiSubEl) {
                roiSubEl.innerHTML = `<i class="bi bi-graph-down-arrow"></i> Pérdida MKT`; 
                roiSubEl.style.color = '#ef4444';
            }
        } else {
            roiEl.style.color = '#4f46e5'; 
            if (roiSubEl) {
                roiSubEl.innerHTML = `Punto de equilibrio`; 
                roiSubEl.style.color = '#4f46e5';
            }
        }
    }
}

/**
 * GRÁFICO: FINANZAS (Barras Comparativas)
 */
function renderChartFinanzas(dataGrafico) {
    const canvas = document.getElementById('chartFinanzas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (chartFinanzasInstance) chartFinanzasInstance.destroy();

    chartFinanzasInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dataGrafico.etiquetas,
            datasets: [
                { 
                    label: 'Ventas ($)', 
                    data: dataGrafico.ingresos, 
                    backgroundColor: 'rgba(22, 163, 74, 0.8)', 
                    borderRadius: 6, 
                    barPercentage: 0.6 
                },
                { 
                    label: 'Inversión MKT ($)', 
                    data: dataGrafico.gastos, 
                    backgroundColor: 'rgba(239, 68, 68, 0.8)', 
                    borderRadius: 6, 
                    barPercentage: 0.6 
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } }, 
                tooltip: { mode: 'index', intersect: false } 
            }, 
            scales: { 
                y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#e5e7eb' } }, 
                x: { grid: { display: false } } 
            } 
        }
    });
}

/**
 * GRÁFICO: DISTRIBUCIÓN (Canales de Inversión)
 */
function renderChartDistribucion(dataDistribucion) {
    const canvas = document.getElementById('chartDistribucion');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (chartDistribucionInstance) chartDistribucionInstance.destroy();

    chartDistribucionInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Meta Ads', 'Publicidad Offline', 'Influencers / PR'],
            datasets: [{ 
                label: 'Inversión Total ($)', 
                data: [dataDistribucion.ads, dataDistribucion.offline, dataDistribucion.influencers], 
                backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(236, 72, 153, 0.8)'], 
                borderRadius: 6 
            }]
        },
        options: { 
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { display: false }, 
                tooltip: { callbacks: { label: (ctx) => `$ ${ctx.parsed.x.toLocaleString('en-US')}` } } 
            }, 
            scales: { 
                x: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#e5e7eb' } }, 
                y: { grid: { display: false } } 
            } 
        }
    });
}

/**
 * SALÓN DE LA FAMA (Mejores Rendimientos)
 */
function renderSalondeLaFama(top) {
    if(!top) return;
    
    const setFame = (idName, idMetric, data) => {
        const elName = document.getElementById(idName);
        const elMetric = document.getElementById(idMetric);
        if (elName) elName.innerText = data.nombre || 'N/A';
        if (elMetric) elMetric.innerText = data.metrica || '-';
    };

    setFame('fame-influencer', 'fame-influencer-metric', top.influencer);
    setFame('fame-campana', 'fame-campana-metric', top.campana);
    setFame('fame-post', 'fame-post-metric', top.post);
    setFame('fame-persona', 'fame-persona-metric', top.persona);
}