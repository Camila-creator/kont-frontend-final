// ---------------- CONFIGURACIÓN API ----------------
const API_CAJA = `${API_BASE}/caja`; 

// Estado Global (Mantenemos tus variables de cálculo)
let saldoEsperadoUSD = 0;
let tasaDelDia = 0;

// ---------------- HELPERS ----------------
function fmtTime(iso) { 
    if(!iso) return "-";
    return new Date(iso).toLocaleTimeString("es-ES", {hour: '2-digit', minute:'2-digit'});
}

// ---------------- LÓGICA PRINCIPAL ----------------

async function loadDia(fecha) {
    // Referencias locales para asegurar que existen al momento de la carga
    const tbody = document.getElementById("transactions-body");
    const btnCloseRegister = document.getElementById("btn-close-register");
    const sumIngresos = document.getElementById("sum-ingresos");
    const sumEgresos = document.getElementById("sum-egresos");
    const sumTotal = document.getElementById("sum-total");

    try {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">Cargando movimientos...</td></tr>`;
        
        const res = await apiFetch(`${API_CAJA}/resumen?date=${fecha}`);

        // --- INSERCIÓN DE DATOS GLOBALES ---
        window._cajaDatosActuales = res.data;
        window._cajaFechaActual = fecha;
        // ------------------------------------

        const { ingresos, egresos, movimientos, estado, tasa } = res.data; 

        tasaDelDia = tasa || 0;
        saldoEsperadoUSD = Number(ingresos || 0) - Number(egresos || 0);

        // Actualizar Tarjetas con tu lógica multimoneda intacta
        if (sumIngresos) sumIngresos.textContent = money(ingresos);
        if (sumEgresos) sumEgresos.textContent = money(egresos);
        if (sumTotal) {
            sumTotal.innerHTML = `
                ${money(saldoEsperadoUSD)}
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 400;">
                    ≈ ${money(saldoEsperadoUSD * tasaDelDia)} Bs.
                </div>
            `;
        }
        
        // El resto de tu lógica de renderizado de movimientos...
    } catch (error) {
        console.error("Error al cargar el día:", error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar datos</td></tr>`;
    }
}


function renderTable(movimientos) {
    const tbody = document.getElementById("transactions-body");
    if (!tbody) return;

    tbody.innerHTML = movimientos.length === 0 
        ? `<tr><td colspan="5" style="text-align:center; padding: 20px;">No hay movimientos hoy.</td></tr>`
        : "";

    movimientos.forEach(m => {
        const isIngreso = m.tipo === 'INGRESO';
        
        // USAMOS EL AYUDANTE DEL MAIN.JS
        const iconHtml = getIconForMethod(m.metodo_pago, m.tipo);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${fmtTime(m.created_at)}</td>
            <td>
                <span class="badge-type ${isIngreso ? 'bg-in' : 'bg-out'}">
                    ${iconHtml} ${isIngreso ? 'Venta' : 'Gasto'}
                </span>
            </td>
            <td>${m.descripcion}</td>
            <td><small>${m.metodo_pago || 'N/A'}</small></td>
            <td style="text-align: right; font-weight: 700; color: ${isIngreso ? '#10b981' : '#ef4444'};">
                ${isIngreso ? '+' : '-'} ${money(m.monto)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------- LÓGICA DEL MODAL ----------------

function openModal() {
    const modalCierre = document.getElementById("cierre-modal");
    const labelExpected = document.getElementById("modal-expected");
    const inputActual = document.getElementById("cierre-actual");
    const alertDescuadre = document.getElementById("descuadre-alert");

    if (!modalCierre) return;

    // Seteamos el valor esperado (Tu cálculo original)
    labelExpected.innerHTML = `
        ${money(saldoEsperadoUSD)} 
        <span style="display:block; font-size:0.8rem; font-weight:400; color:#64748b;">
            (Equivalente a ${money(saldoEsperadoUSD * tasaDelDia)} Bs.)
        </span>
    `;
    inputActual.value = "";
    alertDescuadre.style.display = "none";
    modalCierre.classList.remove("hidden");
}

function closeModal() {
    const modal = document.getElementById("cierre-modal");
    if (modal) modal.classList.add("hidden");
}

// ---------------- INICIALIZACIÓN ----------------

async function init() {
    const inputDate = document.getElementById("caja-date");
    const btnCloseRegister = document.getElementById("btn-close-register");
    const btnCancelModal = document.getElementById("btn-cancel-cierre");
    const modalCierre = document.getElementById("cierre-modal");
    const inputActual = document.getElementById("cierre-actual");
    const formCierre = document.getElementById("cierre-form");

    // 1. Establecer fecha inicial
    const hoy = new Date().toISOString().split('T')[0];
    if (inputDate) {
        inputDate.value = hoy;
        inputDate.addEventListener("change", (e) => loadDia(e.target.value));
    }

    // 2. Cargar datos del día
    await loadDia(hoy);

    // 3. Asignar eventos de los botones (Aquí estaba el fallo de "no funciona")
    if (btnCloseRegister) {
        btnCloseRegister.addEventListener("click", openModal);
    }

    if (btnCancelModal) {
        btnCancelModal.addEventListener("click", closeModal);
    }

    // Cerrar al hacer clic fuera del modal
    if (modalCierre) {
        modalCierre.addEventListener("click", (e) => {
            if (e.target === modalCierre) closeModal();
        });
    }

    // Validación de descuadre en tiempo real (Tu lógica original completa)
    if (inputActual) {
        inputActual.addEventListener("input", () => {
            const alertDescuadre = document.getElementById("descuadre-alert");
            const contado = Number(inputActual.value) || 0;
            const diff = contado - saldoEsperadoUSD;

            alertDescuadre.style.display = "block";
            if (Math.abs(diff) < 0.01) {
                alertDescuadre.style.background = "#dcfce7";
                alertDescuadre.style.color = "#166534";
                alertDescuadre.innerHTML = `<i class="bi bi-check-circle-fill"></i> ¡Caja cuadra perfectamente!`;
            } else {
                const esFaltante = diff < 0;
                alertDescuadre.style.background = esFaltante ? "#fee2e2" : "#eff6ff";
                alertDescuadre.style.color = esFaltante ? "#991b1b" : "#2563eb";
                alertDescuadre.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${esFaltante ? 'Faltan' : 'Sobran'} ${money(Math.abs(diff))}`;
            }
        });
    }

    // Envío del formulario de cierre
    if (formCierre) {
        formCierre.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById("btn-submit-cierre");
            const diff = Number(inputActual.value) - saldoEsperadoUSD;

            const dataCierre = {
                fecha: inputDate.value,
                saldo_esperado: saldoEsperadoUSD,
                saldo_real: Number(inputActual.value),
                exchange_rate: tasaDelDia,
                notas: document.getElementById("cierre-notes").value
            };

            try {
                btnSubmit.disabled = true;
                btnSubmit.innerText = "Procesando...";

                await apiFetch(`${API_CAJA}/cierre`, {
                    method: "POST",
                    body: JSON.stringify(dataCierre)
                });

                // Registrar en auditoría
                await registrarActividad('FINANZAS', 'CIERRE_CAJA', `Cierre de caja. Descuadre: ${money(diff)}`);

                showToast("¡Caja cerrada exitosamente!");
                closeModal();
                loadDia(inputDate.value); 

            } catch (err) {
                showToast(err.message, "error");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<i class="bi bi-lock-fill"></i> Cerrar Caja Definitivamente`;
            }
        });
    }
}

function exportarCierrePDF() {
  if (!window._cajaDatosActuales) { alert("Carga un día primero."); return; }
  KontPDF.cierreCaja(window._cajaDatosActuales, window._cajaFechaActual);
}

// Ejecutar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", init);