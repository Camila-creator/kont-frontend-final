// frontend/assets/js/proveedores.js

// =========================
// API CONFIG
// =========================
const SUPPLIERS_API = `${API_BASE}/suppliers`;

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
// API FETCH CON SEGURIDAD
// =========================
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");

    const res = await fetch(url, {
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}`, 
            ...(options.headers || {}) 
        },
        ...options,
    });
    
    let data = null;
    try { data = await res.json(); } catch {}
    
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("agromedic_token");
        window.location.replace("../pages/login.html");
        return;
    }

    if (!res.ok) throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`);
    return data;
}

// =========================
// CARGA DE DATOS
// =========================
async function loadSuppliers() {
    try {
        const json = await apiFetch(SUPPLIERS_API);
        // El backend ahora envía display_id gracias al ROW_NUMBER()
        suppliers = json.data || [];
    } catch (err) {
        openAlert({ title: "Error", message: "No pude cargar los proveedores." });
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
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center; color:#64748b;">No se encontraron proveedores con ese criterio.</td></tr>`;
        return;
    }

    filtered.forEach((s) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        tr.innerHTML = `
            <td style="padding:15px; font-weight:700; color:#94a3b8;">
                #${s.display_id || s.id}
            </td>
            <td style="padding:15px; font-weight:600; color:#475569;">${safeText(s.rif) || "---"}</td>
            <td style="padding:15px; font-weight:700; color:#1e293b;">${safeText(s.nombre)}</td>
            <td style="padding:15px; color:#475569;">${safeText(s.contacto) || "No asignado"}</td>
            <td style="padding:15px; color:#475569;"><i class="bi bi-telephone text-soft"></i> ${safeText(s.telefono) || "-"}</td>
            <td style="padding:15px;"><span class="badge-terms">${safeText(s.condiciones_pago) || "Contado"}</span></td>
            <td style="padding:15px;">
                <div class="table-actions">
                    <button class="btn-icon btn-edit" data-action="edit" data-id="${s.id}" title="Editar"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn-icon btn-del" data-action="delete" data-id="${s.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
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