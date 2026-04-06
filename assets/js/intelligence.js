// assets/js/intelligence.js
// Kont Intelligence — Motor de análisis estratégico
// Teoría de Restricciones (Goldratt) + Cadena de Suministro + Finanzas PyME VE

let intelData = null;

document.addEventListener("DOMContentLoaded", loadIntelligence);

async function loadIntelligence() {
  try {
    const res = await apiFetch("/intelligence/strategic-dashboard");
    if (!res?.ok || !res.data) { showFallbackError(); return; }
    intelData = res.data;
    renderAll(intelData);
  } catch (e) {
    console.error("Intelligence error:", e);
    showFallbackError();
  }
}

function reloadIntel() { loadIntelligence(); }
function scrollToRotation() { document.getElementById("rotation-section")?.scrollIntoView({ behavior: "smooth" }); }

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const fmt = (n, dec = 2) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtN = (n, dec = 0) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const pct = n => Number(n || 0).toFixed(1) + "%";

function clearSkeleton(id) {
  const el = $(id);
  if (el) el.classList.remove("skeleton");
}

// ─────────────────────────────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────
function renderAll(d) {
  renderKPIs(d);
  renderIntelligenceMessages(d);
  renderTrendChart(d.trend);
  renderBalanceChart(d);
  renderRestrictions(d);
  renderTOCMetrics(d);
  renderInventoryPanel(d);
  renderMarketingPanel(d);
  renderTopProducts(d.top_products);
  renderDebtPanel(d);
  renderProjection(d);
  renderRotationTable(d.rotation);
}

// ─────────────────────────────────────────────────────────────────────
// KPIs
// ─────────────────────────────────────────────────────────────────────
function renderKPIs(d) {
  const growth = d.projection?.growth_rate || 0;
  const growthIcon = growth > 0 ? "↑" : growth < 0 ? "↓" : "→";
  const growthClass = growth > 0 ? "up" : growth < 0 ? "down" : "flat";
  const netClass = d.net_profit >= 0 ? "up" : "down";

  const kpis = [
    ["kv-throughput", fmt(d.throughput), null],
    ["kv-t30d",       fmt(d.throughput_30d), `<span class="${growthClass}">${growthIcon} ${Math.abs(growth).toFixed(1)}% vs sem. ant.</span>`],
    ["kv-oe",         fmt(d.operating_expenses), null],
    ["kv-net",        fmt(d.net_profit), `<span class="${netClass}">${d.net_profit >= 0 ? "Positivo" : "Negativo"}</span>`, "ks-net"],
    ["kv-cash",       fmt(d.cash_flow), null],
    ["kv-roi",        pct(d.roi_operational), null],
  ];

  kpis.forEach(([id, val, trend]) => {
    const el = $(id);
    if (!el) return;
    el.textContent = val;
    el.classList.remove("skeleton");
    if (id === "kv-net") el.style.color = d.net_profit >= 0 ? "#16a34a" : "#dc2626";
    if (id === "kv-roi") el.style.color = d.roi_operational >= 0 ? "#16a34a" : "#dc2626";
    if (trend) { const sub = el.nextElementSibling; if (sub) sub.innerHTML = trend; }
  });
}

