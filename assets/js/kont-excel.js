// assets/js/kont-excel.js
// Exportación a Excel con SheetJS — librería centralizada de Kont
// Prerequisito en el HTML: <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
//
// Uso desde cualquier página:
//   KontExcel.productos(data)
//   KontExcel.pedidos(data)
//   KontExcel.compras(data)
//   etc.

const KontExcel = (() => {

  // ── Helper: crear y descargar workbook ──────────────────────────
  function download(wb, filename) {
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  function sheet(data, cols) {
    const ws = XLSX.utils.json_to_sheet(data);
    // Ancho de columnas automático
    ws["!cols"] = cols || data[0] ? Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 14) })) : [];
    return ws;
  }

  function wb(ws, sheetName) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    return workbook;
  }

  function fmt(n)  { return Number(n || 0).toFixed(2); }
  function fmtD(d) { return d ? new Date(d).toLocaleDateString("es-VE") : "—"; }

  // ── 1. PRODUCTOS / INVENTARIO ───────────────────────────────────
  function exportProductos(productos, soloStockCritico = false) {
    const lista = soloStockCritico
      ? productos.filter(p => Number(p.stock) <= Number(p.min_stock))
      : productos;

    const rows = lista.map(p => ({
      "Código":          p.product_number || p.id,
      "Nombre":          p.name,
      "Categoría":       p.category || "—",
      "Unidad":          p.unit || "UNIDAD",
      "Stock actual":    fmt(p.stock),
      "Stock mínimo":    fmt(p.min_stock),
      "Alerta stock":    Number(p.stock) <= Number(p.min_stock) ? "⚠ BAJO" : "OK",
      "Costo compra $":  fmt(p.buy_cost),
      "Precio detal $":  fmt(p.retail_price),
      "Precio mayor $":  fmt(p.mayor_price),
      "Vence":           p.has_expiry ? fmtD(p.expiry_date) : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [10,35,18,12,14,14,14,16,16,16,14].map(w => ({ wch: w }));
    download(wb(ws, "Inventario"), soloStockCritico ? "stock_critico" : "inventario_productos");
  }

  // ── 2. INSUMOS ─────────────────────────────────────────────────
  function exportInsumos(insumos, soloStockCritico = false) {
    const lista = soloStockCritico
      ? insumos.filter(s => Number(s.stock) <= Number(s.min_stock))
      : insumos;

    const rows = lista.map(s => ({
      "Nombre":        s.nombre || s.name,
      "Categoría":     s.categoria_nombre || "—",
      "Unidad":        s.unidad || s.unit || "UNIDAD",
      "Stock actual":  fmt(s.stock),
      "Stock mínimo":  fmt(s.min_stock),
      "Alerta":        Number(s.stock) <= Number(s.min_stock) ? "⚠ BAJO" : "OK",
      "Costo $":       fmt(s.costo || s.cost),
      "Vence":         s.has_expiry ? fmtD(s.expiry_date) : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [35,20,12,14,14,12,14,14].map(w => ({ wch: w }));
    download(wb(ws, "Insumos"), soloStockCritico ? "stock_critico_insumos" : "inventario_insumos");
  }

  // ── 3. PEDIDOS ─────────────────────────────────────────────────
  function exportPedidos(pedidos, filtroLabel = "") {
    const rows = pedidos.map(p => ({
      "#Pedido":       String(p.order_number || p.id).padStart(4, "0"),
      "Fecha":         fmtD(p.order_date || p.created_at),
      "Cliente":       p.customer_name || "—",
      "Estado":        p.status,
      "Términos":      p.terms || "—",
      "Precio base":   p.price_mode || "—",
      "Ítems":         p.items_count || 0,
      "Descuento $":   fmt(p.discount_amount),
      "Total $":       fmt(p.total),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [10,14,30,14,12,12,8,14,14].map(w => ({ wch: w }));
    download(wb(ws, "Pedidos"), "pedidos");
  }

  // ── 4. PEDIDO DETALLE (con items) ─────────────────────────────
  function exportPedidoDetalle(order) {
    const wsInfo = XLSX.utils.json_to_sheet([{
      "Pedido #":     String(order.order_number || order.id).padStart(4,"0"),
      "Fecha":        fmtD(order.order_date || order.created_at),
      "Cliente":      order.customer?.name || order.customer_name || "—",
      "Estado":       order.status,
      "Total $":      fmt(order.total),
    }]);

    const items = (order.items || []).map(it => ({
      "Producto":     it.product_name,
      "Cantidad":     fmt(it.qty),
      "Precio unit $":fmt(it.unit_price),
      "Total $":      fmt(it.total),
    }));
    const wsItems = XLSX.utils.json_to_sheet(items.length ? items : [{ "Info": "Sin items" }]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsInfo, "Pedido");
    XLSX.utils.book_append_sheet(workbook, wsItems, "Items");
    download(workbook, `pedido_${order.order_number || order.id}`);
  }

  // ── 5. COMPRAS ─────────────────────────────────────────────────
  function exportCompras(compras) {
    const rows = compras.map(c => ({
      "#Compra":         String(c.purchase_number || c.id).padStart(4,"0"),
      "Fecha":           fmtD(c.purchase_date),
      "Proveedor":       c.supplier_name || "—",
      "Ref. Factura":    c.invoice_ref || "—",
      "Condición":       c.condition || "—",
      "Vence":           c.due_date ? fmtD(c.due_date) : "—",
      "Moneda":          c.currency_code || "USD",
      "Tasa":            fmt(c.exchange_rate),
      "Estado":          c.status || "—",
      "Total $":         fmt(c.total),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [10,14,30,18,12,14,10,10,12,14].map(w => ({ wch: w }));
    download(wb(ws, "Compras"), "compras");
  }

  // ── 6. CLIENTES ────────────────────────────────────────────────
  function exportClientes(clientes) {
    const rows = clientes.map(c => ({
      "Nombre":      c.name,
      "CI / RIF":    c.doc || "—",
      "Tipo":        c.type || "—",
      "Teléfono":    c.phone || "—",
      "Email":       c.email || "—",
      "Dirección":   c.address || c.location || "—",
      "Términos":    c.terms || "CONTADO",
      "Notas":       c.notes || "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [30,16,12,18,28,35,12,30].map(w => ({ wch: w }));
    download(wb(ws, "Clientes"), "clientes");
  }

  // ── 7. PROVEEDORES ─────────────────────────────────────────────
  function exportProveedores(proveedores) {
    const rows = proveedores.map(p => ({
      "Nombre":         p.nombre,
      "RIF":            p.rif || "—",
      "Teléfono":       p.telefono || "—",
      "Email":          p.email || "—",
      "Ubicación":      p.ubicacion || "—",
      "Contacto":       p.contacto || "—",
      "Cond. pago":     p.condiciones_pago || "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [30,16,18,28,30,20,18].map(w => ({ wch: w }));
    download(wb(ws, "Proveedores"), "proveedores");
  }

  // ── 8. GASTOS ──────────────────────────────────────────────────
  function exportGastos(gastos) {
    const rows = gastos.map(g => ({
      "Fecha":         fmtD(g.expense_date),
      "Categoría":     g.category || "—",
      "Descripción":   g.description,
      "Método pago":   g.payment_method || "—",
      "Proveedor":     g.supplier_name || g.purchase_place || "—",
      "Cuenta":        g.account_name || "—",
      "Moneda":        g.currency || "USD",
      "Monto $":       fmt(g.amount),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [14,14,35,16,25,20,10,14].map(w => ({ wch: w }));
    download(wb(ws, "Gastos"), "gastos");
  }

  // ── 9. PAGOS DE CLIENTES (CxC) ─────────────────────────────────
  function exportPagosClientes(pagos) {
    const rows = pagos.map(p => ({
      "Fecha":        fmtD(p.paid_at),
      "Cliente":      p.customer_name || "—",
      "#Pedido":      p.order_id ? String(p.order_id).padStart(4,"0") : "—",
      "Método":       p.method || "—",
      "Referencia":   p.ref || "—",
      "Cuenta":       p.account_name || "—",
      "Monto $":      fmt(p.amount),
      "Monto Bs.":    p.amount_native ? fmt(p.amount_native) : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [14,30,10,18,20,20,14,14].map(w => ({ wch: w }));
    download(wb(ws, "Pagos Clientes"), "pagos_clientes");
  }

  // ── 10. NÓMINA ─────────────────────────────────────────────────
  function exportNomina(period) {
    const items = period.items || [];
    const rows = items.map(i => ({
      "Empleado":     i.employee_name,
      "Cédula":       i.id_number || "—",
      "Cargo":        i.position || "—",
      "Salario base $": fmt(i.base_salary),
      "Cesta ticket $": fmt(i.food_bonus),
      "Transporte $":   fmt(i.transport_bonus),
      "H.Extra $":      fmt(i.overtime_amount),
      "Bonos $":        fmt(i.bonuses),
      "Bruto $":        fmt(i.gross_salary),
      "SSO (-)":        fmt(i.sso_deduction),
      "INCES (-)":      fmt(i.inces_deduction),
      "FAOV (-)":       fmt(i.faov_deduction),
      "Préstamo (-)":   fmt(i.loan_deduction),
      "Total Ded. $":   fmt(i.total_deductions),
      "Neto $ USD":     fmt(i.net_salary),
      "Neto Bs.":       fmt(i.net_salary_bs),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [28,14,20,16,16,14,12,12,14,12,12,12,12,14,14,16].map(w => ({ wch: w }));
    download(wb(ws, "Nómina"), `nomina_${period.period_label?.replace(/\s/g,"_") || "periodo"}`);
  }

  // ── 11. CONCILIACIÓN ──────────────────────────────────────────
  function exportConciliacion(recon) {
    const lines = recon.lines || [];
    const rows = lines.map(l => ({
      "Fecha":          fmtD(l.line_date),
      "Descripción":    l.description || "—",
      "Referencia":     l.reference || "—",
      "Monto $":        fmt(l.amount),
      "Tipo":           Number(l.amount) >= 0 ? "Crédito" : "Débito",
      "Estado":         l.match_status,
      "Tipo vinculado": l.matched_payment_type || "—",
      "ID vinculado":   l.matched_payment_id || "—",
      "Confianza %":    l.match_confidence || 0,
      "Nota":           l.manual_note || "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [14,35,20,14,12,14,18,12,14,30].map(w => ({ wch: w }));
    download(wb(ws, "Conciliación"), `conciliacion_${recon.period_label?.replace(/\s/g,"_") || "periodo"}`);
  }

  // ── 12. DEVOLUCIONES ───────────────────────────────────────────
  function exportDevoluciones(creditNotes) {
    const rows = creditNotes.map(cn => ({
      "Número nota":   cn.note_number,
      "#Pedido orig.": String(cn.order_number||"").padStart(4,"0"),
      "Cliente":       cn.customer_name || "—",
      "Tipo":          cn.type,
      "Motivo":        cn.reason,
      "Total $":       fmt(cn.total),
      "Estado":        cn.status,
      "Fecha":         fmtD(cn.created_at),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [18,12,28,10,35,12,12,14].map(w => ({ wch: w }));
    download(wb(ws, "Devoluciones"), "devoluciones");
  }

  // ── EXPORTAR ──────────────────────────────────────────────────
  return {
    productos:      exportProductos,
    stockCriticoProductos: p => exportProductos(p, true),
    insumos:        exportInsumos,
    stockCriticoInsumos:   s => exportInsumos(s, true),
    pedidos:        exportPedidos,
    pedidoDetalle:  exportPedidoDetalle,
    compras:        exportCompras,
    clientes:       exportClientes,
    proveedores:    exportProveedores,
    gastos:         exportGastos,
    pagosClientes:  exportPagosClientes,
    nomina:         exportNomina,
    conciliacion:   exportConciliacion,
    devoluciones:   exportDevoluciones,
  };
})();

window.KontExcel = KontExcel;
