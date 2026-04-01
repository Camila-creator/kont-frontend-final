// frontend/assets/js/contactar_soporte.js

// ✅ Configuración con rutas relativas para el apiFetch global
const API_MY_TICKETS = "/support-tickets";
const tbody = document.querySelector("#my-tickets-table tbody");
const form = document.getElementById("ticket-form");

// Referencias a los modales (Asegúrate de que los IDs coincidan en tu HTML)
const successModal = document.getElementById("success-modal");
const errorModal = document.getElementById("error-modal");
const errorMsg = document.getElementById("error-msg");

document.addEventListener("DOMContentLoaded", () => {
    // 🛡️ Verificación de seguridad básica
    if (typeof apiFetch !== "function") {
        console.error("❌ Error: main.js no detectado. El soporte no funcionará.");
        return;
    }

    loadMyTickets();
    
    if (form) {
        form.addEventListener("submit", submitTicket);
    }

    // Listeners para cerrar modales de forma limpia
    document.getElementById("btn-close-success")?.addEventListener("click", () => successModal?.classList.add("hidden"));
    document.getElementById("btn-close-error")?.addEventListener("click", () => errorModal?.classList.add("hidden"));
});

// === CARGAR HISTORIAL DE TICKETS ===
async function loadMyTickets() {
    if (!tbody) return;
    try {
        const res = await apiFetch(API_MY_TICKETS);
        // El backend suele devolver { data: [...] } o el array directo
        const tickets = res.data || res || [];
        renderTable(tickets);
    } catch (err) {
        console.error("Error al cargar tickets:", err);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #ef4444; padding: 30px;">
                    <i class="bi bi-exclamation-triangle" style="font-size: 1.5rem;"></i><br>
                    No pudimos cargar tu historial de soporte.
                </td>
            </tr>`;
    }
}

// === DIBUJAR TABLA DE TICKETS ===
function renderTable(tickets) {
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #64748b; padding: 40px;">
                    <i class="bi bi-chat-left-text" style="font-size: 2rem; opacity: 0.3;"></i>
                    <p style="margin-top: 10px;">¿Necesitas ayuda? Envía tu primer ticket arriba.</p>
                </td>
            </tr>`;
        return;
    }

    tickets.forEach(t => {
        // Lógica de colores por estado
        const statusConfig = {
            'PENDIENTE': { class: 'status-pendiente', color: '#f59e0b', bg: '#fef3c7' },
            'EN PROCESO': { class: 'status-proceso', color: '#3b82f6', bg: '#dbeafe' },
            'RESUELTO': { class: 'status-resuelto', color: '#10b981', bg: '#d1fae5' }
        };

        const config = statusConfig[t.status] || { class: '', color: '#64748b', bg: '#f1f5f9' };
        const prioLabel = t.priority === 'ALTA' ? '🔴 Alta' : t.priority === 'MEDIA' ? '🟡 Media' : '🟢 Baja';
        
        // Formateo de fecha sencillo
        const date = t.created_at ? new Date(t.created_at) : new Date();
        const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        tr.innerHTML = `
            <td style="padding: 15px; font-weight: 800; color: #94a3b8; font-family: monospace;">#${String(t.id).padStart(4, '0')}</td>
            <td style="padding: 15px; font-weight: 600; color: #1e293b;">${t.subject}</td>
            <td style="padding: 15px; text-align: center; font-size: 0.8rem; font-weight: 700;">${prioLabel}</td>
            <td style="padding: 15px; text-align: center;">
                <span style="background: ${config.bg}; color: ${config.color}; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; border: 1px solid ${config.color}30;">
                    ${t.status}
                </span>
            </td>
            <td style="padding: 15px; text-align: right; color: #64748b; font-size: 0.85rem;">${dateStr}</td>
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

    // Validación manual rápida
    if (!payload.subject || !payload.message) {
        if (typeof openAlert === 'function') {
            openAlert({ title: "Atención", message: "Por favor, completa el asunto y el mensaje." });
        } else {
            alert("Campos incompletos.");
        }
        return;
    }

    try {
        // Estado visual de carga
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Enviando...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";

        await apiFetch(API_MY_TICKETS, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // 🎉 Éxito: Mostrar modal personalizado
        if (successModal) {
            successModal.classList.remove("hidden");
        } else if (typeof openAlert === 'function') {
            openAlert({ title: "Enviado", message: "Tu ticket ha sido registrado. Te responderemos pronto." });
        }
        
        form.reset();
        await loadMyTickets(); // Refrescar la lista sin recargar la página
        
    } catch (err) {
        console.error("Error al enviar ticket:", err);
        // ❌ Error: Mostrar modal o alerta
        if (errorModal) {
            if (errorMsg) errorMsg.innerText = err.message || "Error al procesar la solicitud.";
            errorModal.classList.remove("hidden");
        } else if (typeof openAlert === 'function') {
            openAlert({ title: "Error", message: err.message });
        }
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
    }
}