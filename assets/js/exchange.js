// assets/js/exchange.js

// ---------------- API & CONFIG ----------------
// Usamos API_BASE (del main.js) y solo le sumamos el endpoint. 
// ¡Sin el /api extra para evitar el 404!
const ENDPOINT_EXCHANGE = `${API_BASE}/exchange`;

document.addEventListener("DOMContentLoaded", () => {
    // Un pequeño delay para asegurar que el DOM y el main.js estén listos
    setTimeout(loadExchangeData, 100); 

    // Escuchador para el botón de actualizar tasa (si existe en el HTML)
    const btnUpdate = document.getElementById("btn-update-rate");
    if(btnUpdate) {
        btnUpdate.addEventListener("click", handleUpdateRate);
    }
});

// ---------------- UI HELPERS ----------------
function showToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${tipo === 'error' ? 'error' : ''}`;
    
    const icono = tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
    const colorIcono = tipo === 'success' ? '#10b981' : '#ef4444';

    toast.innerHTML = `
        <i class="bi ${icono}" style="color: ${colorIcono}; font-size: 1.2rem;"></i>
        <span style="font-weight: 500;">${mensaje}</span>
    `;

    container.appendChild(toast);

    // Animación de salida y eliminación
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ---------------- ACCIONES ----------------
async function loadExchangeData() {
    try {
        // Usamos el endpoint corregido
        const response = await apiFetch(ENDPOINT_EXCHANGE);
        if (response && response.ok) {
            renderExchangeUI(response.data);
        }
    } catch (err) {
        console.error("Error al cargar divisas:", err);
        // Si el error es 404 aquí, revisa que el servidor tenga la ruta /api/exchange
    }
}

function renderExchangeUI(history) {
    const usdDisplay = document.getElementById("rate-usd-val");
    const eurDisplay = document.getElementById("rate-eur-val");
    const historyTable = document.getElementById("exchange-history-table");

    if (!history || !Array.isArray(history)) return;

    // Buscamos la última tasa de cada una (asumiendo que vienen ordenadas por fecha desc)
    const lastUSD = history.find(h => h.currency_code === 'USD')?.rate_value || "0.00";
    const lastEUR = history.find(h => h.currency_code === 'EUR')?.rate_value || "0.00";

    if (usdDisplay) usdDisplay.innerText = `${Number(lastUSD).toFixed(2)} Bs.`;
    if (eurDisplay) eurDisplay.innerText = `${Number(lastEUR).toFixed(2)} Bs.`;

    if (historyTable) {
        if (history.length === 0) {
            historyTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No hay historial.</td></tr>`;
            return;
        }

        // Dentro de renderExchangeUI, en el map del historial:
historyTable.innerHTML = history.map(h => `
    <tr>
        <td data-label="Fecha y Hora">${new Date(h.effective_date).toLocaleString()}</td>
        <td data-label="Moneda">
            <span class="badge-currency ${h.currency_code === 'USD' ? 'badge-usd' : 'badge-eur'}">
                ${h.currency_code}
            </span>
        </td>
        <td data-label="Tasa de Cambio">
            <strong>${Number(h.rate_value).toFixed(2)} Bs.</strong>
        </td>
        <td data-label="Acción">
            <i class="bi bi-check-all text-success"></i>
        </td>
    </tr>
`).join('');
    }
}

async function handleUpdateRate() {
    const input = document.getElementById("new-rate-input");
    const currencySelect = document.getElementById("new-rate-currency");
    
    if (!input || !currencySelect) return;

    const val = input.value;
    const curr = currencySelect.value;

    if (!val || val <= 0) {
        return showToast("Ingresa una tasa válida", "error");
    }

    try {
        await apiFetch(ENDPOINT_EXCHANGE, {
            method: 'POST',
            body: JSON.stringify({ 
                rate_value: Number(val), 
                currency_code: curr 
            })
        });
        
        showToast(`Tasa de ${curr} actualizada a ${val} Bs.`);
        
        input.value = "";
        loadExchangeData();
        
        // Asumiendo que registrarActividad existe en main.js
        if (typeof registrarActividad === 'function') {
            registrarActividad('FINANZAS', 'ACTUALIZAR_TASA', `Se cambió tasa de ${curr} a ${val} Bs.`);
        }
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}