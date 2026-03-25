let pedidoActual = null; 

/**
 * 1. BÚSQUEDA Y CARGA DE DATOS
 */
async function buscarPedidoParaFacturar() {
    const orderId = document.getElementById('search-id').value;
    const token = localStorage.getItem("agromedic_token");
    const feedback = document.getElementById('feedback-busqueda');

    if (!orderId) return;

    try {
        const response = await fetch(`https://kont-backend-final.onrender.com/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result) {
            pedidoActual = result.data || result; 
            
            document.getElementById('format-selection').classList.remove('opacity-50', 'pointer-events-none');
            document.getElementById('action-buttons').classList.remove('hidden');
            
            if(feedback) {
                feedback.innerText = `✅ Pedido #${orderId} cargado`;
                feedback.className = "text-[10px] mt-2 font-bold uppercase text-emerald-600 block";
            }

            // --- ¡LA MAGIA AQUÍ! ---
            // Renderiza automáticamente la Nota de Entrega al cargar
            cambiarFormato('invoice'); 

        } else {
            pedidoActual = null;
            if(feedback) feedback.innerText = "❌ No encontrado";
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
/**
 * 2. ENVÍO POR WHATSAPP (Nueva función)
 */
function enviarPorWhatsApp() {
    if (!pedidoActual) return;

    const cliente = pedidoActual.customer || { name: pedidoActual.customer_name || 'Cliente', phone: '' };
    const empresa = pedidoActual.tenant || { name: 'Nuestra Tienda' };
    const items = pedidoActual.items || [];
    
    // Limpiar el número (quitar espacios, guiones, etc)
    const telefono = cliente.phone.replace(/\D/g, '');
    
    if (!telefono) {
        alert("El cliente no tiene un número de teléfono registrado.");
        return;
    }

    // Construcción del mensaje tipo "Ventas"
    let mensaje = `*Hola, ${cliente.name.split(' ')[0]}!* 👋\n`;
    mensaje += `Te enviamos el resumen de tu compra en *${empresa.name}*:\n\n`;
    mensaje += `*Orden:* #${pedidoActual.id}\n`;
    mensaje += `*Fecha:* ${new Date(pedidoActual.created_at).toLocaleDateString()}\n`;
    mensaje += `----------------------------\n`;
    
    items.forEach(it => {
        mensaje += `• ${it.qty}x ${it.product_name} - $${parseFloat(it.total).toFixed(2)}\n`;
    });

    mensaje += `----------------------------\n`;
    mensaje += `*Total a pagar: $${(pedidoActual.total_amount || 0).toFixed(2)}*\n\n`;
    mensaje += `¡Gracias por preferirnos! 🚀`;

    const url = `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

/**
 * 3. CONTROLADOR DE FORMATOS Y UI
 */
function cambiarFormato(formato) {
    if (!pedidoActual) return;

    const areaImpresion = document.getElementById('printable-area');
    const emptyState = document.getElementById('empty-state');

    // Manejo de visibilidad
    if(emptyState) emptyState.classList.add('hidden');
    areaImpresion.classList.remove('hidden');

    // Reset de estilos de botones
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'bg-blue-50');
    });

    // Resaltar botón seleccionado
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active', 'border-blue-500', 'bg-blue-50');
    }

    // Renderizado según selección
    if (formato === 'ticket') {
        areaImpresion.innerHTML = generarTicketHTML(pedidoActual);
        areaImpresion.className = "w-[300px] p-4 bg-white mx-auto text-xs font-mono border border-gray-200 shadow-xl";
    } else if (formato === 'invoice') {
        areaImpresion.innerHTML = generarNotaEntregaHTML(pedidoActual);
        areaImpresion.className = "w-[794px] min-h-[1123px] p-12 bg-white mx-auto border border-gray-200 shadow-xl";
    } else if (formato === 'garantia-tlf') {
        areaImpresion.innerHTML = generarGarantiaTelefonosHTML(pedidoActual);
        areaImpresion.className = "w-[850px] p-10 bg-white mx-auto border-2 border-black shadow-xl";
    } else if (formato === 'contract') {
        areaImpresion.innerHTML = generarContratoHTML(pedidoActual);
        areaImpresion.className = "w-[794px] p-20 bg-white mx-auto border border-gray-200 shadow-xl";
    }
}

/**
 * 4. FUNCIÓN DE IMPRESIÓN
 */
function ejecutarImpresion() {
    const area = document.getElementById('printable-area');
    if (!area || area.innerHTML.trim() === "") return;

    setTimeout(() => {
        window.print();
    }, 250);
}

/**
 * 5. TEMPLATES DE DOCUMENTOS
 * Genera el Certificado de Garantía para teléfonos
 */
function generarGarantiaTelefonosHTML(data) {
    const empresa = data.tenant || {};
    const cliente = data.customer || { 
        name: data.customer_name || 'N/A', 
        doc: data.customer_doc || 'N/A', 
        phone: data.customer_phone || 'N/A', 
        address: data.customer_address || 'N/A' 
    };
    
    // Tomamos el primer item del pedido/factura para los datos del equipo
    const item = data.items && data.items.length > 0 ? data.items[0] : {};
    const vendedor = data.user_name || localStorage.getItem("user_full_name") || "ADMINISTRADOR";
    
    const subtotal = data.items.reduce((acc, it) => acc + parseFloat(it.total || 0), 0);
    const descuento = parseFloat(data.discount_amount || data.discount || 0);
    const totalNeto = subtotal - descuento;

    return `
        <div class="p-2 border-2 border-black bg-white">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h1 class="text-5xl font-black italic text-red-600 leading-none tracking-tighter uppercase">${empresa.name || 'EMPRESA'}</h1>
                    <p class="text-[10px] font-bold tracking-[0.2em] text-gray-500">ELECTRONIC STORE & TECHNICAL SERVICE</p>
                    ${empresa.instagram ? `<p class="text-[11px] font-bold text-red-600 italic">IG: @${empresa.instagram}</p>` : ''}
                </div>
                <div class="text-right text-[10px] leading-tight font-bold">
                    <p class="text-sm underline mb-1 uppercase italic">Certificado de Garantía</p>
                    <p>FECHA: ${new Date(data.created_at || Date.now()).toLocaleDateString()}</p>
                    <p>ORDEN Nro: #00${data.id}</p>
                    <p>RIF: ${empresa.rif || 'S/RIF'}</p>
                    <p>${empresa.address || 'Valencia, Venezuela'}</p>
                </div>
            </div>

            <div class="bg-black text-white text-[10px] font-bold text-center py-1 uppercase mb-2">Información del Cliente</div>
            <div class="grid grid-cols-2 gap-x-10 gap-y-2 text-[11px] mb-4 px-2">
                <div class="flex border-b border-gray-300 pb-1 font-semibold italic">Nombre: <span class="ml-2 font-normal not-italic uppercase">${cliente.name}</span></div>
                <div class="flex border-b border-gray-300 pb-1 font-semibold italic">ID/RIF: <span class="ml-2 font-normal not-italic">${cliente.doc || cliente.document || 'S/D'}</span></div>
                <div class="flex border-b border-gray-300 pb-1 font-semibold italic">Dirección: <span class="ml-2 font-normal not-italic text-[10px]">${cliente.address || 'N/A'}</span></div>
                <div class="flex border-b border-gray-300 pb-1 font-semibold italic">Teléfono: <span class="ml-2 font-normal not-italic">${cliente.phone}</span></div>
            </div>

            <div class="bg-gray-800 text-white text-[10px] font-bold text-center py-1 uppercase mb-2">Información del Equipo</div>
            <div class="grid grid-cols-2 gap-x-10 gap-y-2 text-[11px] mb-4 px-2">
                <div class="flex border-b border-gray-300 pb-1 font-semibold italic">Modelo: <span class="ml-2 font-normal not-italic font-bold text-blue-800 uppercase">${item.product_name || item.product_name_snapshot || 'N/A'}</span></div>
                <div class="flex border-b border-gray-300 pb-1 font-semibold italic">
                    IMEI/Serial: <span class="ml-2 font-mono text-gray-700 font-bold uppercase">${item.imei_snapshot || item.imei || 'S/N'}</span>
                </div>
                <div class="flex border-b border-gray-300 pb-1 font-semibold italic">Capacidad: <span class="ml-2 font-normal not-italic">${item.capacity || 'N/A'}</span></div>
                <div class="flex border-b border-gray-300 pb-1 font-semibold italic font-bold">Total: <span class="ml-2 text-red-600 font-black text-sm">$${totalNeto.toFixed(2)}</span></div>
            </div>

            <div class="flex gap-4">
                <div class="w-1/2">
                    <table class="w-full text-[9px] border-collapse border border-black">
                        <thead>
                            <tr class="bg-gray-100 uppercase text-[8px] font-black">
                                <th class="border border-black p-1 text-left italic">Funcionalidad / Componente</th>
                                <th class="border border-black p-1 w-8">SI</th>
                                <th class="border border-black p-1 w-8">NO</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${['Cámara principal', 'Cámara frontal', 'Flash', 'Botones', 'Wifi', 'Puerto de carga', 'Microfono/Corneta', 'Pantalla', 'Face ID/Touch ID', 'Sensor Proximidad', 'Red Celular'].map(f => `
                                <tr class="border-b border-black">
                                    <td class="p-1 border-r border-black font-bold uppercase italic">${f}</td>
                                    <td class="border-r border-black text-center text-[7px]"></td>
                                    <td></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="w-1/2 flex flex-col justify-between">
                    <div class="border border-black p-2 bg-gray-50 text-[9px]">
                        <p class="font-black underline uppercase text-[8px] mb-1">Términos del Servicio:</p>
                        <p class="italic leading-tight text-justify">1. PANTALLAS: No poseen garantía una vez retirado el equipo del local.</p>
                        <p class="italic leading-tight text-justify">2. La garantía cubre fallas de fábrica por el periodo estipulado. Equipos mojados, golpeados, con sellos rotos o manipulados por terceros anulan este certificado.</p>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mt-6">
                        <div class="text-center">
                            <div class="w-16 h-20 border-2 border-black mx-auto mb-1 flex items-center justify-center text-[7px] text-gray-300 italic font-black uppercase">Huella</div>
                            <div class="border-t border-black text-[9px] font-black uppercase pt-1">Cliente</div>
                        </div>
                        <div class="text-center flex flex-col justify-end">
                            <p class="text-[11px] font-black italic border-b border-black pb-1 mb-1 uppercase">${vendedor}</p>
                            <div class="text-[9px] font-black uppercase pt-1">Firma Vendedor</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 text-center border-t border-black pt-2 text-[10px] font-black flex justify-between px-2">
                <span class="text-red-600 italic">IG: @${empresa.instagram || ''}</span>
                <span>CONTACTO: ${empresa.phone || ''}</span>
            </div>
        </div>
    `;
}

function generarTicketHTML(data) {
    const empresa = data.tenant || {};
    const subtotal = data.items.reduce((acc, it) => acc + parseFloat(it.total), 0);
    const descuento = parseFloat(data.discount || 0);
    const total = subtotal - descuento;

    return `
        <div class="text-center uppercase">
            <h3 class="font-bold">${empresa.name || 'RECIBO'}</h3>
            <p class="text-[10px]">${empresa.rif || ''}</p>
            <p>NOTA DE ENTREGA #00${data.id}</p>
            <p>----------------------------</p>
        </div>
        <div class="my-2 uppercase">
            <p>Cliente: ${data.customer_name}</p>
            <p>Fecha: ${new Date(data.created_at).toLocaleDateString()}</p>
        </div>
        <p>----------------------------</p>
        ${data.items.map(it => `<div class="flex justify-between text-[10px]"><span>${it.qty} x ${it.product_name.substring(0,15)}</span><span>$${parseFloat(it.total).toFixed(2)}</span></div>`).join('')}
        <p>----------------------------</p>
        <div class="flex justify-between"><span>SUBTOTAL:</span><span>$${subtotal.toFixed(2)}</span></div>
        ${descuento > 0 ? `<div class="flex justify-between text-red-600 font-bold"><span>DESC:</span><span>-$${descuento.toFixed(2)}</span></div>` : ''}
        <div class="flex justify-between font-bold text-sm"><span>TOTAL:</span><span>$${total.toFixed(2)}</span></div>
        <p class="mt-4 text-center uppercase">Gracias por su compra</p>
    `;
}

function generarNotaEntregaHTML(data) {
    const empresa = data.tenant || {};
    const subtotal = data.items.reduce((acc, it) => acc + parseFloat(it.total), 0);
    const descuento = parseFloat(data.discount || 0);
    const totalFinal = subtotal - descuento;

    return `
        <div class="flex justify-between border-b-2 border-black pb-4 mb-8">
            <div>
                <h1 class="text-3xl font-black italic uppercase">${empresa.name || 'EMPRESA'}</h1>
                <p class="text-sm font-bold">${empresa.rif || ''}</p>
                <p class="text-xs">${empresa.address || 'Valencia, Venezuela'}</p>
            </div>
            <div class="text-right">
                <p class="font-bold">NOTA DE ENTREGA</p>
                <p>Nro: #000${data.id}</p>
                <p>Fecha: ${new Date(data.created_at).toLocaleDateString()}</p>
            </div>
        </div>
        <div class="mb-8 p-4 bg-gray-50 border border-gray-200">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</p>
            <p class="text-xl font-black italic">${data.customer_name}</p>
        </div>
        <table class="w-full text-left mb-8">
            <thead class="border-y border-black uppercase text-xs">
                <tr><th class="py-2">Descripción del Producto</th><th class="text-right py-2">Cant.</th><th class="text-right py-2">Total</th></tr>
            </thead>
            <tbody>
                ${data.items.map(it => `
                    <tr class="border-b border-gray-100">
                        <td class="py-4 italic">
                            <div class="font-bold uppercase">${it.product_name}</div>
                            ${it.imei_snapshot ? `<div class="text-[10px] text-gray-500 not-italic font-mono">IMEI: ${it.imei_snapshot}</div>` : ''}
                        </td>
                        <td class="text-right">${it.qty}</td>
                        <td class="text-right font-black">$${parseFloat(it.total).toFixed(2)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>
        <div class="text-right space-y-1">
            <p class="text-sm">Subtotal: $${subtotal.toFixed(2)}</p>
            ${descuento > 0 ? `<p class="text-sm text-red-600 font-bold italic">Descuento aplicado: -$${descuento.toFixed(2)}</p>` : ''}
            <div class="text-3xl font-black italic pt-2 border-t border-black">TOTAL NETO: $${totalFinal.toFixed(2)}</div>
        </div>
    `;
}


function generarContratoHTML(data) {
    const empresa = data.tenant || {};
    return `
        <h2 class="text-center font-bold text-xl underline mb-10 uppercase italic">Contrato de Compra y Venta</h2>
        <p class="leading-relaxed mb-8 text-justify italic">
            Por medio de la presente, se hace constar que <b>${empresa.name || 'EL VENDEDOR'}</b>, identificado con RIF <b>${empresa.rif || 'S/D'}</b>, transfiere la propiedad de la mercancía descrita en el pedido #${data.id} al cliente <b>${data.customer_name}</b>, quien declara recibirla a entera satisfacción en la ciudad de Valencia a los ${new Date().toLocaleDateString()}.
        </p>
        <div class="flex justify-between mt-40">
            <div class="border-t border-black w-48 text-center pt-2 font-bold uppercase italic text-xs">Firma Vendedor</div>
            <div class="border-t border-black w-48 text-center pt-2 font-bold uppercase italic text-xs">Firma Cliente</div>
        </div>
    `;
}

/**
 * 6. INICIALIZACIÓN AUTOMÁTICA (Blindada)
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Revisamos la URL (Ej: facturacion.html?orderId=105)
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    
    // 2. Si viene un ID en la URL, disparamos la magia
    if (orderId) {
        console.log("ID detectado desde Pedidos:", orderId); // Para que lo veas en consola
        
        const inputBusqueda = document.getElementById('search-id');
        
        if (inputBusqueda) {
            inputBusqueda.value = orderId;
            
            // Le damos un respiro de 100 milisegundos al navegador 
            // para que termine de pintar la pantalla antes de buscar en la Base de Datos
            setTimeout(() => {
                buscarPedidoParaFacturar();
            }, 100);
        }
    }
});