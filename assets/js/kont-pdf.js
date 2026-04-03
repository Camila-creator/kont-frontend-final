// assets/js/kont-pdf.js
// Librería centralizada de PDFs para Kont
// Usa jsPDF (cargado desde CDN) — no requiere cambios en el backend
// Incluir en cualquier página: <script src="../assets/js/kont-pdf.js"></script>
// Prerequisito: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

const KontPDF = (() => {

  // ─────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────
  function getEmpresa() {
    const u = JSON.parse(localStorage.getItem("agromedic_user") || "{}");
    return {
      name: u.company_name || "Mi Empresa",
      logo: u.logo_url || null,
    };
  }

  function fmt(n) {
    return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-VE");
  }

  function nowStr() {
    return new Date().toLocaleString("es-VE");
  }

  // Cabecera estándar de página
  function addHeader(doc, titulo, subtitulo) {
    const empresa = getEmpresa();
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(empresa.name.toUpperCase(), 14, 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(titulo.toUpperCase(), 14, 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(subtitulo, W - 14, 12, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado: ${nowStr()}`, W - 14, 18, { align: "right" });

    return 30;
  }

  // Pie de página
  function addFooter(doc) {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, H - 12, W - 14, H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Kont Admin — Sistema de Gestión Empresarial", 14, H - 6);
    doc.text(`Pág. ${doc.getCurrentPageInfo().pageNumber}`, W - 14, H - 6, { align: "right" });
  }

  // Tabla genérica
  function addTable(doc, y, headers, rows, colWidths) {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const rowH = 8;
    const margin = 14;

    // Cabecera de tabla
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, W - margin * 2, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    let x = margin + 2;
    headers.forEach((h, i) => {
      const align = colWidths[i] < 0 ? "right" : "left";
      const cw = Math.abs(colWidths[i]);
      doc.text(h, align === "right" ? x + cw - 2 : x, y + 5.5, { align });
      x += cw;
    });

    y += rowH;

    // Filas
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    rows.forEach((row, ri) => {
      if (y + rowH > H - 20) {
        addFooter(doc);
        doc.addPage();
        y = addHeader(doc, "", "");
        // Repetir cabecera tabla
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, W - margin * 2, rowH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        x = margin + 2;
        headers.forEach((h, i) => {
          const align = colWidths[i] < 0 ? "right" : "left";
          const cw = Math.abs(colWidths[i]);
          doc.text(h, align === "right" ? x + cw - 2 : x, y + 5.5, { align });
          x += cw;
        });
        y += rowH;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      // Fila zebra
      if (ri % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, W - margin * 2, rowH, "F");
      }

      doc.setTextColor(30, 41, 59);
      x = margin + 2;
      row.forEach((cell, i) => {
        const align = colWidths[i] < 0 ? "right" : "left";
        const cw = Math.abs(colWidths[i]);
        const text = String(cell ?? "—");
        doc.text(text, align === "right" ? x + cw - 2 : x, y + 5.5, { align, maxWidth: cw - 3 });
        x += cw;
      });

      // Línea divisoria
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowH, W - margin, y + rowH);
      y += rowH;
    });

    return y + 4;
  }

  // Fila de resumen total
  function addTotal(doc, y, label, value, highlight = false) {
    const W = doc.internal.pageSize.getWidth();
    if (highlight) {
      doc.setFillColor(15, 23, 42);
      doc.rect(W - 80, y, 66, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(label, W - 76, y + 7);
      doc.text(value, W - 16, y + 7, { align: "right" });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label, W - 80, y + 7);
      doc.setTextColor(30, 41, 59);
      doc.text(value, W - 16, y + 7, { align: "right" });
    }
    return y + 12;
  }

  // ─────────────────────────────────────────────────────
  // PDF 1: CIERRE DE CAJA
  // ─────────────────────────────────────────────────────
  function pdfCierreCaja(data, fecha) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = addHeader(doc, "Cierre de Caja", fecha || fmtDate(new Date()));

    // KPIs
    const W = doc.internal.pageSize.getWidth();
    const kpis = [
      { label: "Total ingresos", value: fmt(data.ingresos), color: [220, 252, 231] },
      { label: "Total egresos", value: fmt(data.egresos), color: [254, 226, 226] },
      { label: "Saldo neto", value: fmt(Number(data.ingresos || 0) - Number(data.egresos || 0)), color: [239, 246, 255] },
    ];

    const kw = (W - 28 - 8) / 3;
    kpis.forEach((k, i) => {
      const kx = 14 + i * (kw + 4);
      doc.setFillColor(...k.color);
      doc.roundedRect(kx, y, kw, 18, 3, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(k.label.toUpperCase(), kx + 5, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(k.value, kx + 5, y + 14);
    });
    y += 24;

    // Tasa del día
    if (data.tasa) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tasa del día: Bs. ${Number(data.tasa).toFixed(2)} / USD`, 14, y);
      y += 8;
    }

    // Desglose por método de pago
    if (data.desgloseMetodos && data.desgloseMetodos.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Ingresos por método de pago", 14, y);
      y += 4;
      y = addTable(doc, y,
        ["Método", "Total USD"],
        data.desgloseMetodos.map(m => [m.metodo, fmt(m.total)]),
        [130, -42]
      );
    }

    // Movimientos del día
    if (data.movimientos && data.movimientos.length > 0) {
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Movimientos del día", 14, y);
      y += 4;
      y = addTable(doc, y,
        ["Hora", "Tipo", "Descripción", "Método", "Monto"],
        data.movimientos.map(m => [
          m.created_at ? new Date(m.created_at).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }) : "—",
          m.tipo,
          m.descripcion || "—",
          m.metodo_pago || "—",
          fmt(m.monto),
        ]),
        [18, 20, 70, 30, -28]
      );
    }

    addFooter(doc);
    doc.save(`cierre_caja_${fecha || "hoy"}.pdf`);
  }

  // ─────────────────────────────────────────────────────
  // PDF 2: INVENTARIO DE PRODUCTOS
  // ─────────────────────────────────────────────────────
  function pdfInventarioProductos(productos, onlyLowStock = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const titulo = onlyLowStock ? "Stock Crítico — Productos" : "Inventario de Productos";
    let y = addHeader(doc, titulo, new Date().toLocaleDateString("es-VE"));

    const lista = onlyLowStock
      ? productos.filter(p => Number(p.stock) <= Number(p.min_stock))
      : productos;

    if (lista.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(onlyLowStock ? "No hay productos con stock crítico." : "No hay productos registrados.", 14, y + 10);
      addFooter(doc);
      doc.save(`${onlyLowStock ? "stock_critico" : "inventario_productos"}.pdf`);
      return;
    }

    // Resumen
    const total = lista.length;
    const criticos = lista.filter(p => Number(p.stock) <= Number(p.min_stock)).length;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total: ${total} productos${criticos > 0 && !onlyLowStock ? `  •  Stock crítico: ${criticos}` : ""}`, 14, y);
    y += 8;

    y = addTable(doc, y,
      ["#", "Código", "Nombre del producto", "Categoría", "Unidad", "Stock", "Mín.", "Costo", "Precio detal", "Precio mayor"],
      lista.map((p, i) => [
        i + 1,
        p.product_number || p.id,
        p.name,
        p.category || "—",
        p.unit || "UNIDAD",
        Number(p.stock).toFixed(2),
        Number(p.min_stock).toFixed(2),
        fmt(p.buy_cost),
        fmt(p.retail_price),
        fmt(p.mayor_price),
      ]),
      [10, 15, 65, 30, 18, -14, -14, -20, -22, -22]
    );

    addFooter(doc);
    doc.save(`${onlyLowStock ? "stock_critico_productos" : "inventario_productos"}_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  // ─────────────────────────────────────────────────────
  // PDF 3: INVENTARIO DE INSUMOS
  // ─────────────────────────────────────────────────────
  function pdfInventarioInsumos(insumos, onlyLowStock = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const titulo = onlyLowStock ? "Stock Crítico — Insumos" : "Inventario de Insumos";
    let y = addHeader(doc, titulo, new Date().toLocaleDateString("es-VE"));

    const lista = onlyLowStock
      ? insumos.filter(s => Number(s.stock) <= Number(s.min_stock))
      : insumos;

    if (lista.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(onlyLowStock ? "No hay insumos con stock crítico." : "No hay insumos registrados.", 14, y + 10);
      addFooter(doc);
      doc.save(`${onlyLowStock ? "stock_critico_insumos" : "inventario_insumos"}.pdf`);
      return;
    }

    y = addTable(doc, y,
      ["#", "Nombre del insumo", "Categoría", "Unidad", "Stock", "Mín.", "Costo", "Vence"],
      lista.map((s, i) => [
        i + 1,
        s.nombre || s.name,
        s.categoria_nombre || "—",
        s.unidad || s.unit || "UNIDAD",
        Number(s.stock).toFixed(2),
        Number(s.min_stock).toFixed(2),
        fmt(s.costo || s.cost),
        s.has_expiry ? fmtDate(s.expiry_date) : "—",
      ]),
      [10, 75, 35, 20, -14, -14, -20, -20]
    );

    addFooter(doc);
    doc.save(`${onlyLowStock ? "stock_critico_insumos" : "inventario_insumos"}_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  // ─────────────────────────────────────────────────────
  // PDF 4: LISTA DE PEDIDOS
  // ─────────────────────────────────────────────────────
  function pdfPedidos(pedidos, filtro) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    let y = addHeader(doc, "Lista de Pedidos", filtro || new Date().toLocaleDateString("es-VE"));

    const total = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${pedidos.length} pedidos  •  Total: ${fmt(total)}`, 14, y);
    y += 8;

    y = addTable(doc, y,
      ["#Pedido", "Fecha", "Cliente", "Ítems", "Estado", "Términos", "Total"],
      pedidos.map(p => [
        `#${String(p.order_number || p.id).padStart(4, "0")}`,
        fmtDate(p.order_date || p.created_at),
        p.customer_name || "—",
        p.items_count || "—",
        p.status || "—",
        p.terms || "—",
        fmt(p.total),
      ]),
      [20, 22, 80, -10, 20, 18, -24]
    );

    y = addTotal(doc, y + 4, "TOTAL GENERAL", fmt(total), true);
    addFooter(doc);
    doc.save(`pedidos_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  // ─────────────────────────────────────────────────────
  // PDF 5: ESTADO DE CUENTA CLIENTE (CxC)
  // ─────────────────────────────────────────────────────
  function pdfEstadoCuentaCliente(cliente, pedidos, pagos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = addHeader(doc, "Estado de Cuenta", new Date().toLocaleDateString("es-VE"));

    // Info del cliente
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 20, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(cliente.name || "Cliente", 20, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (cliente.doc) doc.text(`CI/RIF: ${cliente.doc}`, 20, y + 14);
    if (cliente.phone) doc.text(`Tel: ${cliente.phone}`, 80, y + 14);
    y += 26;

    const totalVendido = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
    const totalPagado = pagos.reduce((s, p) => s + Number(p.amount || 0), 0);
    const saldo = totalVendido - totalPagado;

    // Pedidos
    if (pedidos.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Pedidos / Facturas", 14, y);
      y += 4;
      y = addTable(doc, y,
        ["#Pedido", "Fecha", "Estado", "Total"],
        pedidos.map(p => [
          `#${String(p.order_number || p.id).padStart(4, "0")}`,
          fmtDate(p.order_date || p.created_at),
          p.status,
          fmt(p.total),
        ]),
        [30, 30, 30, -90]
      );
    }

    // Pagos
    if (pagos.length > 0) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Pagos recibidos", 14, y);
      y += 4;
      y = addTable(doc, y,
        ["Fecha", "Método", "Referencia", "Monto"],
        pagos.map(p => [
          fmtDate(p.paid_at),
          p.method,
          p.ref || "—",
          fmt(p.amount),
        ]),
        [30, 30, 90, -30]
      );
    }

    // Resumen
    y += 6;
    y = addTotal(doc, y, "Total facturado", fmt(totalVendido));
    y = addTotal(doc, y, "Total pagado", fmt(totalPagado));
    y = addTotal(doc, y, "SALDO PENDIENTE", fmt(saldo), true);

    addFooter(doc);
    doc.save(`estado_cuenta_${(cliente.name || "cliente").replace(/\s+/g, "_").toLowerCase()}.pdf`);
  }

  // ─────────────────────────────────────────────────────
  // PDF 6: LISTA DE COMPRAS
  // ─────────────────────────────────────────────────────
  function pdfCompras(compras, filtro) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    let y = addHeader(doc, "Informe de Compras", filtro || new Date().toLocaleDateString("es-VE"));

    const total = compras.reduce((s, c) => s + Number(c.total || 0), 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${compras.length} compras  •  Total: ${fmt(total)}`, 14, y);
    y += 8;

    y = addTable(doc, y,
      ["#Compra", "Fecha", "Proveedor", "Ref. Factura", "Condición", "Estado", "Total"],
      compras.map(c => [
        `#${String(c.purchase_number || c.id).padStart(4, "0")}`,
        fmtDate(c.purchase_date),
        c.supplier_name || "—",
        c.invoice_ref || "—",
        c.condition || "—",
        c.status || "—",
        fmt(c.total),
      ]),
      [20, 22, 65, 30, 20, 20, -27]
    );

    y = addTotal(doc, y + 4, "TOTAL COMPRAS", fmt(total), true);
    addFooter(doc);
    doc.save(`compras_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  // ─────────────────────────────────────────────────────
  // EXPORTAR
  // ─────────────────────────────────────────────────────
  return {
    cierreCaja: pdfCierreCaja,
    inventarioProductos: pdfInventarioProductos,
    stockCriticoProductos: (p) => pdfInventarioProductos(p, true),
    inventarioInsumos: pdfInventarioInsumos,
    stockCriticoInsumos: (s) => pdfInventarioInsumos(s, true),
    pedidos: pdfPedidos,
    estadoCuentaCliente: pdfEstadoCuentaCliente,
    compras: pdfCompras,
  };
})();

window.KontPDF = KontPDF;
