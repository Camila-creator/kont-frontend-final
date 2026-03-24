// frontend/assets/js/reportes_uso.js

const API_USAGE = "http://https://kont-backend-final.onrender.com/api/reportes-globales/usage";
const tbody = document.querySelector("#usage-table tbody");

document.addEventListener("DOMContentLoaded", () => {
    loadUsageReports();
});

async function apiFetch(url) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) { localStorage.removeItem("agromedic_token"); window.location.replace("../pages/login.html"); return; }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json.data || [];
}

async function loadUsageReports() {
    try {
        const reports = await apiFetch(API_USAGE);
        renderTable(reports);
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 20px;">Error cargando el reporte. Asegúrate de ser Súper Admin.</td></tr>`;
    }
}

function renderTable(reports) {
    tbody.innerHTML = "";

    if (!reports || reports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">No hay datos para mostrar.</td></tr>`;
        return;
    }

    reports.forEach((r, index) => {
        const ranking = index + 1;
        let rankIcon = `<strong>#${ranking}</strong>`;
        
        // Ponemos medallas a los 3 primeros lugares (Gamificación)
        if (ranking === 1) rankIcon = `<i class="bi bi-trophy-fill" style="color: #eab308; font-size: 1.2rem;"></i>`; // Oro
        if (ranking === 2) rankIcon = `<i class="bi bi-trophy-fill" style="color: #94a3b8; font-size: 1.2rem;"></i>`; // Plata
        if (ranking === 3) rankIcon = `<i class="bi bi-trophy-fill" style="color: #b45309; font-size: 1.2rem;"></i>`; // Bronce

        const statusBadge = r.is_active 
            ? `<span style="background:#dcfce7; color:#16a34a; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">Activo</span>`
            : `<span style="background:#fee2e2; color:#dc2626; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">Suspendido</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="text-align: center;">${rankIcon}</td>
            <td style="font-weight: 700;">${r.empresa}</td>
            <td style="text-align: center;" class="stat-highlight">${Number(r.total_pedidos).toLocaleString()}</td>
            <td style="text-align: center;">${Number(r.total_clientes).toLocaleString()}</td>
            <td style="text-align: center;">${Number(r.total_productos).toLocaleString()}</td>
            <td style="text-align: right;" class="money-highlight">$ ${Number(r.volumen_dinero).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td style="text-align: center;">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}