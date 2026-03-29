// ---------------- CONFIGURACIÓN API ----------------
const API_CAJA = `${API_BASE}/caja`; 

// ---------------- ELEMENTOS UI ----------------
const inputDate = document.getElementById("caja-date");
const btnCloseRegister = document.getElementById("btn-close-register");

const sumIngresos = document.getElementById("sum-ingresos");
const sumEgresos = document.getElementById("sum-egresos");
const sumTotal = document.getElementById("sum-total");
const tbody = document.getElementById("transactions-body");

// Elementos del Modal
const modalCierre = document.getElementById("cierre-modal");
const btnCancelModal = document.getElementById("btn-cancel-cierre");
const formCierre = document.getElementById("cierre-form");
const labelExpected = document.getElementById("modal-expected");
const inputActual = document.getElementById("cierre-actual");
const alertDescuadre = document.getElementById("descuadre-alert");

// Estado Global para cálculos
let saldoEsperadoUSD = 0;
let tasaDelDia = 0;

// ---------------- HELPERS (Usando los de tu main.js) ----------------
function fmtTime(iso) { 
  if(!iso) return "-";
  return new Date(iso).toLocaleTimeString("es-ES", {hour: '2-digit', minute:'2-digit'});
}

// ---------------- LÓGICA PRINCIPAL ----------------

async function loadDia(fecha) {
    try {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">Cargando movimientos...</td></tr>`;
        
        const res = await apiFetch(`${API_CAJA}/resumen?date=${fecha}`);
        const { ingresos, egresos, movimientos, estado, tasa } = res.data; 

        tasaDelDia = tasa || 0;
        saldoEsperadoUSD = Number(ingresos || 0) - Number(egresos || 0);

        // Actualizar Tarjetas con multimoneda
        sumIngresos.textContent = money(ingresos);
        sumEgresos.textContent = money(egresos);
        sumTotal.innerHTML = `
            ${money(saldoEsperadoUSD)}
            <div style="font-size: 0.75rem; color: #64748b; font-weight: 400;">
                ≈ ${money(saldoEsperadoUSD * tasaDelDia)} Bs.
            </div>
        `;

        renderTable(movimientos || []);

        // Bloqueo de UI si ya está cerrada
        const isCerrada = estado === 'CERRADA';
        btnCloseRegister.disabled = isCerrada;
        btnCloseRegister.innerHTML = isCerrada ? `<i class="bi bi-lock-fill"></i> Caja Cerrada` : `<i class="bi bi-safe-fill"></i> Ejecutar Cierre`;
        btnCloseRegister.className = isCerrada ? "btn-disabled" : "btn-primary";

    } catch (err) {
        console.error("Error cargando caja:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Error al cargar datos.</td></tr>`;
    }
}

function renderTable(movimientos) {
    tbody.innerHTML = movimientos.length === 0 
        ? `<tr><td colspan="5" style="text-align:center; padding: 20px;">No hay movimientos hoy.</td></tr>`
        : "";

    movimientos.forEach(m => {
        const isIngreso = m.tipo === 'INGRESO';
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${fmtTime(m.created_at)}</td>
            <td><span class="badge-${isIngreso ? 'success' : 'danger'}">${isIngreso ? 'Venta' : 'Gasto'}</span></td>
            <td>${m.descripcion}</td>
            <td><small>${m.metodo_pago}</small></td>
            <td style="text-align: right; font-weight: 700; color: ${isIngreso ? '#10b981' : '#ef4444'};">
                ${isIngreso ? '+' : '-'} ${money(m.monto)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------- LÓGICA DEL MODAL (FIXED) ----------------

function openModal() {
    // Seteamos el valor esperado en el label del modal
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
    modalCierre.classList.add("hidden");
}

// Cerrar si hacen clic en el fondo oscuro (fuera del contenido)
modalCierre.addEventListener("click", (e) => {
    if (e.target === modalCierre) closeModal();
});

// Validación de descuadre en tiempo real
inputActual.addEventListener("input", () => {
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

formCierre.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btn-submit-cierre");
    
    const diff = Number(inputActual.value) - saldoEsperadoUSD;

    const dataCierre = {
        fecha: inputDate.value,
        saldo_esperado: saldoEsperadoUSD,
        saldo_real: Number(inputActual.value),
        notas: document.getElementById("cierre-notes").value
    };

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Procesando...";

        await apiFetch(`${API_CAJA}/cierre`, {
            method: "POST",
            body: JSON.stringify(dataCierre)
        });

        // Registrar en auditoría (usando tu función de main.js)
        await registrarActividad('FINANZAS', 'CIERRE_CAJA', `Cierre de caja el ${dataCierre.fecha}. Descuadre: ${money(diff)}`);

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

// ---------------- INICIALIZACIÓN ----------------
async function init() {
    const hoy = new Date().toISOString().split('T')[0];
    inputDate.value = hoy;

    await loadDia(hoy);

    // Eventos
    inputDate.addEventListener("change", (e) => loadDia(e.target.value));
    btnCloseRegister.addEventListener("click", openModal);
    btnCancelModal.addEventListener("click", closeModal);
}

document.addEventListener("DOMContentLoaded", init);