/* =========================================================
   DASHBOARD FINANCIERO JS (CFO LEVEL) - CONECTADO A BD REAL
   ========================================================= */
const API_FINANCE = "https://kont-backend-final.onrender.com/api/finance/dashboard";
let chartMethodsInstance = null;

document.addEventListener("DOMContentLoaded", () => { loadFinanceDashboard(); });

// === API FETCH CON GAFETE SAAS ===
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, { 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) },
        ...options
    });
    
    if (res.status === 401 || res.status === 403) { localStorage.removeItem("agromedic_token"); window.location.replace("../pages/login.html"); return; }
    
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || data?.error || `Error de conexión ${res.status}`);
    return data;
}

async function loadFinanceDashboard() {
    const filter = document.getElementById("timeFilter").value;
    try {
        const data = await apiFetch(`${API_FINANCE}?filter=${filter}`);
        if(data) { 
            renderKPIs(data.kpis); 
            renderAccounts(data.accounts); 
            renderChartMethods(data.methodsIn); 
            renderMuro(data.muro); 
        }
    } catch (err) { console.error("Error cargando dashboard financiero:", err); }
}

function renderKPIs(kpis) {
    const liquidez = kpis.liquidez || 0; const ingresos = kpis.ingresos || 0; const egresos = kpis.egresos || 0; const cxc = kpis.cxc || 0; const cxp = kpis.cxp || 0; const gastoMkt = kpis.gasto_mkt || 0;
    
    const elLiquidez = document.getElementById("kpi-liquidez");
    const subLiq = document.getElementById("kpi-liquidez-sub");
    const elCxc = document.getElementById("kpi-cxc");
    const elCxp = document.getElementById("kpi-cxp");
    const elMkt = document.getElementById("kpi-mkt");

    if (elLiquidez) elLiquidez.innerText = `$ ${liquidez.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    
    if (subLiq) {
        subLiq.innerHTML = `<div style="display: flex; gap: 10px; font-size: 0.85rem; margin-top: 5px;"><span style="color: #059669; background: #dcfce7; padding: 4px 8px; border-radius: 6px; border: 1px solid #bbf7d0;"><i class="bi bi-arrow-down-circle-fill"></i> In: $${ingresos.toLocaleString('en-US')}</span><span style="color: #dc2626; background: #fee2e2; padding: 4px 8px; border-radius: 6px; border: 1px solid #fecaca;"><i class="bi bi-arrow-up-circle-fill"></i> Out: $${egresos.toLocaleString('en-US')}</span></div>`;
        subLiq.className = ""; 
    }
    
    if (elCxc) elCxc.innerText = `$ ${cxc.toLocaleString('en-US', {minimumFractionDigits: 2})}`; 
    if (elCxp) elCxp.innerText = `$ ${cxp.toLocaleString('en-US', {minimumFractionDigits: 2})}`; 
    if (elMkt) elMkt.innerText = `$ ${gastoMkt.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

function renderAccounts(accounts) {
    const container = document.getElementById("accounts-container"); 
    if (!container) return;

    container.innerHTML = "";
    if (!accounts || accounts.length === 0) { container.innerHTML = `<p style="text-align:center; color:#9ca3af; font-size:0.9rem; margin-top:20px;">No hay cuentas activas.</p>`; return; }
    
    accounts.forEach(acc => {
        const isDefault = acc.is_default ? `<span class="acc-badge">DEFAULT</span>` : ''; 
        const icon = acc.name.toLowerCase().includes('zelle') ? 'bi-currency-dollar' : 'bi-bank2'; 
        const balance = acc.balance || 0;
        container.innerHTML += `<div class="account-item"><div class="acc-info"><h4><i class="bi ${icon}" style="color:#6b7280;"></i> ${acc.name} ${isDefault}</h4><p>${acc.bank || 'Sin banco'} • ${acc.currency}</p></div><div class="acc-balance">$ ${balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</div></div>`;
    });
}

function renderChartMethods(methods) {
    const canvas = document.getElementById('chartMethodsIn');
    if (!canvas) return;

    const ctx = canvas.getContext('2d'); 
    if (chartMethodsInstance) chartMethodsInstance.destroy();
    
    const validMethods = (methods || []).filter(m => m.total > 0); 
    const labels = validMethods.length > 0 ? validMethods.map(m => m.method || 'Otros') : ['Sin ingresos']; 
    const data = validMethods.length > 0 ? validMethods.map(m => m.total) : [1]; 
    const colors = validMethods.length > 0 ? ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'] : ['#e5e7eb'];
    
    chartMethodsInstance = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff', hoverOffset: validMethods.length > 0 ? 5 : 0 }] }, 
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, padding: 20 } }, tooltip: { callbacks: { label: function(context) { if (validMethods.length === 0) return ' Sin datos en este periodo'; return ' $' + context.parsed.toLocaleString('en-US'); } } } } } 
    });
}

function renderMuro(muro) {
    if(!muro) return;
    
    const topCliName = document.getElementById("top-cliente-name");
    const topCliVal = document.getElementById("top-cliente-val");
    const badCliName = document.getElementById("bad-cliente-name");
    const badCliVal = document.getElementById("bad-cliente-val");
    const topProvName = document.getElementById("top-prov-name");
    const topProvVal = document.getElementById("top-prov-val");
    const badProvName = document.getElementById("bad-prov-name");
    const badProvVal = document.getElementById("bad-prov-val");

    if (topCliName) topCliName.innerText = muro.mejor_cliente?.nombre || 'N/A'; 
    if (topCliVal) topCliVal.innerText = `$ ${(muro.mejor_cliente?.monto || 0).toLocaleString('en-US')} Comprados`;
    if (badCliName) badCliName.innerText = muro.deudor_cliente?.nombre || 'N/A'; 
    if (badCliVal) badCliVal.innerText = `$ ${(muro.deudor_cliente?.monto || 0).toLocaleString('en-US')} En deuda`;
    if (topProvName) topProvName.innerText = muro.mejor_proveedor?.nombre || 'N/A'; 
    if (topProvVal) topProvVal.innerText = `$ ${(muro.mejor_proveedor?.monto || 0).toLocaleString('en-US')} Comprados`;
    if (badProvName) badProvName.innerText = muro.deudor_proveedor?.nombre || 'N/A'; 
    if (badProvVal) badProvVal.innerText = `$ ${(muro.deudor_proveedor?.monto || 0).toLocaleString('en-US')} Por pagar`;
}