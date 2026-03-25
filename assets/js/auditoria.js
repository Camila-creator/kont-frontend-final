/**
 * auditoria.js - Gestión de trazabilidad Agromedic Admin
 */

// Estado global de los datos para filtrado local
let allLogs = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchAuditLogs();
    setupFilters();
});

/**
 * Obtiene los logs desde el backend
 */
async function fetchAuditLogs() {
    const tbody = document.querySelector("#audit-table tbody");
    
    try {
        const backendURL = 'https://kont-backend-final.onrender.com/api/audit';
        
        const response = await fetch(backendURL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('agromedic_token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if(response.status === 403) throw new Error("Acceso denegado: Solo Super Admin");
            throw new Error("No se pudo obtener la información de auditoría");
        }

        const result = await response.json();
        allLogs = result.data || [];
        renderAuditData(allLogs);

    } catch (error) {
        console.error("Error al cargar auditoría:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px; color:#ef4444;">
                    <i class="bi bi-exclamation-triangle" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                    ${error.message}
                </td>
            </tr>`;
    }
}

/**
 * Renderiza los datos en la tabla
 */
function renderAuditData(logs) {
    const tbody = document.querySelector("#audit-table tbody");
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px; color: #64748b;">
                    No hay registros de actividad que coincidan con la búsqueda.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const config = getActionConfig(log.action);
        const fechaFormateada = formatSQLDate(log.created_at);
        
        const nameParts = log.user_name ? log.user_name.split(' ') : ['S', 'I'];
        const iniciales = (nameParts[0][0] + (nameParts[1] ? nameParts[1][0] : '')).toUpperCase();

        return `
    <tr>
        <td data-label="Fecha" style="color: #64748b; font-weight: 500; white-space: nowrap;">
            <i class="bi bi-clock"></i> ${fechaFormateada}
        </td>
        <td data-label="Usuario">
            <div class="user-pill">
                <div class="user-avatar">${iniciales}</div>
                <div>
                    <div style="font-weight:700;">${log.user_name || 'Sistema'}</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">${log.tenant_name || 'Agromedic'}</div>
                </div>
            </div>
        </td>
        <td data-label="Acción" style="text-align: center;">
            <span class="badge ${config.clase}"><i class="bi ${config.icono}"></i> ${log.action}</span>
        </td>
        <td data-label="Módulo"><span class="module-tag">${log.module}</span></td>
        <td data-label="Detalle">${log.description}</td>
        <td data-label="IP" style="text-align: center;"><span class="ip-text">${log.ip_address || '127.0.0.1'}</span></td>
    </tr>
`;
    }).join('');
}

/**
 * Configuración de Filtros, Buscador y Exportación
 */
function setupFilters() {
    const searchInput = document.getElementById("audit-search");
    const dateInput = document.getElementById("audit-date");
    const filterItems = document.querySelectorAll(".filter-item");
    const btnExport = document.getElementById("btn-export-csv");

    // Buscador en tiempo real
    searchInput.addEventListener("input", applyFilters);
    
    // Filtro por fecha
    dateInput.addEventListener("change", applyFilters);

    // Filtros por Módulo
    filterItems.forEach(item => {
        item.addEventListener("click", () => {
            filterItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            applyFilters();
        });
    });

    // Función unificada de filtrado
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedDate = dateInput.value; // Formato YYYY-MM-DD
        const activeModule = document.querySelector(".filter-item.active").textContent.trim().toUpperCase();

        const filtered = allLogs.filter(log => {
            const matchesSearch = 
                log.user_name?.toLowerCase().includes(searchTerm) ||
                log.description?.toLowerCase().includes(searchTerm) ||
                log.action?.toLowerCase().includes(searchTerm);
            
            const matchesModule = 
                activeModule === "TODOS" || 
                log.module?.toUpperCase() === activeModule;

            const matchesDate = 
                !selectedDate || 
                log.created_at.startsWith(selectedDate);

            return matchesSearch && matchesModule && matchesDate;
        });

        renderAuditData(filtered);
    }

    // Exportar a CSV
    btnExport.addEventListener("click", () => {
        if (allLogs.length === 0) return;
        
        let csvContent = "data:text/csv;charset=utf-8,Fecha,Usuario,Accion,Modulo,Descripcion,IP\n";
        allLogs.forEach(log => {
            const row = [
                formatSQLDate(log.created_at),
                log.user_name,
                log.action,
                log.module,
                log.description.replace(/,/g, "."), // Evitar romper el CSV con comas
                log.ip_address
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `auditoria_agromedic_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

/**
 * Helpers: Configuración visual y Formato
 */
function getActionConfig(action) {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('CREAR') || act.includes('INSERT')) {
        return { clase: 'b-create', icono: 'bi-plus-circle' };
    }
    if (act.includes('UPDATE') || act.includes('EDITAR') || act.includes('ACTUALIZAR')) {
        return { clase: 'b-update', icono: 'bi-pencil-square' };
    }
    if (act.includes('DELETE') || act.includes('ELIMINAR') || act.includes('BORRAR')) {
        return { clase: 'b-delete', icono: 'bi-trash3' };
    }
    return { clase: 'b-login', icono: 'bi-info-circle' }; 
}

function formatSQLDate(dateString) {
    if(!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}