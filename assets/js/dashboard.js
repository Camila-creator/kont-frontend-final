/* =========================================================
   DASHBOARD PRINCIPAL (HOME) JS - VERSION MEJORADA
   ========================================================= */

const API_MAIN_DASHBOARD = "https://kont-backend-final.onrender.com/api/dashboard-main";

let chartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    loadMainDashboard();
});

// === API FETCH CON TOKEN DE AUTORIZACIÓN ===
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, { 
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}`, 
            ...(options.headers || {}) 
        },
        ...options
    });
    
    if (res.status === 401 || res.status === 403) { 
        localStorage.removeItem("agromedic_token"); 
        window.location.replace("../pages/login.html"); 
        return; 
    }
    
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || data?.error || `Error: ${res.status}`);
    return data;
}

async function loadMainDashboard() {
    try {
        const response = await apiFetch(API_MAIN_DASHBOARD);
        
        // Verificamos que 'ok' sea true y que existan los datos
        if (response && response.ok) {
            // Pasamos los objetos específicos según la estructura de tu Controller
            renderKPIs(response.kpis);
            renderMainChart(response.chartData); // Usamos chartData que ya viene procesado
            renderStockAlerts(response.stockAlerts);
            renderRecentOrders(response.recentOrders);
            renderUrgentPayments(response.urgentPayments);
            renderMarketing(response.marketing);
        }
    } catch (err) {
        console.error("Error crítico cargando el dashboard:", err);
    }
}

// === RENDERIZADO DE KPIs (Ventas, Pedidos, CxC, Alertas) ===
function renderKPIs(kpis) {
    if (!kpis) return;

    const elVentas = document.getElementById("main-ventas");
    const elPedidos = document.getElementById("main-pedidos");
    const elCxc = document.getElementById("main-cxc");
    const elStock = document.getElementById("main-alertas");

    // Fix NaN: Aseguramos que si no hay dato, use 0 antes de formatear
    if (elVentas) {
        const ventas = Number(kpis.ventasMes || 0);
        elVentas.innerText = `$ ${ventas.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    if (elPedidos) {
        elPedidos.innerText = kpis.pedidosActivos || 0;
    }

    if (elCxc) {
        const cxc = Number(kpis.cxc || 0);
        elCxc.innerText = `$ ${cxc.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }
    
    if (elStock) {
        // Tu HTML original esperaba un formato específico para el badge de alertas
        const cantidadAlertas = kpis.stockCritico || 0;
        elStock.innerHTML = `${cantidadAlertas} <span style="font-size: 0.8rem; font-weight: 500; color:#64748b;">Items</span>`;
    }
}

// === RENDERIZADO DE GRÁFICA (Ventas vs Compras) ===
function renderMainChart(chartData) {
    const canvas = document.getElementById("mainChart");
    if (!canvas || !chartData) return;
    
    const ctx = canvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();

    // El backend ya envía los arrays listos: dias, ventas y compras
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.dias || [], 
            datasets: [
                {
                    label: 'Ventas ($)',
                    data: chartData.ventas || [],
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#0284c7',
                    borderWidth: 2
                },
                {
                    label: 'Compras ($)',
                    data: chartData.compras || [],
                    borderColor: '#ef4444',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#ef4444',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { borderDash: [4, 4], color: '#e2e8f0' },
                    ticks: { callback: (value) => '$' + value.toLocaleString() }
                },
                x: { grid: { display: false } }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

// === LISTADO DE STOCK CRÍTICO ===
function renderStockAlerts(alerts) {
    const container = document.getElementById("stock-alerts-container");
    if (!container) return; 
    container.innerHTML = "";

    if (!alerts || alerts.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 20px; color:#94a3b8; font-size:0.9rem;">No hay productos con stock bajo.</div>`;
        return;
    }

    alerts.forEach(item => {
        container.innerHTML += `
            <div class="alert-item">
                <div class="alert-info">
                    <h4>${item.nombre}</h4>
                    <p>Mínimo permitido: ${item.minimo}</p>
                </div>
                <div class="alert-stock">${item.actual}</div>
            </div>
        `;
    });
}

// === TABLA DE PEDIDOS RECIENTES ===
function renderRecentOrders(orders) {
    const tbody = document.getElementById("recent-orders-body");
    if (!tbody) return; 
    tbody.innerHTML = "";

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 20px; color:#94a3b8;">No hay pedidos recientes.</td></tr>`;
        return;
    }

    orders.forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:700; color:#64748b;">#${o.id}</td>
                <td style="font-weight:600; color:#1e293b;">${o.cliente}</td>
                <td style="text-align:right; font-weight:700; color:#0f766e;">$${Number(o.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
}

// === LISTADO DE PAGOS URGENTES (CXP) ===
function renderUrgentPayments(payments) {
    const container = document.getElementById("urgent-payments-container");
    if (!container) return;
    container.innerHTML = "";

    if (!payments || payments.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 20px; color:#94a3b8; font-size:0.9rem;">No hay pagos pendientes.</div>`;
        return;
    }

    payments.forEach(p => {
        // Usamos la propiedad 'p.estado' que el backend ya clasificó (critico, alerta, normal)
        container.innerHTML += `
            <div class="payment-item ${p.estado || ''}">
                <div class="pay-info">
                    <h4>${p.proveedor}</h4>
                    <p>Vence: ${p.vence}</p> 
                </div>
                <div class="pay-amount">$${Number(p.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
            </div>
        `;
    });
}

// === SECCIÓN DE MARKETING Y ROI ===
function renderMarketing(mkt) {
    if(!mkt) return;
    
    const elInversion = document.getElementById("main-mkt-spend");
    const roiEl = document.getElementById("main-mkt-roi");
    const elSeguidores = document.getElementById("main-mkt-followers");
    const elCampana = document.getElementById("main-mkt-top");

    if (elInversion) {
        elInversion.innerText = `$ ${Number(mkt.inversion || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }
    
    if (roiEl) {
        const roiValue = Number(mkt.roi || 0);
        roiEl.innerText = `${roiValue > 0 ? '+' : ''}${roiValue.toFixed(1)}%`;
        roiEl.style.color = roiValue > 0 ? '#10b981' : '#ef4444';
    }

    if (elSeguidores) {
        elSeguidores.innerText = `+${Number(mkt.seguidores || 0).toLocaleString()}`;
    }

    if (elCampana) {
        elCampana.innerText = mkt.topCampana || 'Sin datos';
    }
}