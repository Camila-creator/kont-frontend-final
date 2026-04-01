/* =========================================================
   DASHBOARD FINANCIERO JS (CFO LEVEL) - KONT
   ========================================================= */

// ✅ Ruta relativa para coherencia con main.js
const API_FINANCE = "/finance/dashboard";
let chartMethodsInstance = null;

document.addEventListener("DOMContentLoaded", () => { 
    // Inicialización con seguridad
    if (typeof apiFetch !== 'function') {
        console.error("Error: main.js no cargado. Las funciones financieras fallarán.");
    }
    loadFinanceDashboard(); 

    // Listener para el filtro de tiempo (Hoy, Mes, Año)
    const timeFilter = document.getElementById("timeFilter");
    timeFilter?.addEventListener("change", loadFinanceDashboard);
});

// === CARGA DE DATOS PRINCIPAL ===
async function loadFinanceDashboard() {
    const filter = document.getElementById("timeFilter")?.value || 'month';
    
    try {
        // Mostramos un estado de carga opcional si tienes spinners
        const data = await apiFetch(`${API_FINANCE}?filter=${filter}`);
        
        if (data) { 
            renderKPIs(data.kpis || {}); 
            renderAccounts(data.accounts || []); 
            renderChartMethods(data.methodsIn || []); 
            renderMuro(data.muro || {}); 
        }
    } catch (err) { 
        console.error("Error cargando dashboard financiero:", err);
        // Podrías disparar un openAlert aquí si falla la conexión crítica
    }
}

// === RENDERIZADO DE INDICADORES (KPIs) ===
function renderKPIs(kpis) {
    const { 
        liquidez = 0, ingresos = 0, egresos = 0, 
        cxc = 0, cxp = 0, gasto_mkt = 0 
    } = kpis;
    
    const elLiquidez = document.getElementById("kpi-liquidez");
    const subLiq = document.getElementById("kpi-liquidez-sub");
    const elCxc = document.getElementById("kpi-cxc");
    const elCxp = document.getElementById("kpi-cxp");
    const elMkt = document.getElementById("kpi-mkt");

    // Formateador de moneda para limpieza visual
    const fmt = (val) => `$ ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (elLiquidez) elLiquidez.innerText = fmt(liquidez);
    
    if (subLiq) {
        subLiq.innerHTML = `
            <div style="display: flex; gap: 8px; font-size: 0.75rem; margin-top: 8px; font-weight: 600;">
                <span style="color: #059669; background: #f0fdf4; padding: 4px 10px; border-radius: 20px; border: 1px solid #dcfce7;">
                    <i class="bi bi-arrow-down-left"></i> In: $${Number(ingresos).toLocaleString('en-US')}
                </span>
                <span style="color: #dc2626; background: #fef2f2; padding: 4px 10px; border-radius: 20px; border: 1px solid #fee2e2;">
                    <i class="bi bi-arrow-up-right"></i> Out: $${Number(egresos).toLocaleString('en-US')}
                </span>
            </div>`;
    }
    
    if (elCxc) elCxc.innerText = fmt(cxc); 
    if (elCxp) elCxp.innerText = fmt(cxp); 
    if (elMkt) elMkt.innerText = fmt(gasto_mkt);
}

// === RENDERIZADO DE CUENTAS BANCARIAS ===
function renderAccounts(accounts) {
    const container = document.getElementById("accounts-container"); 
    if (!container) return;

    container.innerHTML = "";
    if (accounts.length === 0) { 
        container.innerHTML = `
            <div style="text-align:center; padding: 30px; color:#94a3b8;">
                <i class="bi bi-wallet2" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                <p style="font-size:0.85rem;">No hay cuentas configuradas.</p>
            </div>`; 
        return; 
    }
    
    accounts.forEach(acc => {
        const isDefault = acc.is_default ? `<span style="background: #e0e7ff; color: #4338ca; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; margin-left: 5px; vertical-align: middle;">DEFAULT</span>` : ''; 
        const nameLower = acc.name.toLowerCase();
        
        // Iconografía dinámica por tipo de cuenta
        let icon = 'bi-bank';
        if (nameLower.includes('zelle') || nameLower.includes('cash') || nameLower.includes('efectivo')) icon = 'bi-currency-dollar';
        if (nameLower.includes('pago movil')) icon = 'bi-phone-vibrate';

        container.innerHTML += `
            <div class="account-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f5f9;">
                <div class="acc-info">
                    <h4 style="margin: 0; font-size: 0.9rem; color: #1e293b;">
                        <i class="bi ${icon}" style="color:#64748b; margin-right: 8px;"></i>${acc.name}${isDefault}
                    </h4>
                    <p style="margin: 0; font-size: 0.75rem; color: #64748b;">${acc.bank || 'Institución'} • ${acc.currency || 'USD'}</p>
                </div>
                <div class="acc-balance" style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">
                    $ ${(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            </div>`;
    });
}

// === GRÁFICO DE MÉTODOS DE PAGO (DONA) ===
function renderChartMethods(methods) {
    const canvas = document.getElementById('chartMethodsIn');
    if (!canvas) return;

    const ctx = canvas.getContext('2d'); 
    if (chartMethodsInstance) chartMethodsInstance.destroy();
    
    const validMethods = methods.filter(m => m.total > 0); 
    
    // Si no hay datos, mostramos un gráfico gris de "Empty State"
    const labels = validMethods.length > 0 ? validMethods.map(m => m.method || 'Otros') : ['Sin datos']; 
    const dataValues = validMethods.length > 0 ? validMethods.map(m => m.total) : [1]; 
    const colors = validMethods.length > 0 
        ? ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'] 
        : ['#f1f5f9'];
    
    chartMethodsInstance = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: labels, 
            datasets: [{ 
                data: dataValues, 
                backgroundColor: colors, 
                borderWidth: 2, 
                borderColor: '#ffffff' 
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '75%', 
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { usePointStyle: true, boxWidth: 8, font: { size: 11, family: 'Inter' } } 
                }, 
                tooltip: { 
                    enabled: validMethods.length > 0,
                    callbacks: { 
                        label: (context) => ` $${context.parsed.toLocaleString('en-US')}` 
                    } 
                } 
            } 
        } 
    });
}

// === EL MURO DE LA VERDAD (MEJORES Y PEORES) ===
function renderMuro(muro) {
    if(!muro) return;
    
    const setMuroText = (idName, idVal, person) => {
        const elName = document.getElementById(idName);
        const elVal = document.getElementById(idVal);
        if (elName) elName.innerText = person?.nombre || 'N/A';
        if (elVal) elVal.innerText = person ? `$ ${Number(person.monto).toLocaleString('en-US')}` : '--';
    };

    setMuroText("top-cliente-name", "top-cliente-val", muro.mejor_cliente);
    setMuroText("bad-cliente-name", "bad-cliente-val", muro.deudor_cliente);
    setMuroText("top-prov-name", "top-prov-val", muro.mejor_proveedor);
    setMuroText("bad-prov-name", "bad-prov-val", muro.deudor_proveedor);
}