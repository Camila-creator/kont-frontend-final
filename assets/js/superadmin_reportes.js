// frontend/assets/js/reportes_uso.js

// ✅ CAMBIO: Ahora usamos solo la ruta relativa
const API_USAGE = "/reportes-globales/usage";
const tbody = document.querySelector("#usage-table tbody");

document.addEventListener("DOMContentLoaded", () => {
    // Verificamos que el main.js ya cargó la función global
    if (typeof apiFetch === "function") {
        loadUsageReports();
    } else {
        console.error("❌ Error: main.js no ha cargado correctamente.");
    }
});

// 🗑️ BORRADO: La función apiFetch local se eliminó para usar la global del main.js

async function loadUsageReports() {
    try {
        // ✅ Ahora usamos la función global que ya maneja tokens y errores HTML
        const res = await apiFetch(API_USAGE);
        
        // Manejamos si el backend devuelve { data: [...] } o solo el [...]
        const reports = Array.isArray(res) ? res : (res.data || []);
        
        renderTable(reports);
    } catch (err) {
        console.error("Error en Reportes:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 20px;">
                <i class="bi bi-exclamation-triangle"></i><br>
                Error cargando el reporte. Asegúrate de tener permisos de Súper Admin.
            </td></tr>`;
        }
    }
}

function renderTable(reports) {
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!reports || reports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">No hay datos de uso para mostrar todavía.</td></tr>`;
        return;
    }

    reports.forEach((r, index) => {
        const ranking = index + 1;
        let rankIcon = `<strong>#${ranking}</strong>`;
        
        // 🏆 Gamificación de Kont (Medallas)
        if (ranking === 1) rankIcon = `<i class="bi bi-trophy-fill" style="color: #eab308; font-size: 1.2rem;" title="Líder de Ventas"></i>`; 
        if (ranking === 2) rankIcon = `<i class="bi bi-trophy-fill" style="color: #94a3b8; font-size: 1.2rem;"></i>`; 
        if (ranking === 3) rankIcon = `<i class="bi bi-trophy-fill" style="color: #b45309; font-size: 1.2rem;"></i>`; 

        const statusBadge = r.is_active 
            ? `<span class="badge-status active">Activo</span>`
            : `<span class="badge-status suspended">Suspendido</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="text-align: center; vertical-align: middle;">${rankIcon}</td>
            <td style="font-weight: 700; vertical-align: middle;">${r.empresa || 'Empresa Desconocida'}</td>
            <td style="text-align: center; vertical-align: middle;" class="stat-highlight">${Number(r.total_pedidos || 0).toLocaleString()}</td>
            <td style="text-align: center; vertical-align: middle;">${Number(r.total_clientes || 0).toLocaleString()}</td>
            <td style="text-align: center; vertical-align: middle;">${Number(r.total_productos || 0).toLocaleString()}</td>
            <td style="text-align: right; vertical-align: middle; font-family: monospace; font-weight: bold; color: #059669;">
                $ ${Number(r.volumen_dinero || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
            </td>
            <td style="text-align: center; vertical-align: middle;">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}