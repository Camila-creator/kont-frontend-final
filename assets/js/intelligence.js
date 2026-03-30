/**
 * KONT INTELLIGENCE - CORE STRATEGIC ENGINE
 * Versión Centralizada para Producción
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el cerebro de Kont
    kontIntelligenceCore();
});

async function kontIntelligenceCore() {
    const insightElement = document.getElementById('main-ai-insight');
    
    try {
        console.log("🧠 Kont Intelligence: Analizando flujo de operaciones...");

        // 1. Única llamada al endpoint de inteligencia (Evita los 404 de rutas separadas)
        const response = await fetch('/api/intelligence/strategic-dashboard');
        
        // Si el servidor responde con error (ej. Render caído), capturamos aquí
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        const data = await response.json();

        // 2. Extraer métricas del objeto unificado
        const { 
            throughput, 
            operating_expenses, 
            cash_flow, 
            inventory_value, 
            alerts 
        } = data;

        // 3. Cálculos Estratégicos (TOC)
        const netProfit = throughput - operating_expenses;
        // ROI Operativo: (Utilidad Neta / Inversión en Inventario) * 100
        const roiOperativo = inventory_value > 0 ? (netProfit / inventory_value) * 100 : 0;

        // 4. Actualizar la Interfaz (KPIs)
        updateUI(throughput, inventory_value, operating_expenses, roiOperativo, cash_flow);

        // 5. Generar Insights con el "toque humano" de Kont
        generateKontMessage(data, netProfit);

        // 6. Renderizar Gráfica de Balance
        renderStrategicChart(throughput, operating_expenses);

    } catch (err) {
        console.error("❌ Error en Kont Intelligence Core:", err);
        showError(`No pude conectar con el núcleo de datos: ${err.message}`);
    }
}

/**
 * Función para mostrar errores en la UI sin romper el script
 */
function showError(message) {
    const insightElement = document.getElementById('main-ai-insight');
    if (insightElement) {
        insightElement.innerHTML = `
            <div style="color: #ef4444; background: #fee2e2; padding: 1rem; border-radius: 8px; border: 1px solid #fecaca;">
                ⚠️ **Error de Sistema:** ${message} <br>
                <small>Verifica que las rutas en el backend y el servidor en Render estén activos.</small>
            </div>
        `;
    }
}

/**
 * Lógica de Interacción: Kont analiza la data por ti
 */
function generateKontMessage(data, netProfit) {
    const insightElement = document.getElementById('main-ai-insight');
    let message = "";
    
    // Escenarios basados en la data real
    if (data.alerts.bottlenecks > 0) {
        message = `⚠️ **¡Camila, atención!** Tienes **${data.alerts.bottlenecks} cuellos de botella** en el inventario. Estás perdiendo Throughput porque no tienes qué vender de esos productos. Repón stock antes de gastar más en Ads.`;
    } 
    else if (netProfit < 0) {
        message = `🧐 **Alerta de Operaciones:** Tus Gastos Operativos ($${data.operating_expenses.toLocaleString()}) superan tus ingresos. Estamos en zona de pérdida. Necesitamos acelerar las ventas de alta rotación YA.`;
    }
    else if (data.throughput > data.operating_expenses * 2) {
        message = `🚀 **¡Excelente ejecución!** El sistema está volando. El Throughput duplica tus gastos. Es el momento perfecto para escalar la pauta y subir la meta del mes.`;
    }
    else {
        message = `✅ **Sistema Estable:** El flujo de caja es positivo ($${data.cash_flow.toLocaleString()}). Mantén el ritmo de ventas actual para asegurar el cierre de mes.`;
    }

    insightElement.innerHTML = message;
}

/**
 * Actualiza los valores en los cards del Dashboard
 */
function updateUI(t, i, oe, roi, cash) {
    // Asegúrate de que estos IDs existan en tu HTML
    const elements = {
        'val-throughput': `$ ${t.toLocaleString()}`,
        'val-inventory': `$ ${i.toLocaleString()}`,
        'val-oe': `$ ${oe.toLocaleString()}`,
        'val-cash': `$ ${cash.toLocaleString()}`,
        'val-roi': `${roi.toFixed(2)}%`
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

/**
 * Gráfica comparativa de Throughput vs Gastos
 */
function renderStrategicChart(throughput, oe) {
    const canvas = document.getElementById('projectionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (window.kontChart) window.kontChart.destroy();

    window.kontChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Balance Actual'],
            datasets: [
                {
                    label: 'Ingresos (T)',
                    data: [throughput],
                    backgroundColor: '#10b981', // Verde éxito
                    borderRadius: 8
                },
                {
                    label: 'Gastos (OE)',
                    data: [oe],
                    backgroundColor: '#ef4444', // Rojo gasto
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}