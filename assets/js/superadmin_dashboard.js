// frontend/assets/js/superadmin_dashboard.js

// ✅ CAMBIO: Ruta relativa para el cerebro central
const API_DASHBOARD_SA = "/sa-dashboard/metrics";

document.addEventListener("DOMContentLoaded", () => {
    // Verificamos que el sistema base esté listo
    if (typeof apiFetch === "function") {
        loadSuperAdminDashboard();
    } else {
        console.error("❌ Error Crítico: No se detectó main.js");
    }
});

// 🗑️ BORRADO: La función apiFetch local fue eliminada.

async function loadSuperAdminDashboard() {
    try {
        // ✅ Ahora usamos la función global con protección anti-HTML
        const res = await apiFetch(API_DASHBOARD_SA);
        
        // El backend nos manda un objeto con 'stats', 'alerts', etc.
        const data = res.data || res; 
        
        if (!data.stats) throw new Error("Estructura de datos incompleta");

        // 1. Llenar KPIs (Métricas principales)
        document.getElementById("kpi-tenants").innerText = data.stats.total_tenants || 0;
        document.getElementById("kpi-users").innerText = data.stats.total_users || 0;
        document.getElementById("kpi-tickets").innerText = data.stats.pending_tickets || 0;
        document.getElementById("kpi-expiring").innerText = data.stats.expiring_soon || 0;

        // 2. Llenar Secciones Visuales
        renderAlerts(data.alerts || []);
        renderTopTenants(data.top_tenants || []);
        renderExpiring(data.expiring_tenants || []);
        renderLoyal(data.loyal_tenants || []);

    } catch (err) {
        console.error("Error en Dashboard:", err);
        const alertCont = document.getElementById("alerts-container");
        if (alertCont) {
            alertCont.innerHTML = `<p style="color:#ef4444; font-weight:600; text-align:center; padding:10px;">
                <i class="bi bi-wifi-off"></i> No se pudo conectar con el servidor de métricas.
            </p>`;
        }
    }
}

// --- DIBUJAR COMPONENTES (UX/UI) ---

function renderAlerts(alerts) {
    const container = document.getElementById("alerts-container");
    if (!container) return;
    container.innerHTML = "";
    
    if (alerts.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#10b981; padding: 20px;">
            <i class="bi bi-shield-check" style="font-size: 1.5rem;"></i><br>Todo en orden. No hay alertas.
        </div>`;
        return;
    }

    alerts.forEach(a => {
        const isWarning = a.type === 'warning';
        const boxClass = isWarning ? 'alert-box alert-warning' : 'alert-box';
        const icon = isWarning ? 'bi-exclamation-triangle-fill' : 'bi-x-octagon-fill';
        const color = isWarning ? '#f59e0b' : '#ef4444';
        
        container.innerHTML += `
            <div class="${boxClass}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 12px; border-radius: 8px; border-left: 4px solid ${color};">
                <div>
                    <i class="bi ${icon}" style="color:${color};"></i> 
                    <span style="font-weight: 600; color: #1e293b; margin-left: 8px;">${a.title}</span><br>
                    <small style="color: #64748b; margin-left: 24px;">${a.message}</small>
                </div>
                <a href="${a.link || '#'}" style="font-size: 0.8rem; color: #3b82f6; font-weight: 700;">GESTIONAR</a>
            </div>
        `;
    });
}

function renderTopTenants(tenants) {
    const container = document.getElementById("top-tenants-container");
    if (!container) return;
    container.innerHTML = "";
    
    tenants.slice(0, 5).forEach((t, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
        container.innerHTML += `
            <div class="list-item" style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <div>
                    <div style="font-weight: 700; color: #1e293b;">${medal} ${t.name}</div>
                    <small style="color: #94a3b8;">${t.owner_email || 'Sin contacto'}</small>
                </div>
                <div style="text-align: right;">
                    <span style="font-weight: 800; color: #8b5cf6;">${t.user_count}</span><br>
                    <small style="color: #cbd5e1; font-size: 0.7rem;">USUARIOS</small>
                </div>
            </div>
        `;
    });
}

function renderExpiring(tenants) {
    const container = document.getElementById("expiring-container");
    if (!container) return;
    container.innerHTML = "";
    
    if (tenants.length === 0) {
        container.innerHTML = `<p style="color: #94a3b8; font-size: 0.9rem; text-align: center;">Sin vencimientos próximos.</p>`;
        return;
    }

    tenants.forEach(t => {
        const color = t.days_left <= 7 ? '#ef4444' : '#f59e0b';
        container.innerHTML += `
            <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                <div>
                    <div style="font-weight: 700; color: #334155;">${t.name}</div>
                    <small style="color: #94a3b8;">Vence el ${new Date(t.license_expiry).toLocaleDateString()}</small>
                </div>
                <div style="background: ${color}15; color: ${color}; padding: 4px 10px; border-radius: 20px; font-weight: 800; font-size: 0.75rem;">
                    -${t.days_left} DÍAS
                </div>
            </div>
        `;
    });
}

function renderLoyal(tenants) {
    const container = document.getElementById("loyal-container");
    if (!container) return;
    container.innerHTML = "";
    
    tenants.forEach(t => {
        const joinDate = new Date(t.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        container.innerHTML += `
            <div class="list-item" style="display: flex; justify-content: space-between; padding: 10px 0;">
                <span style="font-weight: 600; color: #1e293b;">${t.name}</span>
                <span style="color: #64748b; font-size: 0.85rem;">Miembro desde ${joinDate}</span>
            </div>
        `;
    });
}