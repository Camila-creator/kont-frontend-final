// frontend/assets/js/proveedores.js

// =========================
// API CONFIG
// =========================
// ✅ CAMBIO: Ruta relativa, delegando la URL base al cerebro de main.js
const SUPPLIERS_API = "/suppliers";

// =========================
// ELEMENTOS DEL DOM
// =========================
const tableBody = document.querySelector("#suppliers-table tbody");
const btnNew = document.getElementById("btn-new-supplier");
const inputSearch = document.getElementById("supplier-search");

const modal = document.getElementById("supplier-modal");
const modalTitle = document.getElementById("supplier-modal-title");
const form = document.getElementById("supplier-form");

// Campos del formulario
const inputId = document.getElementById("supplier-id");
const inputRif = document.getElementById("supplier-rif");
const inputName = document.getElementById("supplier-name");
const inputContact = document.getElementById("supplier-contact");
const inputPhone = document.getElementById("supplier-phone");
const inputEmail = document.getElementById("supplier-email");
const inputLocation = document.getElementById("supplier-location");
const inputPaymentTerms = document.getElementById("supplier-payment-terms");
const inputNotes = document.getElementById("supplier-notes");
const btnCancel = document.getElementById("supplier-cancel");

// =========================
// ESTADO GLOBAL
// =========================
let suppliers = [];

// =========================
// HELPERS
// =========================
function safeText(v) { return (v ?? "").toString().trim(); }

// 🗑️ BORRADO: La función apiFetch local con el token viejo fue eliminada.

// =========================
// MODALES (Confirm & Alert)
// =========================
let confirmResolver = null;
function openConfirm({ title = "Confirmar", message = "¿Estás segura?", okText = "Sí", okVariant = "danger" } = {}) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    const btn = document.getElementById("confirm-ok");
    btn.textContent = okText;
    btn.className = `btn-${okVariant}`;
    document.getElementById("confirm-modal").classList.remove("hidden");
    return new Promise((res) => { confirmResolver = res; });
}
function closeConfirm() { document.getElementById("confirm-modal").classList.add("hidden"); }
document.getElementById("confirm-ok")?.addEventListener("click", () => { confirmResolver?.(true); closeConfirm(); });
document.getElementById("confirm-cancel")?.addEventListener("click", () => { confirmResolver?.(false); closeConfirm(); });

function openAlert({ title = "Aviso", message = "" } = {}) {
    document.getElementById("alert-title").textContent = title;
    document.getElementById("alert-message").textContent = message;
    document.getElementById("alert-modal").classList.remove("hidden");
}
document.getElementById("alert-ok")?.addEventListener("click", () => document.getElementById("alert-modal").classList.add("hidden"));

function openModal() { modal?.classList.remove("hidden"); }
function closeModal() { modal?.classList.add("hidden"); }

// =========================
// CARGA DE DATOS
// =========================
// =========================
// CARGA DE DATOS
// =========================
async function loadSuppliers() {
    try {
        const res = await apiFetch(SUPPLIERS_API);

        suppliers = res.data || res || [];
        window._proveedores = suppliers;
    } catch (err) {
        console.error("Error cargando proveedores:", err);
        openAlert({ title: "Error", message: "No pude cargar la lista de proveedores." });
    }
}