// ─────────────────────────────────────────────────────────────────────
// MENSAJES DE INTELIGENCIA (lógica de decisiones)
// ─────────────────────────────────────────────────────────────────────
function renderIntelligenceMessages(d) {
  const msgs = [];
  const a = d.alerts || {};

  // ── DIAGNÓSTICO PRINCIPAL (TOC - La Meta) ──────────────────────
  if (a.negative_profit) {
    msgs.push({
      type: "danger",
      label: "Restricción crítica — Throughput < Gastos",
      text: `Tus Gastos Operativos (<strong>${fmt(d.operating_expenses)}</strong>) superan el Throughput (<strong>${fmt(d.throughput)}</strong>). Según la Teoría de Restricciones, el sistema está consumiendo capital sin generar valor neto. <strong>Acción prioritaria:</strong> identifica el cuello de botella — ¿es falta de ventas, precio muy bajo o gastos no esenciales?`,
    });
  } else if (a.high_oe_ratio) {
    msgs.push({
      type: "warning",
      label: "Eficiencia operativa baja",
      text: `Gastas <strong>${pct(d.efficiency_ratio * 100)}</strong> de cada dólar que ingresa en gastos operativos. Lo ideal es mantenerlo bajo el 70%. Revisa tus gastos fijos y evalúa si las compras de inventario se alinean con la demanda real.`,
    });
  } else {
    msgs.push({
      type: "ok",
      label: "Flujo operativo saludable",
      text: `ROI operativo de <strong>${pct(d.roi_operational)}</strong>. Por cada dólar en inventario estás generando valor. El sistema está en equilibrio — es momento de escalar.`,
    });
  }

  // ── INVENTARIO (Cadena de Suministro) ──────────────────────────
  if (a.zero_stock > 0) {
    msgs.push({
      type: "danger",
      label: "Ruptura de inventario detectada",
      text: `Tienes <strong>${a.zero_stock} producto(s) sin stock</strong>. Cada día sin stock en un producto activo es throughput perdido directamente. La cadena de suministro está rota — reabastece de inmediato los productos con mayor rotación.`,
    });
  } else if (a.low_stock > 0) {
    msgs.push({
      type: "warning",
      label: `${a.low_stock} cuello(s) de botella en inventario`,
      text: `${a.low_stock} producto(s) están por debajo del stock mínimo. Antes de invertir en pauta publicitaria, repón este inventario — de lo contrario crearás demanda que no podrás suplir. Efecto contraproducente.`,
    });
  }

  // ── CxC vs CAJA (Flujo de efectivo) ────────────────────────────
  if (a.high_cxc && d.accounts_receivable > 0) {
    msgs.push({
      type: "warning",
      label: "Cuentas por cobrar superan la caja disponible",
      text: `Tienes <strong>${fmt(d.accounts_receivable)}</strong> en cuentas por cobrar pero solo <strong>${fmt(d.cash_flow)}</strong> en caja. Tus clientes a crédito están financiando su negocio con tu capital. Prioriza cobro de las cuentas más antiguas.`,
    });
  }

  // ── PROVEEDORES ─────────────────────────────────────────────────
  if (a.overdue_suppliers > 0) {
    msgs.push({
      type: "warning",
      label: "Deuda con proveedores pendiente",
      text: `${a.overdue_suppliers} compra(s) a crédito sin pagar. Mantener deuda con proveedores deteriora la relación y puede afectar futuras condiciones de crédito. Programa los pagos para proteger tu cadena de suministro.`,
    });
  }

  // ── MARKETING ROI ───────────────────────────────────────────────
  const mkt = d.marketing || {};
  if (mkt.total_mkt_investment > 0 && d.throughput_30d > 0) {
    const mktRoi = ((d.throughput_30d - mkt.total_mkt_investment) / mkt.total_mkt_investment * 100);
    if (mktRoi < 100) {
      msgs.push({
        type: "warning",
        label: "ROI de marketing bajo",
        text: `Invertiste <strong>${fmt(mkt.total_mkt_investment)}</strong> en marketing (ads + influencers). El ingreso de los últimos 30 días es <strong>${fmt(d.throughput_30d)}</strong>. Si la inversión de marketing no está generando al menos 3x en ventas, revisa qué canales están convirtiendo mejor.`,
      });
    } else {
      msgs.push({
        type: "ok",
        label: "Marketing generando retorno",
        text: `Con <strong>${fmt(mkt.total_mkt_investment)}</strong> invertidos en marketing y <strong>${fmt(d.throughput_30d)}</strong> en ingresos del mes, el retorno es positivo. Identifica cuáles campañas tienen mejor ROAS y escala esas específicamente.`,
      });
    }
  }

  // ── PROYECCIÓN ──────────────────────────────────────────────────
  const proj = d.projection || {};
  if (proj.projected_monthly > 0) {
    const trend = proj.growth_rate > 5 ? "acelerando" : proj.growth_rate < -5 ? "desacelerando" : "estable";
    msgs.push({
      type: proj.growth_rate >= 0 ? "ok" : "warning",
      label: `Proyección del mes: ${fmt(proj.projected_monthly)}`,
      text: `Basado en tu ritmo de los últimos 7 días (<strong>${fmt(proj.daily_rate_7d)}/día</strong>), el mes proyecta cerrar en <strong>${fmt(proj.projected_monthly)}</strong>. La tendencia está <strong>${trend}</strong> (${proj.growth_rate > 0 ? "+" : ""}${proj.growth_rate}% vs promedio 30d).`,
    });
  }

  // ─── RENDERIZAR ──────────────────────────────────────────────────
  const container = $("ic-msgs");
  if (!container) return;

  const typeMap = { danger: "danger", warning: "warning", ok: "" };
  container.innerHTML = msgs.map(m => `
    <div class="ic-msg ${typeMap[m.type] || ""}">
      <div class="ic-label">${m.label}</div>
      <div>${m.text}</div>
    </div>`).join("");
}

