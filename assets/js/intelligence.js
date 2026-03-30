/**
 * KONT INTELLIGENCE - CORE STRATEGIC ENGINE
 * Basado en: Teoría de Restricciones (TOC) & Administración de Operaciones
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el cerebro de Kont
    kontIntelligenceCore();
});

async function kontIntelligenceCore() {
    try {
        console.log("🧠 Kont Intelligence: Analizando flujo de operaciones...");

        // 1. EXTRACCIÓN DE DATA (Cruzando tus controladores de Ventas, Gastos, Stock y Marketing)
        const [orders, expenses, products, marketing] = await Promise.all([
            fetch('/api/orders/list').then(res => res.json()),
            fetch('/api/expenses/list').then(res => res.json()), // Tus controladores de egresos
            fetch('/api/products/list').then(res => res.json()),
            fetch('/api/marketing/stats').then(res => res.json()) // Módulo de Marketing/Ads
        ]);

        // 2. CÁLCULO DE MÉTRICAS "LA META" (Goldratt)
        
        // THROUGHPUT (T): Dinero que entra (Ventas Totales - Costos Variables Directos)
        const totalThroughput = orders.reduce((acc, o) => acc + parseFloat(o.total || 0), 0);
        
        // INVENTARIO (I): Dinero estancado en el sistema (Activos para la venta)
        const totalInventory = products.reduce((acc, p) => acc + (p.stock * p.cost_price), 0);
        
        // GASTOS OPERATIVOS (OE): Dinero que sale para convertir I en T (Sueldos, Alquiler, ADS, Luz)
        const totalOE = expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

        // ROI OPERATIVO (Según AO): (T - OE) / I
        const netProfit = totalThroughput - totalOE;
        const roiOperativo = totalInventory > 0 ? (netProfit / totalInventory) * 100 : 0;

        // 3. ACTUALIZAR INTERFAZ (KPIs)
        updateUI(totalThroughput, totalInventory, totalOE, roiOperativo);

        // 4. GENERAR INSIGHTS ESTRATÉGICOS (Interacción de Kont)
        generateKontMessage(totalThroughput, totalOE, products, marketing);

        // 5. RENDERIZAR GRÁFICA DE BALANCE
        renderStrategicChart(totalThroughput, totalOE);

    } catch (err) {
        console.error("Error en Kont Intelligence Core:", err);
        showError("No pude conectar con el núcleo de datos. Revisa la conexión.");
    }
}

/**
 * Lógica de Interacción: Kont habla con el usuario
 */
function generateKontMessage(throughput, oe, products, marketing) {
    const insightElement = document.getElementById('main-ai-insight');
    let message = "";
    
    // Identificar Cuello de Botella (Restricción de Inventario)
    const bottleneck = products.find(p => p.stock <= p.min_stock);
    
    // Analizar relación Marketing vs Throughput
    const adSpend = marketing.total_spend || 0;
    const marketingEfficiency = adSpend > 0 ? throughput / adSpend : 0;

    // ESCENARIO A: El Cuello de Botella está matando el Marketing
    if (bottleneck && adSpend > (oe * 0.3)) {
        message = `⚠️ **¡Camila, atención aquí!** Estás invirtiendo mucho en Marketing (${adSpend.toLocaleString()} $), pero tu restricción actual es el stock de **${bottleneck.name}**. Si no reponemos ese inventario, los "Sketches" traerán clientes que no podremos atender. **Sugerencia:** Reasigna el presupuesto de Ads a reposición de stock urgente.`;
    } 
    // ESCENARIO B: Exceso de Gasto Operativo (OE) vs Throughput
    else if (oe > throughput) {
        message = `🧐 **Alerta de Operaciones:** Tu Gasto Operativo está superando tu Throughput. El sistema está perdiendo dinero. Necesitamos aumentar la velocidad de ventas o recortar gastos no críticos de inmediato para alcanzar el punto de equilibrio.`;
    }
    // ESCENARIO C: Eficiencia de Marketing Baja
    else if (marketingEfficiency < 2 && adSpend > 0) {
        message = `📉 **Insight de Marketing:** Por cada dólar invertido en Ads, solo generamos ${marketingEfficiency.toFixed(2)} de Throughput. Según la Cadena de Suministros, nuestra estrategia de comunicación no está alineada con el inventario de alta rotación. ¿Probamos con un nuevo ángulo de ventas?`;
    }
    // ESCENARIO D: Sistema Optimizado
    else {
        message = `🚀 **¡Excelente ejecución!** El flujo es constante. El Throughput cubre los Gastos Operativos y el ROI es positivo. ¡Es el momento perfecto para escalar la pauta publicitaria y subir la meta del mes!`;
    }

    insightElement.innerHTML = message;
}

function updateUI(t, i, oe, roi) {
    document.getElementById('val-throughput').textContent = `$ ${t.toLocaleString()}`;
    document.getElementById('val-inventory').textContent = `$ ${i.toLocaleString()}`;
    document.getElementById('val-oe').textContent = `$ ${oe.toLocaleString()}`;
    
    // Si tienes un badge de ROI, lo actualizamos
    const roiBadge = document.getElementById('val-roi');
    if(roiBadge) roiBadge.textContent = `${roi.toFixed(2)}%`;
}

function renderStrategicChart(throughput, oe) {
    const ctx = document.getElementById('projectionChart').getContext('2d');
    
    // Destruir gráfica previa si existe para evitar bugs visuales
    if (window.kontChart) window.kontChart.destroy();

    window.kontChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Métricas Actuales'],
            datasets: [
                {
                    label: 'Throughput (Ingresos)',
                    data: [throughput],
                    backgroundColor: '#10b981',
                    borderRadius: 10
                },
                {
                    label: 'Gastos Operativos (OE)',
                    data: [oe],
                    backgroundColor: '#ef4444',
                    borderRadius: 10
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false } }
            }
        }
    });
}

/**
 * Función para que el usuario pida una estrategia nueva (Botón interactivo)
 */
function generateNewStrategy() {
    const insightBox = document.getElementById('main-ai-insight');
    insightBox.innerHTML = "🌀 **Kont está recalculando...** Revisando la relación entre tus compras recientes, el stock estancado y tus últimos sketches de marketing.";
    
    setTimeout(() => {
        kontIntelligenceCore(); // Refresca y da un nuevo consejo basado en data real
    }, 1500);
}