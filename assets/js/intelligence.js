/**
 * KONT INTELLIGENCE - CORE STRATEGIC ENGINE
 * Versión Centralizada para Producción (Render)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el cerebro de Kont
    kontIntelligenceCore();
});

async function kontIntelligenceCore() {
    try {
        console.log("🧠 Kont Intelligence: Analizando flujo de operaciones...");

        // 1. OBTENER TOKEN (Asegúrate de que este sea el nombre que usas en el login)
        const token = localStorage.getItem('token'); 

        // 2. ÚNICA LLAMADA AL ENDPOINT ESTRATÉGICO
        const response = await fetch('/api/intelligence/strategic-dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Si no hay permisos o no existe la ruta
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo.");
            }
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();

        // 3. EXTRACCIÓN DE MÉTRICAS
        const { 
            throughput, 
            operating_expenses, 
            cash_flow, 
            inventory_value, 
            alerts 
        } = data;

        // 4. CÁLCULOS ESTRATÉGICOS (TOC)
        const netProfit = throughput - operating_expenses;
        // ROI Operativo: (Utilidad Neta / Inversión en Inventario) * 100
        const roiOperativo = inventory_value > 0 ? (netProfit / inventory_value) * 100 : 0;

        // 5. ACTUALIZAR LA INTERFAZ (KPIs)
        updateUI(throughput, inventory_value, operating_expenses, roiOperativo, cash_flow);

        // 6. GENERAR INSIGHTS ESTRATÉGICOS
        generateKontMessage(data, netProfit);

        // 7. RENDERIZAR GRÁFICA DE BALANCE
        renderStrategicChart(throughput, operating_expenses);

    } catch (err) {
        console.error("❌ Error en Kont Intelligence Core:", err);
        showError(err.message);
    }
}

/**
 * Función para mostrar errores en la UI
 */
function showError(message) {
    const insightElement = document.getElementById('main-ai-insight');
    if (insightElement) {
        insightElement.innerHTML = `
            <div style="color: #ef4444; background: #fee2e2; padding: 1rem; border-radius: 8px; border: 1px solid #fecaca; margin-top: 10px;">
                ⚠️ **Error de Sistema:** ${message} <br>
                <small>Verifica tu conexión o contacta a soporte técnico.</small>
            </div>
        `;
    }
}

/**
 * Lógica de Interacción: Kont habla contigo
 */
function generateKontMessage(data, netProfit) {
    const insightElement = document.getElementById('main-ai-insight');
    if (!insightElement) return;

    let message = "";
    
    // ESCENARIOS ESTRATÉGICOS
    if (data.alerts && data.alerts.bottlenecks > 0) {
        message = `⚠️ **¡Camila, atención!** Tienes **${data.alerts.bottlenecks} cuellos de botella** (stock bajo). Estás perdiendo Throughput. Repón inventario antes de aumentar el gasto en pauta publicitaria.`;
    } 
    else if (netProfit < 0) {
        message = `🧐 **Alerta de Operaciones:** El Gasto Operativo ($${data.operating_expenses.toLocaleString()}) es mayor que tu Throughput. El sistema está drenando efectivo. Necesitamos acelerar las ventas hoy mismo.`;
    }
    else if (data.throughput > (data.operating_expenses * 2)) {
        message = `🚀 **¡Excelente ejecución!** El sistema está optimizado. Tu Throughput duplica los gastos. Es el momento ideal para escalar tus "sketches" y captar más clientes.`;
    }
    else {
        message = `✅ **Estado Saludable:** El flujo de caja es de $${data.cash_flow.toLocaleString()}. Mantén este ritmo operativo para asegurar el crecimiento este mes.`;
    }

    insightElement.innerHTML = `
        <div class="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
            <p class="text-blue-700 leading-relaxed">${message}</p>
        </div>
    `;
}

/**
 * Actualiza los valores en los cards del Dashboard
 */
function updateUI(t, i, oe, roi, cash) {
    const elements = {
        'val-throughput': `$ ${t.toLocaleString()}`,
        'val-inventory': `$ ${i.toLocaleString()}`,
        'val-oe': `$ ${oe.toLocaleString()}`,
        'val-cash': `$ ${cash.toLocaleString()}`,
        'val-roi': `${roi.toFixed(2)}%`
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            // Feedback visual: Si es negativo, ponerlo en rojo
            if (id === 'val-roi' && parseFloat(value) < 0) el.style.color = '#ef4444';
            if (id === 'val-roi' && parseFloat(value) > 0) el.style.color = '#10b981';
        }
    }
}

/**
 * Gráfica de Balance (Chart.js)
 */
function renderStrategicChart(throughput, oe) {
    const canvas = document.getElementById('projectionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (window.kontChart) window.kontChart.destroy();

    window.kontChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Métricas de Flujo'],
            datasets: [
                {
                    label: 'Ingresos (Throughput)',
                    data: [throughput],
                    backgroundColor: '#10b981',
                    borderRadius: 6
                },
                {
                    label: 'Gastos (Op. Expenses)',
                    data: [oe],
                    backgroundColor: '#f87171',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { callback: (value) => '$' + value.toLocaleString() }
                }
            }
        }
    });
}