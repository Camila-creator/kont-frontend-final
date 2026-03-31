// frontend/assets/js/clientes.js
/**
 * clientes.js - Módulo de Gestión de Clientes para Kont
 * Depende de: main.js (para apiFetch y API_BASE)
 */

// Usamos la API_BASE que ya viene de main.js
const API_CUSTOMERS = `${API_BASE}/customers`;

// Elementos de la UI
const tableBody = document.querySelector("#clients-table tbody");
const btnNew = document.getElementById("btn-new-client");
const searchInput = document.getElementById("client-search");
const modal = document.getElementById("client-modal");
const modalTitle = document.getElementById("client-modal-title");
const form = document.getElementById("client-form");

// Inputs del Modal
const inputId = document.getElementById("client-id");
const inputName = document.getElementById("client-name");
const inputType = document.getElementById("client-type");
const inputDoc = document.getElementById("client-doc");
const inputPhone = document.getElementById("client-phone");
const inputEmail = document.getElementById("client-email");
const inputLocation = document.getElementById("client-location");
const inputAddress = document.getElementById("client-address");
const inputTerms = document.getElementById("client-terms");
const inputWholesaleMin = document.getElementById("client-wholesale-min");
const inputNotes = document.getElementById("client-notes");
const btnCancel = document.getElementById("client-cancel");

let customers = [];

// Helpers locales
const safeText = (v) => (v ?? "").toString().trim();
const toInt = (v, def = 0) => { 
    const n = parseInt(v, 10); 
    return isNaN(n) ? def : n; 
};

// --- LÓGICA DE NEGOCIO ---

function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const term = safeText(searchInput.value).toLowerCase();

    const filtered = customers.filter(c => 
        safeText(c.name).toLowerCase().includes(term) ||
        safeText(c.doc).toLowerCase().includes(term) ||
        safeText(c.location).toLowerCase().includes(term)
    );

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center; color:#64748b;">No hay clientes que coincidan.</td></tr>`;
        return;
    }

    filtered.forEach((c) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";

        const typeBadge = c.type === "MAYORISTA" 
            ? '<span class="badge badge-mayor">Mayorista</span>' 
            : '<span class="badge badge-retail">Detal</span>';

        const termsBadge = c.terms === "CREDITO" 
            ? '<span class="badge badge-credito">Crédito</span>' 
            : '<span class="badge badge-contado">Contado</span>';

        tr.innerHTML = `
            <td data-label="ID" style="padding:15px; font-weight:700; color:#94a3b8;">#${c.id}</td>
            <td data-label="Nombre" style="padding:15px; font-weight:700; color:#1e293b;">${safeText(c.name)}</td>
            <td data-label="Tipo" style="padding:15px; text-align:center;">${typeBadge}</td>
            <td data-label="Documento" style="padding:15px; color:#475569; font-weight:600;">${safeText(c.doc) || "-"}</td>
            <td data-label="Contacto" style="padding:15px;">
                <div class="contact-cell" style="display:flex; flex-direction:column; gap:2px; font-size:0.85rem;">
                    <span><i class="bi bi-telephone"></i> ${safeText(c.phone)}</span>
                    <span style="color:#64748b;"><i class="bi bi-geo-alt"></i> ${safeText(c.location)}</span>
                </div>
            </td>
            <td data-label="Condición" style="padding:15px; text-align:center;">${termsBadge}</td>
            <td style="padding:15px; text-align:right;">
                <div class="table-actions">
                    <button class="btn-icon btn-edit" onclick="handleEdit(${c.id})"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn-icon btn-del" onclick="onDelete(${c.id})"><i class="bi bi-trash"></i></button>
                </div>
            </td>`;
        tableBody.appendChild(tr);
    });
}

async function refresh() {
    try {
        const res = await apiFetch("/customers"); // Usamos el apiFetch global de main.js
        customers = Array.isArray(res?.data) ? res.data : [];
        renderTable();
    } catch (err) {
        console.error("Error refrescando clientes:", err);
    }
}

// Ventanas y Modales
window.handleEdit = (id) => {
    const c = customers.find(x => x.id === id);
    if (c) openEdit(c);
};

function openEdit(c) {
    modalTitle.textContent = "Editar Cliente";
    inputId.value = c.id;
    inputName.value = c.name || "";
    inputType.value = c.type || "DETAL";
    inputDoc.value = c.doc || "";
    inputPhone.value = c.phone || "";
    inputEmail.value = c.email || "";
    inputLocation.value = c.location || "";
    inputAddress.value = c.address || "";
    inputTerms.value = c.terms || "CONTADO";
    inputWholesaleMin.value = c.wholesale_min ?? 6;
    inputNotes.value = c.notes || "";
    modal.classList.remove("hidden");
}

function onDelete(id) {
    const c = customers.find(x => x.id === id);
    if (confirm(`¿Seguro que quieres eliminar a "${c.name}"?`)) {
        apiFetch(`/customers/${id}`, { method: "DELETE" })
            .then(() => {
                registrarActividad('CLIENTES', 'DELETE', `Eliminado: ${c.name}`);
                refresh();
            });
    }
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    // Solo ejecutamos si estamos en la página de clientes
    if (!tableBody) return;

    refresh();

    if (btnNew) {
        btnNew.onclick = () => {
            form.reset();
            inputId.value = "";
            modalTitle.textContent = "Nuevo Cliente";
            modal.classList.remove("hidden");
        };
    }

    if (btnCancel) btnCancel.onclick = () => modal.classList.add("hidden");
    if (searchInput) searchInput.oninput = renderTable;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = inputId.value;
        const payload = {
    name: safeText(inputName.value),
    type: inputType.value,
    doc: safeText(inputDoc.value), 
    phone: safeText(inputPhone.value),
    // Si el email está vacío, mandamos null para que Zod no intente validarlo como correo
    email: safeText(inputEmail.value) || null, 
    location: safeText(inputLocation.value),
    address: safeText(inputAddress.value),
    terms: inputTerms.value,
    wholesale_min: toInt(inputWholesaleMin.value),
    notes: safeText(inputNotes.value)
};

        try {
            if (id) {
                await apiFetch(`/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
                registrarActividad('CLIENTES', 'UPDATE', `Editado: ${payload.name}`);
            } else {
                await apiFetch("/customers", { method: "POST", body: JSON.stringify(payload) });
                registrarActividad('CLIENTES', 'CREATE', `Nuevo cliente: ${payload.name}`);
            }
            modal.classList.add("hidden");
            refresh();
        } catch (err) {
            alert("Error al guardar: " + err.message);
        }
    };
});