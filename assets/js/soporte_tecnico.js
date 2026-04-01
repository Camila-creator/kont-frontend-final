// frontend/assets/js/soporte_tecnico.js

// ✅ CAMBIO: Usamos ruta relativa para que el "cerebro" de main.js la maneje
const API_SOPORTE = "/soporte-global"; 
const filterSelect = document.getElementById("filter-status");

// Modal Elements
const modal = document.getElementById("ticket-modal");
const btnClose = document.getElementById("btn-close-ticket");
let currentTicketId = null;

document.addEventListener("DOMContentLoaded", () => {
    // Verificamos que el sistema base esté listo
    if (typeof apiFetch !== "function") {
        console.error("❌ main.js no detectado. El soporte no funcionará.");
        return;
    }

    loadTickets();

    // 📡 EL RADAR: Actualización automática inteligente
    setInterval(() => {
        // Solo recarga si no estás interactuando con un ticket (modal oculto)
        if (modal && modal.classList.contains("hidden")) {
            const currentFilter = filterSelect ? filterSelect.value : "ALL";
            loadTickets(currentFilter);
        }
    }, 10000); 

    // Eventos del Modal
    if(btnClose) btnClose.addEventListener("click", () => modal.classList.add("hidden"));
    
    // Botones de acción del Modal
    const btnProcess = document.getElementById("btn-mark-process");
    const btnResolved = document.getElementById("btn-mark-resolved");
    
    if (btnProcess) btnProcess.addEventListener("click", () => updateTicketStatus('EN PROCESO'));
    if (btnResolved) btnResolved.addEventListener("click", () => updateTicketStatus('RESUELTO'));

    // Filtro desplegable
    if(filterSelect) filterSelect.addEventListener("change", () => loadTickets(filterSelect.value));
});

// 🗑️ BORRADO: La función apiFetch local fue eliminada para usar la global.

async function loadTickets(statusFilter = "ALL") {
    const tbody = document.querySelector("#ticket-table tbody");
    if (!tbody) return;

    try {
        // Construimos la URL de forma limpia
        const endpoint = statusFilter === "ALL" ? API_SOPORTE : `${API_SOPORTE}?status=${statusFilter}`;
        
        // Llamamos a la API centralizada
        const res = await apiFetch(endpoint);
        
        // El main.js ya nos devuelve el JSON masticado
        const tickets = Array.isArray(res) ? res : (res.data || []);
        
        renderTable(tickets);
    } catch (err) {
        // El radar falla en silencio para no molestar, pero lo logueamos
        console.warn("Radar de soporte: El servidor no respondió a tiempo.");
    }
}

function renderTable(tickets) {
    const tbody = document.querySelector("#ticket-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 40px;">
            <i class="bi bi-check-circle" style="font-size: 2rem; color: #10b981;"></i><br>
            No hay tickets pendientes. ¡Todo bajo control! 🎉
        </td></tr>`;
        return;
    }

    tickets.forEach(t => {
        const badgeClass = t.status === 'EN PROCESO' ? "status-proceso" : 
                           t.status === 'RESUELTO' ? "status-resuelto" : "status-pendiente";

        let prioClass = "prio-baja";
        let prioIcon = "🟢 Baja";
        if (t.priority === 'ALTA') { prioClass = "prio-alta"; prioIcon = "🔴 Alta"; }
        if (t.priority === 'MEDIA') { prioClass = "prio-media"; prioIcon = "🟡 Media"; }

        const dateStr = new Date(t.created_at).toLocaleDateString('es-ES', { 
            day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' 
        });

        const tr = document.createElement("tr");
        // Guardamos el objeto en el dataset para recuperarlo fácil al hacer click
        tr.dataset.ticket = JSON.stringify(t); 
        tr.onclick = function() { openModal(this.dataset.ticket); };

        tr.innerHTML = `
            <td style="font-weight: 800; color: #94a3b8; vertical-align: middle;">#${String(t.id).padStart(4, '0')}</td>
            <td style="font-weight: 700; color: #0f172a; vertical-align: middle;">${t.empresa || 'Desconocida'}</td>
            <td style="vertical-align: middle;">
                <div style="font-weight: 600;">${t.usuario_nombre || 'Usuario'}</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">${t.usuario_email || ''}</div>
            </td>
            <td style="font-weight: 600; vertical-align: middle;">${t.subject}</td>
            <td style="text-align: center; vertical-align: middle;"><span class="prio-tag ${prioClass}">${prioIcon}</span></td>
            <td style="text-align: center; vertical-align: middle;"><span class="badge ${badgeClass}">${t.status}</span></td>
            <td style="text-align: right; color: #64748b; font-size: 0.85rem; vertical-align: middle;">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Abrir el detalle del Ticket
function openModal(ticketJson) {
    const t = JSON.parse(ticketJson);
    currentTicketId = t.id;

    document.getElementById("modal-ticket-title").innerText = `Ticket #${String(t.id).padStart(4, '0')}`;
    document.getElementById("modal-subject").innerText = t.subject;
    document.getElementById("modal-tenant").innerText = t.empresa || 'Desconocida';
    document.getElementById("modal-user").innerText = `${t.usuario_nombre || 'Usuario'} (${t.usuario_email || 'Sin correo'})`;
    document.getElementById("modal-priority").innerText = t.priority;
    document.getElementById("modal-date").innerText = new Date(t.created_at).toLocaleString('es-ES');
    document.getElementById("modal-message").innerText = t.message;

    modal.classList.remove("hidden");
}

// Actualizar estado del ticket
async function updateTicketStatus(newStatus) {
    if (!currentTicketId) return;
    
    try {
        await apiFetch(`${API_SOPORTE}/${currentTicketId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        modal.classList.add("hidden");
        // Recarga usando el filtro actual para que no se pierda la vista
        loadTickets(filterSelect ? filterSelect.value : 'ALL'); 
    } catch (err) {
        console.error("Error al actualizar ticket:", err);
        // Aquí podrías usar tu función global de alertas si la tienes
        alert("No se pudo actualizar el estado del ticket.");
    }
}