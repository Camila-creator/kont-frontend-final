const API_TENANTS = "http://localhost:4000/api/tenants";

// ---------------- ELEMENTOS DEL DOM ----------------
const tableBody = document.querySelector("#tenants-table tbody");
const btnNew = document.getElementById("btn-new-tenant");
const searchInput = document.getElementById("search-tenant");

const modal = document.getElementById("tenant-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("tenant-form");

const inputId = document.getElementById("tenant-id");
const inputTenantName = document.getElementById("tenant-name");

// --- CATEGORÍA Y PLAN (NUEVO) ---
const inputCategory = document.getElementById("tenant-category");
const inputPlanId = document.getElementById("tenant-plan-id"); // El nuevo select de planes

// --- CAMPOS FISCALES ---
const inputRif = document.getElementById("tenant-rif");
const inputPhone = document.getElementById("tenant-phone");
const inputInstagram = document.getElementById("tenant-instagram");
const inputAddress = document.getElementById("tenant-address");

// --- CONTENEDORES DE SECCIÓN ---
const billingContainer = document.getElementById("billing-section-container");
const ownerContainer = document.getElementById("owner-section-container");

// --- CAMPOS FINANCIEROS Y DUEÑO ---
const inputPlanType = document.getElementById("tenant-plan"); // Ej: MENSUAL, ANUAL
const inputStartDate = document.getElementById("tenant-start-date");
const inputOwnerName = document.getElementById("owner-name");
const inputOwnerEmail = document.getElementById("owner-email");
const inputOwnerPassword = document.getElementById("owner-password");

const btnCancel = document.getElementById("btn-cancel");
let tenantsList = [];

// ---------------- COMUNICACIÓN CON API ----------------
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const headers = { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
    };
    
    const res = await fetch(url, { headers, ...options });
    let data = null;
    try { data = await res.json(); } catch {}
    
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("agromedic_token");
        window.location.replace("../pages/login.html");
        return;
    }
    
    if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
    return data;
}

// ---------------- CARGA Y TABLA ----------------
async function loadTenants() {
    try {
        const json = await apiFetch(API_TENANTS);
        tenantsList = json.data || [];
        renderTable();
    } catch (err) {
        if(!err.message.includes("404")) openAlert({ title: "Error", message: err.message });
    }
}

