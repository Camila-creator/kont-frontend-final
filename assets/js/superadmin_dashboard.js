// frontend/assets/js/superadmin_dashboard.js

const API_DASHBOARD_SA = "http://localhost:4000/api/sa-dashboard/metrics";

document.addEventListener("DOMContentLoaded", () => {
    loadSuperAdminDashboard();
});

// Fetch con Gafete de Súper Admin
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        ...options
    });
    if (res.status === 401 || res.status === 403) { window.location.replace("../pages/login.html"); return; }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
}

// Cargar toda la data del Dashboard de golpe
async function loadSuperAdminDashboard() {
    try {
        const res = await apiFetch(API_DASHBOARD_SA);
        const data = res.data; // El backend nos mandará un súper JSON con todo
        
        // 1. Llenar KPIs
        document.getElementById("kpi-tenants").innerText = data.stats.total_tenants || 0;
        document.getElementById("kpi-users").innerText = data.stats.total_users || 0;
        document.getElementById("kpi-tickets").innerText = data.stats.pending_tickets || 0;
        document.getElementById("kpi-expiring").innerText = data.stats.expiring_soon || 0;

        // 2. Llenar Alertas
        renderAlerts(data.alerts);

        // 3. Llenar Top Clientes
        renderTopTenants(data.top_tenants);

        // 4. Llenar Próximos Vencimientos
        renderExpiring(data.expiring_tenants);

        // 5. Llenar Clientes Leales (Más antiguos)
        renderLoyal(data.loyal_tenants);

    } catch (err) {
        console.error("Error cargando Dashboard Súper Admin:", err);
        document.getElementById("alerts-container").innerHTML = `<p style="color:red;">Error al conectar con el servidor.</p>`;
    }
}

// DIBUJAR ALERTAS
function renderAlerts(alerts) {
    const container = document.getElementById("alerts-container");
    container.innerHTML = "";
    
    if (!alerts || alerts.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#10b981; font-weight:600;"><i class="bi bi-check-circle-fill"></i> ¡Todo en orden! No hay alertas críticas.</p>`;
        return;
    }

    alerts.forEach(a => {
        // a.type puede ser 'danger' (rojo) o 'warning' (amarillo)
        const isWarning = a.type === 'warning';
        const boxClass = isWarning ? 'alert-box alert-warning' : 'alert-box';
        const icon = isWarning ? '<i class="bi bi-exclamation-triangle-fill" style="color:#f59e0b;"></i>' : '<i class="bi bi-x-octagon-fill" style="color:#ef4444;"></i>';
        
        container.innerHTML += `
            <div class="${boxClass}">
                <div>
                    ${icon} <span style="font-weight: 600; color: #0f172a; margin-left: 5px;">${a.title}</span><br>
                    <small style="color: #475569;">${a.message}</small>
                </div>
                <a href="${a.link || '#'}" style="font-size: 0.85rem; color: #3b82f6; text-decoration: none; font-weight: 600;">Ver detalle</a>
            </div>
        `;
    });
}

// DIBUJAR TOP CLIENTES (Por cantidad de usuarios o actividad)
function renderTopTenants(tenants) {
    const container = document.getElementById("top-tenants-container");
    container.innerHTML = "";
    
    if (!tenants || tenants.length === 0) { container.innerHTML = "<p>No hay datos suficientes.</p>"; return; }

    tenants.forEach((t, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▪️';
        container.innerHTML += `
            <div class="list-item">
                <div>
                    <strong style="color: #1e293b;">${medal} ${t.name}</strong><br>
                    <small style="color: #64748b;">${t.email || 'Sin correo'}</small>
                </div>
                <div style="text-align: right;">
                    <span style="font-weight: 800; color: #3b82f6;">${t.user_count}</span><br>
                    <small style="color: #94a3b8;">Usuarios activos</small>
                </div>
            </div>
        `;
    });
}

// DIBUJAR PRÓXIMOS VENCIMIENTOS
function renderExpiring(tenants) {
    const container = document.getElementById("expiring-container");
    container.innerHTML = "";
    
    if (!tenants || tenants.length === 0) { container.innerHTML = "<p style='color: #64748b;'>Nadie vence en los próximos 30 días.</p>"; return; }

    tenants.forEach(t => {
        const daysLeft = t.days_left;
        let color = daysLeft <= 7 ? '#ef4444' : '#f59e0b'; // Rojo si faltan < 7 días, amarillo si es < 30
        
        container.innerHTML += `
            <div class="list-item">
                <div>
                    <strong style="color: #1e293b;">${t.name}</strong><br>
                    <small style="color: #64748b;">Vence: ${new Date(t.license_expiry).toLocaleDateString()}</small>
                </div>
                <div>
                    <span style="background: ${color}20; color: ${color}; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">
                        Quedan ${daysLeft} días
                    </span>
                </div>
            </div>
        `;
    });
}

// DIBUJAR CLIENTES MÁS ANTIGUOS
function renderLoyal(tenants) {
    const container = document.getElementById("loyal-container");
    container.innerHTML = "";
    
    if (!tenants || tenants.length === 0) { container.innerHTML = "<p>No hay datos.</p>"; return; }

    tenants.forEach(t => {
        const joinDate = new Date(t.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        container.innerHTML += `
            <div class="list-item">
                <div>
                    <strong style="color: #1e293b;">${t.name}</strong>
                </div>
                <div style="color: #64748b; font-size: 0.85rem;">
                    Desde ${joinDate}
                </div>
            </div>
        `;
    });
}