// ─────────────────────────────────────────────────────────────────────
// GRÁFICA DE TENDENCIA (6 meses)
// ─────────────────────────────────────────────────────────────────────
function renderTrendChart(trend) {
  const canvas = $("trend-chart");
  if (!canvas || !trend?.length) return;

  const months = trend.map(t => {
    const [y, m] = t.month.split("-");
    return new Date(y, m - 1).toLocaleDateString("es-VE", { month: "short", year: "2-digit" });
  });
  const revenues = trend.map(t => parseFloat(t.revenue || 0));

  if (window._trendChart) window._trendChart.destroy();
  window._trendChart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Ingresos",
        data: revenues,
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,.08)",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "#16a34a",
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          beginAtZero: true,
          ticks: { callback: v => "$" + (v >= 1000 ? (v/1000).toFixed(0)+"k" : v), font: { size: 11 } },
          grid: { color: "#f1f5f9" },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// GRÁFICA BALANCE TOC
// ─────────────────────────────────────────────────────────────────────
function renderBalanceChart(d) {
  const canvas = $("balance-chart");
  if (!canvas) return;

  if (window._balanceChart) window._balanceChart.destroy();
  window._balanceChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Throughput", "Gastos Op.", "Utilidad Neta", "Caja"],
      datasets: [{
        data: [d.throughput, d.operating_expenses, Math.abs(d.net_profit), Math.abs(d.cash_flow)],
        backgroundColor: [
          "#16a34a",
          "#dc2626",
          d.net_profit >= 0 ? "#2563eb" : "#dc2626",
          "#7c3aed",
        ],
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          beginAtZero: true,
          ticks: { callback: v => "$" + (v >= 1000 ? (v/1000).toFixed(0)+"k" : v), font: { size: 10 } },
          grid: { color: "#f8fafc" },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// RESTRICCIONES ACTIVAS
// ─────────────────────────────────────────────────────────────────────
function renderRestrictions(d) {
  const a = d.alerts || {};
  const items = [];

  if (a.negative_profit) items.push({ cls:"alert-red",   icon:"bi-x-circle-fill",        title:"Utilidad negativa",        desc:"Gastos superan ingresos" });
  if (a.zero_stock > 0)  items.push({ cls:"alert-red",   icon:"bi-exclamation-triangle-fill", title:`${a.zero_stock} prod. sin stock`, desc:"Ruptura de inventario" });
  if (a.low_stock > 0)   items.push({ cls:"alert-amber", icon:"bi-exclamation-circle-fill",  title:`${a.low_stock} prod. con stock bajo`, desc:"Cuello de botella" });
  if (a.high_cxc)        items.push({ cls:"alert-amber", icon:"bi-person-dash",              title:"CxC > Caja",              desc:"Capital inmovilizado en crédito" });
  if (a.overdue_suppliers>0) items.push({ cls:"alert-amber", icon:"bi-truck",              title:`${a.overdue_suppliers} prov. sin pagar`, desc:"Riesgo de cadena de suministro" });
  if (a.high_oe_ratio)   items.push({ cls:"alert-amber", icon:"bi-speedometer2",            title:"Eficiencia OE < 30%",      desc:"Gastos sobre el 70% del ingreso" });

  if (!items.length) {
    items.push({ cls:"alert-green", icon:"bi-check-circle-fill", title:"Sin restricciones detectadas", desc:"Sistema operativo en equilibrio" });
  }

  const el = $("restrictions-list");
  if (!el) return;
  el.innerHTML = items.map(it => `
    <div class="alert-item ${it.cls}">
      <i class="bi ${it.icon} alert-icon"></i>
      <div><div class="alert-title">${it.title}</div><div class="alert-desc">${it.desc}</div></div>
    </div>`).join("");
}

// ─────────────────────────────────────────────────────────────────────
// TOC METRICS
// ─────────────────────────────────────────────────────────────────────
function renderTOCMetrics(d) {
  const el = $("toc-metrics");
  if (!el) return;
  const effPct = (d.efficiency_ratio * 100).toFixed(0);
  el.innerHTML = `
    <div class="toc-row"><span class="toc-name">Ratio OE/T (ideal &lt;70%)</span><span class="toc-val" style="color:${effPct>80?"#dc2626":effPct>70?"#d97706":"#16a34a"}">${effPct}%</span></div>
    <div class="toc-row"><span class="toc-name">Ticket promedio</span><span class="toc-val">${fmt(d.avg_order_value)}</span></div>
    <div class="toc-row"><span class="toc-name">Pedidos confirmados</span><span class="toc-val">${fmtN(d.orders_count)}</span></div>
    <div class="toc-row"><span class="toc-name">Inventario inmovilizado</span><span class="toc-val">${fmt(d.inventory_value)}</span></div>`;
}

// ─────────────────────────────────────────────────────────────────────
// INVENTARIO
// ─────────────────────────────────────────────────────────────────────
function renderInventoryPanel(d) {
  const inv = d.inventory_stats || {};
  const el = $("inventory-panel");
  if (!el) return;

  const cov = parseFloat(inv.avg_coverage_pct || 100);
  const covColor = cov < 50 ? "#dc2626" : cov < 100 ? "#d97706" : "#16a34a";

  el.innerHTML = `
    <div class="toc-row"><span class="toc-name">Total productos</span><span class="toc-val">${fmtN(inv.total_products)}</span></div>
    <div class="toc-row"><span class="toc-name">Sin stock (urgente)</span><span class="toc-val" style="color:${inv.zero_stock_count>0?"#dc2626":"#16a34a"}">${inv.zero_stock_count}</span></div>
    <div class="toc-row"><span class="toc-name">Stock bajo mínimo</span><span class="toc-val" style="color:${inv.low_stock_count>0?"#d97706":"#16a34a"}">${inv.low_stock_count}</span></div>
    <div style="margin-top:10px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px;">
        <span>Cobertura promedio de stock</span><span style="font-weight:700;color:${covColor};">${cov}%</span>
      </div>
      <div class="prog-wrap"><div class="prog-fill" style="width:${Math.min(cov,100)}%;background:${covColor};"></div></div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────
// MARKETING
// ─────────────────────────────────────────────────────────────────────
function renderMarketingPanel(d) {
  const mkt = d.marketing || {};
  const el = $("marketing-panel");
  if (!el) return;

  if (!mkt.campaigns && !mkt.active_influencers) {
    el.innerHTML = `<p style="font-size:12px;color:#94a3b8;">No hay campañas activas registradas.</p>`;
    return;
  }
  el.innerHTML = `
    <div class="toc-row"><span class="toc-name">Campañas activas</span><span class="toc-val">${mkt.campaigns}</span></div>
    <div class="toc-row"><span class="toc-name">Inversión ads/mes</span><span class="toc-val">${fmt(mkt.monthly_ad_spend)}</span></div>
    <div class="toc-row"><span class="toc-name">Influencers activos</span><span class="toc-val">${mkt.active_influencers}</span></div>
    <div class="toc-row"><span class="toc-name">Inversión influencers</span><span class="toc-val">${fmt(mkt.influencer_spend)}</span></div>
    <div class="toc-row" style="border-top:1px solid #f1f5f9;margin-top:4px;padding-top:8px;">
      <span class="toc-name" style="font-weight:600;color:#0f172a;">Total MKT</span>
      <span class="toc-val" style="color:#7c3aed;">${fmt(mkt.total_mkt_investment)}</span>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────
// TOP PRODUCTOS
// ─────────────────────────────────────────────────────────────────────
function renderTopProducts(products) {
  const el = $("top-products-list");
  if (!el) return;
  if (!products?.length) { el.innerHTML = `<p style="font-size:12px;color:#94a3b8;">Aún no hay ventas confirmadas.</p>`; return; }
  const max = Math.max(...products.map(p => parseFloat(p.total_revenue || 0)));
  el.innerHTML = products.map((p, i) => {
    const rev = parseFloat(p.total_revenue || 0);
    const widthPct = max > 0 ? (rev / max * 100).toFixed(0) : 0;
    return `
      <div class="product-row">
        <div class="product-rank">${i + 1}</div>
        <div style="flex:1;">
          <div class="product-name">${p.name}</div>
          <div class="prog-wrap" style="margin-top:4px;"><div class="prog-fill" style="width:${widthPct}%;background:#16a34a;"></div></div>
        </div>
        <div style="text-align:right;min-width:70px;">
          <div class="product-rev">${fmt(rev)}</div>
          <div style="font-size:11px;color:#94a3b8;">${fmtN(p.total_qty)} uds.</div>
        </div>
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────────────────────────────────
// CxC / CxP
// ─────────────────────────────────────────────────────────────────────
function renderDebtPanel(d) {
  const el = $("debt-panel");
  if (!el) return;
  const cxc = parseFloat(d.accounts_receivable || 0);
  const cxp = parseFloat(d.accounts_payable || 0);
  const balance = cxc - cxp;
  el.innerHTML = `
    <div class="toc-row"><span class="toc-name">CxC (te deben)</span><span class="toc-val" style="color:#2563eb;">${fmt(cxc)}</span></div>
    <div class="toc-row"><span class="toc-name">Clientes a crédito</span><span class="toc-val">${d.credit_customers || 0}</span></div>
    <div class="toc-row"><span class="toc-name">CxP (debes tú)</span><span class="toc-val" style="color:#dc2626;">${fmt(cxp)}</span></div>
    <div class="toc-row"><span class="toc-name">Proveedores pendientes</span><span class="toc-val">${d.overdue_suppliers || 0}</span></div>
    <div class="toc-row" style="border-top:1px solid #f1f5f9;margin-top:4px;padding-top:8px;">
      <span class="toc-name" style="font-weight:600;color:#0f172a;">Balance neto deuda</span>
      <span class="toc-val" style="color:${balance>=0?"#16a34a":"#dc2626"};">${fmt(balance)}</span>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────
// PROYECCIÓN
// ─────────────────────────────────────────────────────────────────────
function renderProjection(d) {
  const el = $("projection-panel");
  if (!el) return;
  const proj = d.projection || {};
  const g = proj.growth_rate || 0;
  const gColor = g > 0 ? "#16a34a" : g < 0 ? "#dc2626" : "#64748b";
  el.innerHTML = `
    <div class="toc-row"><span class="toc-name">Tasa diaria (7d)</span><span class="toc-val">${fmt(proj.daily_rate_7d)}/día</span></div>
    <div class="toc-row"><span class="toc-name">Proyección del mes</span><span class="toc-val" style="color:#2563eb;">${fmt(proj.projected_monthly)}</span></div>
    <div class="toc-row"><span class="toc-name">Tendencia</span><span class="toc-val" style="color:${gColor};">${g > 0 ? "+" : ""}${g}%</span></div>`;
}

// ─────────────────────────────────────────────────────────────────────
// TABLA DE ROTACIÓN
// ─────────────────────────────────────────────────────────────────────
function renderRotationTable(rotation) {
  const tbody = $("rotation-body");
  if (!tbody) return;
  if (!rotation?.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:12px;color:#94a3b8;font-size:12px;">Sin datos de rotación aún.</td></tr>`; return; }

  tbody.innerHTML = rotation.map(r => {
    const days = parseInt(r.days_of_stock || 999);
    let statusColor, statusLabel;
    if (days === 999 || r.sold_30d == 0) { statusColor = "#94a3b8"; statusLabel = "Sin movimiento"; }
    else if (days <= 7)   { statusColor = "#dc2626"; statusLabel = `Crítico (${days}d)`; }
    else if (days <= 14)  { statusColor = "#d97706"; statusLabel = `Bajo (${days}d)`; }
    else if (days <= 30)  { statusColor = "#2563eb"; statusLabel = `Normal (${days}d)`; }
    else                  { statusColor = "#16a34a"; statusLabel = `Holgado (${days}d)`; }

    return `
      <tr>
        <td style="font-weight:500;">${r.name}</td>
        <td>${fmtN(r.stock, 0)}</td>
        <td>${fmtN(r.sold_30d, 0)}</td>
        <td>${days === 999 ? "—" : days + " días"}</td>
        <td><span style="font-size:11px;font-weight:700;color:${statusColor};">${statusLabel}</span></td>
      </tr>`;
  }).join("");
}

// ─────────────────────────────────────────────────────────────────────
// ERROR FALLBACK
// ─────────────────────────────────────────────────────────────────────
function showFallbackError() {
  const c = $("ic-msgs");
  if (c) c.innerHTML = `
    <div class="ic-msg danger">
      <div class="ic-label">Error de conexión</div>
      No se pudo cargar el análisis. Verifica tu conexión e intenta de nuevo.
      <button class="ic-btn ic-btn-primary" style="margin-top:10px;" onclick="loadIntelligence()">
        <i class="bi bi-arrow-clockwise"></i> Reintentar
      </button>
    </div>`;
}