function renderTable(filterText = "") {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    const term = filterText.toLowerCase();
    const filtered = tenantsList.filter(t => 
        (t.name || "").toLowerCase().includes(term) || 
        (t.owner_name || "").toLowerCase().includes(term) ||
        (t.category_name || "").toLowerCase().includes(term) ||
        (t.plan_name || "").toLowerCase().includes(term)
    );

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">No se encontraron empresas registradas.</td></tr>`;
        return;
    }

    filtered.forEach((t) => {
        const tr = document.createElement("tr");
        
        const statusBadge = t.is_active 
            ? `<span class="badge badge-active"><i class="bi bi-check-circle-fill"></i> Activa</span>`
            : `<span class="badge badge-suspended"><i class="bi bi-power"></i> Suspendida</span>`;

        // Lógica de visualización de Plan (Nombre del plan + tipo de cobro)
        let planHtml = `
            <div style="font-weight: 800; color: #9333ea; font-size: 0.85rem;">${t.plan_name || 'SIN PLAN'}</div>
            <div style="font-size: 11px; color: #1e293b; font-weight: 600;">${t.plan_type || '---'}</div>
        `;
        
        if (t.next_payment_date && t.plan_type !== 'LIFETIME') {
            const nextP = new Date(t.next_payment_date);
            planHtml += `<div style="font-size: 10px; color: #64748b;">Prox. Pago: ${nextP.toLocaleDateString()}</div>`;
        }

        const isMe = Number(t.id) === 1;

        const catBadge = t.category_name 
            ? `<div style="font-size: 0.65rem; color: #0ea5e9; font-weight: 700; margin-top: 5px; display: inline-block; background: #f0f9ff; padding: 2px 8px; border-radius: 6px; border: 1px solid #bae6fd; text-transform: uppercase;">
                <i class="bi bi-tags-fill"></i> ${t.category_name}
               </div>`
            : `<div style="font-size: 0.65rem; color: #94a3b8; margin-top: 5px;">Sin Categoría</div>`;

        tr.innerHTML = `
            <td style="padding: 15px; font-weight: 700; color: #94a3b8;">#${t.id}</td>
            <td style="padding: 15px;">
                <div style="font-weight: 800; color: #1e293b;">${t.name}</div>
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">${t.rif || 'Sin RIF'}</div>
                ${catBadge} 
            </td>
            <td style="padding: 15px;">
                <div style="font-weight: 700; color: #334155; font-size: 0.9rem;">${t.owner_name || "N/A"}</div>
                <div style="font-size: 11px; color: #64748b;">${t.owner_email || "-"}</div>
            </td>
            <td style="padding: 15px;">${planHtml}</td>
            <td style="padding: 15px;">${statusBadge}</td>
            <td style="padding: 15px; text-align: center;">
                <div class="table-actions">
                    <button class="btn-icon btn-edit" data-id="${t.id}" title="Editar Datos"><i class="bi bi-pencil-square"></i></button>
                    ${!isMe ? `<button class="btn-icon btn-del" data-id="${t.id}" title="${t.is_active ? 'Suspender' : 'Activar'}"><i class="bi bi-power"></i></button>` : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll(".btn-edit").forEach(btn => {
        btn.onclick = () => onEdit(btn.dataset.id);
    });
    tableBody.querySelectorAll(".btn-del").forEach(btn => {
        btn.onclick = () => onToggleActive(btn.dataset.id);
    });
}

// ---------------- GESTIÓN DE FORMULARIO ----------------
function resetForm() {
    form.reset();
    inputId.value = "";
    modalTitle.textContent = "Registrar Nueva Empresa";
    
    inputCategory.value = ""; 
    inputPlanId.value = "1"; // Básico por defecto
    
    const today = new Date().toISOString().split('T')[0];
    inputStartDate.value = today;

    billingContainer.style.display = "block";
    ownerContainer.style.display = "block";

    inputOwnerName.required = true;
    inputOwnerEmail.required = true;
    inputOwnerPassword.required = true;
}

function onEdit(id) {
    const t = tenantsList.find(x => Number(x.id) === Number(id));
    if (!t) return;
    
    modalTitle.textContent = "Editar Empresa";
    inputId.value = t.id;
    inputTenantName.value = t.name;
    
    inputCategory.value = t.category_id || ""; 
    inputPlanId.value = t.plan_id || "1"; // Cargar el plan actual
    
    inputRif.value = t.rif || "";
    inputPhone.value = t.phone || "";
    inputInstagram.value = t.instagram || "";
    inputAddress.value = t.address || "";
    
    billingContainer.style.display = "none";
    ownerContainer.style.display = "none";

    inputOwnerName.required = false;
    inputOwnerEmail.required = false;
    inputOwnerPassword.required = false;
    
    openModal();
}

async function onSubmit(e) {
    e.preventDefault();
    const id = inputId.value;

    // Payload base
    const payload = { 
        tenant_name: inputTenantName.value.trim(),
        category_id: inputCategory.value,
        plan_id: inputPlanId.value, // Siempre enviamos el plan
        rif: inputRif.value.trim(),
        phone: inputPhone.value.trim(),
        instagram: inputInstagram.value.trim(),
        address: inputAddress.value.trim()
    };

    // Si es nuevo registro, agregamos datos de dueño y facturación
    if (!id) {
        payload.plan_type = inputPlanType.value;
        payload.start_date = inputStartDate.value;
        payload.owner_name = inputOwnerName.value.trim();
        payload.owner_email = inputOwnerEmail.value.trim();
        payload.owner_password = inputOwnerPassword.value.trim();
    }

    try {
        if (!id) {
            await apiFetch(API_TENANTS, { method: "POST", body: JSON.stringify(payload) });
            openAlert({ title: "¡Éxito!", message: "Empresa registrada bajo el plan seleccionado." });
        } else {
            // Estructura para el PUT según tu controller
            const updatePayload = { 
                name: payload.tenant_name,
                category_id: payload.category_id,
                plan_id: payload.plan_id,
                rif: payload.rif,
                phone: payload.phone,
                instagram: payload.instagram,
                address: payload.address
            };
            await apiFetch(`${API_TENANTS}/${id}`, { method: "PUT", body: JSON.stringify(updatePayload) });
            openAlert({ title: "Actualizado", message: "Datos y Plan actualizados correctamente." });
        }
        await loadTenants();
        closeModal();
    } catch (err) { 
        openAlert({ title: "Error", message: err.message }); 
    }
}

async function onToggleActive(id) {
    const t = tenantsList.find(x => Number(x.id) === Number(id));
    if (!t) return;

    const actionText = t.is_active ? "SUSPENDER" : "REACTIVAR";
    const ok = await openConfirm({ 
        title: "Confirmar Cambio", 
        message: `¿Deseas ${actionText} el acceso de la empresa "${t.name}"?`, 
        okText: "Sí, Proceder", 
        okVariant: t.is_active ? "del" : "super" 
    });
    
    if (!ok) return;

    try {
        await apiFetch(`${API_TENANTS}/${id}/status`, { 
            method: "PUT", 
            body: JSON.stringify({ is_active: !t.is_active }) 
        });
        await loadTenants();
    } catch (err) { openAlert({ title: "Error", message: err.message }); }
}

// ---------------- UI AUXILIARES ----------------
function openModal() { modal?.classList.remove("hidden"); }
function closeModal() { modal?.classList.add("hidden"); }

let confirmResolver = null;
function openConfirm({ title, message, okText, okVariant }) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    const btn = document.getElementById("confirm-ok");
    btn.textContent = okText;
    btn.className = `btn-${okVariant}`; 
    
    document.getElementById("confirm-modal").classList.remove("hidden");
    return new Promise((res) => { confirmResolver = res; });
}

function openAlert({ title, message }) {
    document.getElementById("alert-title").textContent = title;
    document.getElementById("alert-message").textContent = message;
    document.getElementById("alert-modal").classList.remove("hidden");
}

// ---------------- INICIALIZACIÓN ----------------
document.addEventListener("DOMContentLoaded", () => {
    loadTenants();
    
    btnNew?.addEventListener("click", () => { 
        resetForm(); 
        openModal(); 
    });
    
    btnCancel?.addEventListener("click", closeModal);
    form?.addEventListener("submit", onSubmit);
    
    searchInput?.addEventListener("input", (e) => renderTable(e.target.value));

    document.getElementById("alert-ok")?.addEventListener("click", () => {
        document.getElementById("alert-modal").classList.add("hidden");
    });

    document.getElementById("confirm-cancel")?.addEventListener("click", () => { 
        confirmResolver?.(false); 
        document.getElementById("confirm-modal").classList.add("hidden"); 
    });

    document.getElementById("confirm-ok")?.addEventListener("click", () => { 
        confirmResolver?.(true); 
        document.getElementById("confirm-modal").classList.add("hidden"); 
    });
});