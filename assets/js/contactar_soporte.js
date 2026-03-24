// frontend/assets/js/contactar_soporte.js

const API_MY_TICKETS = "http://localhost:4000/api/support-tickets";
const tbody = document.querySelector("#my-tickets-table tbody");
const form = document.getElementById("ticket-form");

// Referencias a los modales bonitos
const successModal = document.getElementById("success-modal");
const errorModal = document.getElementById("error-modal");
const errorMsg = document.getElementById("error-msg");

document.addEventListener("DOMContentLoaded", () => {
    loadMyTickets();
    
    if (form) {
        form.addEventListener("submit", submitTicket);
    }

    // Botones para cerrar los modales
    document.getElementById("btn-close-success")?.addEventListener("click", () => successModal.classList.add("hidden"));
    document.getElementById("btn-close-error")?.addEventListener("click", () => errorModal.classList.add("hidden"));
});

// === FETCH CON GAFETE ===
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

// === CARGAR MIS TICKETS ===
async function loadMyTickets() {
    if (!tbody) return;
    try {
        const res = await apiFetch(API_MY_TICKETS);
        renderTable(res.data);
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar tu historial.</td></tr>`;
    }
}

// === DIBUJAR TABLA ===
function renderTable(tickets) {
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No has enviado ningún ticket aún.</td></tr>`;
        return;
    }

    tickets.forEach(t => {
        let badgeClass = "status-pendiente";
        if (t.status === 'EN PROCESO') badgeClass = "status-proceso";
        if (t.status === 'RESUELTO') badgeClass = "status-resuelto";

        const prioIcon = t.priority === 'ALTA' ? '🔴 Alta' : t.priority === 'MEDIA' ? '🟡 Media' : '🟢 Baja';
        const dateStr = new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        const tr = document.createElement("tr");
tr.innerHTML = `
    <td data-label="Ticket" style="font-weight: 800; color: #94a3b8;">#${String(t.id).padStart(4, '0')}</td>
    <td data-label="Asunto" style="font-weight: 600; color: #1e293b;">${t.subject}</td>
    <td data-label="Prioridad" style="text-align: center; font-size: 0.85rem; font-weight: 600;">${prioIcon}</td>
    <td data-label="Estado" style="text-align: center;"><span class="badge ${badgeClass}">${t.status}</span></td>
    <td data-label="Fecha" style="text-align: right; color: #64748b; font-size: 0.85rem;">${dateStr}</td>
`;
        tbody.appendChild(tr);
    });
}

// === ENVIAR NUEVO TICKET ===
async function submitTicket(e) {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    const payload = {
        subject: document.getElementById("ticket-subject").value.trim(),
        priority: document.getElementById("ticket-priority").value,
        message: document.getElementById("ticket-message").value.trim()
    };

    if (!payload.subject || !payload.message) {
        errorMsg.innerText = "Por favor, llena todos los campos.";
        errorModal.classList.remove("hidden");
        return;
    }

    try {
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Enviando...';
        submitBtn.disabled = true;

        await apiFetch(API_MY_TICKETS, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // 🎉 Aparece el modal hermoso de éxito
        successModal.classList.remove("hidden");
        
        form.reset();
        loadMyTickets(); // Recargar la tabla automáticamente para el cliente
        
    } catch (err) {
        // ❌ Aparece el modal hermoso de error
        errorMsg.innerText = err.message || "Error de conexión.";
        errorModal.classList.remove("hidden");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}