// =========================
// RENDERIZADO DE TABLA
// =========================
function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const term = safeText(inputSearch.value).toLowerCase();
    
    const filtered = suppliers.filter(s => {
        return safeText(s.nombre).toLowerCase().includes(term) || 
               safeText(s.rif).toLowerCase().includes(term) || 
               safeText(s.contacto).toLowerCase().includes(term) ||
               safeText(s.ubicacion).toLowerCase().includes(term);
    });

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align:center; color:#64748b;">No se encontraron proveedores.</td></tr>`;
        return;
    }

    filtered.forEach((s) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        // Estilos en línea para asegurar que se vea impecable
        tr.innerHTML = `
            <td style="padding:15px; font-weight:800; color:#94a3b8; vertical-align: middle;">
                #${s.display_id || s.id}
            </td>
            <td style="padding:15px; font-weight:600; color:#475569; vertical-align: middle;">${safeText(s.rif) || "---"}</td>
            <td style="padding:15px; font-weight:700; color:#1e293b; vertical-align: middle;">${safeText(s.nombre)}</td>
            <td style="padding:15px; color:#475569; vertical-align: middle;">${safeText(s.contacto) || "No asignado"}</td>
            <td style="padding:15px; color:#475569; vertical-align: middle;"><i class="bi bi-telephone text-soft"></i> ${safeText(s.telefono) || "-"}</td>
            <td style="padding:15px; vertical-align: middle;">
                <span style="background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 600;">
                    ${safeText(s.condiciones_pago) || "Contado"}
                </span>
            </td>
            <td style="padding:15px; vertical-align: middle; text-align: right;">
                <div class="table-actions">
                    <button class="btn-icon btn-edit" data-action="edit" data-id="${s.id}" title="Editar" style="border: none; background: transparent; cursor: pointer; color: #3b82f6; font-size: 1.2rem; margin-right: 10px;"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn-icon btn-del" data-action="delete" data-id="${s.id}" title="Eliminar" style="border: none; background: transparent; cursor: pointer; color: #ef4444; font-size: 1.2rem;"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Eventos de botones de acción
    tableBody.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.onclick = () => {
            const action = btn.getAttribute("data-action");
            const id = Number(btn.getAttribute("data-id"));
            if (action === "edit") onEdit(id);
            if (action === "delete") onDelete(id);
        };
    });
}

// =========================
// LÓGICA DEL FORMULARIO
// =========================
function resetForm() {
    modalTitle.textContent = "Nuevo Proveedor";
    form.reset();
    inputId.value = "";
}

function fillForm(s) {
    modalTitle.textContent = "Editar Proveedor";
    inputId.value = s.id;
    inputRif.value = s.rif ?? "";
    inputName.value = s.nombre ?? "";
    inputContact.value = s.contacto ?? "";
    inputPhone.value = s.telefono ?? "";
    inputEmail.value = s.email ?? "";
    inputLocation.value = s.ubicacion ?? "";
    inputPaymentTerms.value = s.condiciones_pago ?? "";
    inputNotes.value = s.notes ?? s.notas ?? "";
}

function getPayload() {
    return {
        rif: safeText(inputRif.value),
        nombre: safeText(inputName.value),
        contacto: safeText(inputContact.value),
        telefono: safeText(inputPhone.value),
        email: safeText(inputEmail.value),
        ubicacion: safeText(inputLocation.value),
        condiciones_pago: safeText(inputPaymentTerms.value),
        notas: safeText(inputNotes.value),
    };
}

async function onSubmit(e) {
    e.preventDefault();

    const payload = getPayload();
    const id = inputId.value ? Number(inputId.value) : null;

    if (!payload.rif || !payload.nombre) {
        openAlert({ title: "Atención", message: "RIF y Nombre son campos obligatorios." });
        return;
    }

    try {
        if (!id) {
            // Crear
            await apiFetch(SUPPLIERS_API, { method: "POST", body: JSON.stringify(payload) });
        } else {
            // Editar
            const ok = await openConfirm({ 
                title: "Guardar Cambios", 
                message: "¿Deseas actualizar la información de este proveedor?", 
                okText: "Actualizar", 
                okVariant: "primary" 
            });
            if (!ok) return;
            await apiFetch(`${SUPPLIERS_API}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        }
        
        await loadSuppliers();
        renderTable();
        closeModal();
    } catch (err) {
        openAlert({ title: "Error", message: err.message });
    }
}

// =========================
// ACCIONES
// =========================
function onEdit(id) {
    const s = suppliers.find(x => Number(x.id) === id);
    if (s) {
        fillForm(s);
        openModal();
    }
}

async function onDelete(id) {
    const s = suppliers.find(x => Number(x.id) === id);
    if (!s) return;

    const ok = await openConfirm({
        title: "Eliminar Proveedor",
        message: `¿Estás segura de eliminar a "${s.nombre}"? Esta acción no se puede deshacer.`,
        okText: "Sí, Eliminar",
        okVariant: "danger"
    });

    if (!ok) return;

    try {
        await apiFetch(`${SUPPLIERS_API}/${id}`, { method: "DELETE" });
        await loadSuppliers();
        renderTable();
    } catch (err) {
        openAlert({ title: "Error", message: err.message });
    }
}

// =========================
// INICIALIZACIÓN
// =========================
async function init() {
    // ✅ Control de seguridad estricto
    if (typeof apiFetch !== "function") {
        console.error("❌ Error Crítico: main.js no detectado. El módulo de proveedores está bloqueado.");
        return;
    }

    // Configurar Sidebar/Header si existe la función
    if (typeof setupLayout === 'function') setupLayout();

    await loadSuppliers();
    renderTable();

    // Listeners
    btnNew?.addEventListener("click", () => { resetForm(); openModal(); });
    btnCancel?.addEventListener("click", closeModal);
    form?.addEventListener("submit", onSubmit);
    inputSearch?.addEventListener("input", renderTable);
}

document.addEventListener("DOMContentLoaded", init);