// frontend/assets/js/soporte_tecnico.js

const API_SOPORTE = "https://kont-backend-final.onrender.com/api/soporte-global";
const filterSelect = document.getElementById("filter-status");

// Modal Elements
const modal = document.getElementById("ticket-modal");
const btnClose = document.getElementById("btn-close-ticket");
let currentTicketId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadTickets();

    // 📡 EL RADAR: Actualizar la tabla automáticamente cada 10 segundos
    setInterval(() => {
        // Solo recarga si el modal está oculto (para no interrumpirte si estás leyendo)
        if (modal.classList.contains("hidden")) {
            loadTickets(filterSelect ? filterSelect.value : "ALL");
        }
    }, 10000); // 10000 milisegundos = 10 segundos

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

// Fetch con el gafete de Súper Admin
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

// Cargar tabla (Súper Admin)
async function loadTickets(statusFilter = "ALL") {
    const tbody = document.querySelector("#ticket-table tbody");
    if (!tbody) return; // 🛡️ Escudo protector

    try {
        const url = statusFilter === "ALL" ? API_SOPORTE : `${API_SOPORTE}?status=${statusFilter}`;
        const res = await apiFetch(url);
        renderTable(res.data);
    } catch (err) {
        console.error("Error del radar:", err);
    }
}

function renderTable(tickets) {
    const tbody = document.querySelector("#ticket-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">No hay tickets de soporte registrados. ¡Todo funciona perfecto! 🎉</td></tr>`;
        return;
    }

    tickets.forEach(t => {
        let badgeClass = "status-pendiente";
        if (t.status === 'EN PROCESO') badgeClass = "status-proceso";
        if (t.status === 'RESUELTO') badgeClass = "status-resuelto";

        let prioClass = "prio-baja";
        let prioIcon = "🟢 Baja";
        if (t.priority === 'ALTA') { prioClass = "prio-alta"; prioIcon = "🔴 Alta"; }
        if (t.priority === 'MEDIA') { prioClass = "prio-media"; prioIcon = "🟡 Media"; }

        const dateStr = new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });

        const tr = document.createElement("tr");
        tr.dataset.ticket = JSON.stringify(t); 
        tr.onclick = function() { openModal(this.dataset.ticket); };

        tr.innerHTML = `
            <td style="font-weight: 800; color: #94a3b8;">#${String(t.id).padStart(4, '0')}</td>
            <td style="font-weight: 700; color: #0f172a;">${t.empresa || 'Desconocida'}</td>
            <td>${t.usuario_nombre || 'Usuario'} <br><small style="color: #94a3b8;">${t.usuario_email || ''}</small></td>
            <td style="font-weight: 600;">${t.subject}</td>
            <td style="text-align: center;" class="${prioClass}">${prioIcon}</td>
            <td style="text-align: center;"><span class="badge ${badgeClass}">${t.status}</span></td>
            <td style="text-align: right; color: #64748b; font-size: 0.85rem;">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Abrir el detalle del Ticket
function openModal(ticketJson) {
    const t = JSON.parse(ticketJson);
    currentTicketId = t.id;

    document.getElementById("modal-ticket-title").innerText = `Ticket #${String(t.id).padStart(4, '0')} - ${t.subject}`;
    document.getElementById("modal-tenant").innerText = t.empresa || 'Desconocida';
    document.getElementById("modal-user").innerText = `${t.usuario_nombre || 'Usuario'} (${t.usuario_email || 'Sin correo'})`;
    document.getElementById("modal-priority").innerText = t.priority;
    document.getElementById("modal-date").innerText = new Date(t.created_at).toLocaleString('es-ES');
    document.getElementById("modal-message").innerText = t.message;

    modal.classList.remove("hidden");
}

// Actualizar estado del ticket (Pendiente -> Resuelto)
async function updateTicketStatus(newStatus) {
    if (!currentTicketId) return;
    
    try {
        await apiFetch(`${API_SOPORTE}/${currentTicketId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        modal.classList.add("hidden");
        loadTickets(filterSelect ? filterSelect.value : 'ALL'); 
    } catch (err) {
        alert("Error al actualizar el ticket: " + err.message);
    }
}