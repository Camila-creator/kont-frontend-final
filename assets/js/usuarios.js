// frontend/assets/js/usuarios.js

// ✅ Ajustado a ruta relativa para consistencia con main.js
const API_USERS = "/users";

// ---------------- ELEMENTOS DEL DOM ----------------
const tableBody = document.querySelector("#users-table tbody");
const btnNew = document.getElementById("btn-new-user");
const searchInput = document.getElementById("search-user");

const modal = document.getElementById("user-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("user-form");

const inputId = document.getElementById("user-id");
const inputName = document.getElementById("user-name");
const inputEmail = document.getElementById("user-email");
const inputPassword = document.getElementById("user-password");
const passwordHint = document.getElementById("password-hint");

const inputCustomTitle = document.getElementById("user-custom-title");
const inputRole = document.getElementById("user-role");
const inputIsCoordinator = document.getElementById("user-is-coordinator");
const coordinatorWrap = document.getElementById("coordinator-wrap");

const btnCancel = document.getElementById("btn-cancel");

let usersList = [];

// ---------------- CARGA Y RENDERIZADO ----------------

// ✅ NUEVO: Función para cargar las sedes en el select
async function loadBranchesSelect() {
    const res = await apiFetch("/branches");
    if (!res || res.error) return;
    
    // Si tu nuevo apiFetch ya devuelve el JSON, usamos res directo. Si no, usamos .json()
    const data = res.data ? res : await res.json(); 
    
    const select = document.getElementById("user-branch");
    if (!select) return;

    // Limpiamos las opciones para no duplicarlas si se abre el modal varias veces
    select.innerHTML = '<option value="">Sin sede asignada</option>';

    (data.data || []).filter(b => b.is_active).forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.name;
        select.appendChild(opt);
    });
}

async function loadUsers() {
    try {
        const json = await apiFetch(API_USERS);
        usersList = json.data || json || [];
        renderTable();
    } catch (err) {
        if(!err.message.includes("404")) {
            console.error("Error al cargar usuarios:", err);
            if (typeof openAlert === 'function') {
                openAlert({ title: "Error", message: "No se pudieron cargar los empleados." });
            }
        }
    }
}

function getRoleBadge(role) {
    const map = {
        "SUPER_ADMIN": { class: "badge-super", text: "Super Admin", color: "#7c3aed" },
        "ADMIN": { class: "badge-admin", text: "Administrador", color: "#2563eb" },
        "SELLER": { class: "badge-sales", text: "Ventas", color: "#059669" },
        "FINANCE": { class: "badge-finance", text: "Finanzas", color: "#db2777" },
        "MARKETING": { class: "badge-mkt", text: "Marketing", color: "#ea580c" },
        "WAREHOUSE": { class: "badge-inv", text: "Almacén", color: "#4b5563" },
        "HR": { class: "badge-hr", text: "RRHH", color: "#0891b2" }
    };
    const r = map[role] || { class: "badge-admin", text: role, color: "#64748b" };
    return `<span class="badge" style="background: ${r.color}20; color: ${r.color}; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">${r.text}</span>`;
}

function renderTable(filterText = "") {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const term = filterText.toLowerCase();
    const filtered = usersList.filter(u => 
        (u.name || "").toLowerCase().includes(term) || 
        (u.email || "").toLowerCase().includes(term) ||
        (u.custom_title || "").toLowerCase().includes(term) ||
        (u.branch_name || "").toLowerCase().includes(term) // ✅ Permite buscar también por sede
    );

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="5" style="padding:40px; text-align:center; color:#94a3b8;">No se encontraron empleados con ese criterio.</td></tr>`;
        return;
    }

    // ✅ Actualizado a kont_user
    const currentUser = JSON.parse(localStorage.getItem("kont_user") || "{}");

    filtered.forEach((u) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        const statusBadge = u.is_active 
            ? `<span style="color:#16a34a; font-weight:600; font-size:0.85rem;"><i class="bi bi-circle-fill" style="font-size:7px; margin-right:5px;"></i> Activo</span>`
            : `<span style="color:#ef4444; font-weight:600; font-size:0.85rem;"><i class="bi bi-circle-fill" style="font-size:7px; margin-right:5px;"></i> Inactivo</span>`;

        const coordBadge = u.is_coordinator 
            ? `<span title="Coordinador de Área" style="margin-left:5px; color:#f59e0b;"><i class="bi bi-star-fill"></i></span>` 
            : '';

        const isMe = Number(u.id) === Number(currentUser.id);
        
        tr.innerHTML = `
            <td style="padding:15px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:38px; height:38px; flex-shrink:0; background:#f1f5f9; border: 2px solid #e2e8f0; border-radius:10px; display:flex; justify-content:center; align-items:center; color:#475569; font-weight:800; font-size:1rem;">
                        ${(u.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="line-height: 1.2;">
                        <span style="display: block; font-weight:700; color:#1e293b;">${u.name} ${isMe ? '<small style="color:#94a3b8; font-weight:400;">(Tú)</small>' : ''}</span>
                        <span style="font-size: 0.75rem; color: #64748b;">${u.email}</span>
                    </div>
                </div>
            </td>
            <td style="padding:15px;">
                <div style="line-height:1.2;">
                    <span style="display:block; color:#475569; font-weight:600; font-size:0.9rem;">${u.custom_title || "Sin cargo"}</span>
                    <span style="font-size:0.75rem; color:#94a3b8;"><i class="bi bi-geo-alt"></i> ${u.branch_name || "Sin sede"}</span>
                </div>
            </td>
            <td style="padding:15px;">${getRoleBadge(u.role)} ${coordBadge}</td>
            <td style="padding:15px;">${statusBadge}</td>
            <td style="padding:15px; text-align: right;">
                <div class="table-actions">
                    <button class="btn-icon btn-edit" data-action="edit" data-id="${u.id}" style="border:none; background:none; cursor:pointer; color:#3b82f6; font-size:1.1rem; margin-right:8px;"><i class="bi bi-pencil-square"></i></button>
                    ${!isMe ? `<button class="btn-icon btn-del" data-action="toggle" data-id="${u.id}" style="border:none; background:none; cursor:pointer; color:${u.is_active ? '#ef4444' : '#10b981'}; font-size:1.1rem;"><i class="bi bi-power"></i></button>` : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Event Listeners Delegados
    tableBody.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.onclick = () => {
            const action = btn.getAttribute("data-action");
            const id = btn.getAttribute("data-id");
            if (action === "edit") onEdit(id);
            if (action === "toggle") onToggleActive(id);
        };
    });
}

// ---------------- LÓGICA DEL FORMULARIO ----------------
async function resetForm() {
    modalTitle.textContent = "Registrar Empleado";
    form.reset();
    inputId.value = "";
    inputPassword.required = true;
    if (passwordHint) passwordHint.textContent = "(Mínimo 6 caracteres)";
    if (coordinatorWrap) coordinatorWrap.style.display = "flex";
    
    // ✅ Cargar las opciones de sedes cuando se va a crear uno nuevo
    await loadBranchesSelect();
}

async function onEdit(id) {
    const u = usersList.find(x => Number(x.id) === Number(id));
    if (!u) return;
    
    modalTitle.textContent = "Editar Empleado";
    
    // ✅ Cargar las opciones de sedes antes de setear los valores
    await loadBranchesSelect();

    inputId.value = u.id;
    inputName.value = u.name;
    inputEmail.value = u.email;
    inputRole.value = u.role;
    inputCustomTitle.value = u.custom_title || "";
    inputIsCoordinator.checked = !!u.is_coordinator;
    
    // ✅ Setear la sede actual del usuario
    const branchSelect = document.getElementById("user-branch");
    if (branchSelect) {
        branchSelect.value = u.branch_id || "";
    }

    // Lógica de visibilidad para Admin
    if (coordinatorWrap) {
        coordinatorWrap.style.display = (u.role === "ADMIN") ? "none" : "flex";
    }
    
    inputPassword.value = "";
    inputPassword.required = false;
    if (passwordHint) passwordHint.textContent = "(Déjalo en blanco para mantener la actual)";
    
    openModal();
}

inputRole?.addEventListener("change", (e) => {
    if (coordinatorWrap) {
        if (e.target.value === "ADMIN") {
            coordinatorWrap.style.display = "none";
            inputIsCoordinator.checked = true; 
        } else {
            coordinatorWrap.style.display = "flex";
        }
    }
});

async function onSubmit(e) {
    e.preventDefault();
    
    const btnSubmit = form.querySelector("button[type='submit']");
    const originalText = btnSubmit.innerHTML;
    
    // 🛡️ Protección anti-spam
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="bi bi-hourglass-split"></i> Procesando...';

    const id = inputId.value;
    const payload = {
        name: inputName.value.trim(),
        email: inputEmail.value.trim(),
        role: inputRole.value,
        custom_title: inputCustomTitle.value.trim(),       
        is_coordinator: !!inputIsCoordinator.checked,
        // ✅ AÑADIDO: Se envía el branch_id al backend
        branch_id: document.getElementById("user-branch").value || null
    };

    if (inputPassword.value.trim() !== "") {
        payload.password = inputPassword.value.trim();
    }

    try {
        if (!id) {
            await apiFetch(API_USERS, { method: "POST", body: JSON.stringify(payload) });
        } else {
            await apiFetch(`${API_USERS}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        }
        
        await loadUsers();
        closeModal();
        if (typeof openAlert === 'function') {
            openAlert({ title: "Éxito", message: "Información actualizada correctamente." });
        }
    } catch (err) { 
        if (typeof openAlert === 'function') {
            openAlert({ title: "Error", message: err.message }); 
        } else {
            alert(err.message);
        }
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
}

async function onToggleActive(id) {
    const u = usersList.find(x => Number(x.id) === Number(id));
    if (!u) return;

    const actionText = u.is_active ? "desactivar" : "reactivar";
    
    if (typeof openConfirm === 'function') {
        const ok = await openConfirm({ 
            title: "¿Confirmar cambio?", 
            message: `Vas a ${actionText} el acceso de ${u.name}.`, 
            okText: `Sí, ${actionText}`, 
            okVariant: u.is_active ? "danger" : "primary" 
        });
        if (!ok) return;
    }

    try {
        await apiFetch(`${API_USERS}/${id}`, { 
            method: "PUT", 
            body: JSON.stringify({ is_active: !u.is_active }) 
        });
        await loadUsers();
    } catch (err) { 
        console.error(err);
    }
}

// ---------------- UI & EVENTOS ----------------
function openModal() { modal?.classList.remove("hidden"); }
function closeModal() { modal?.classList.add("hidden"); }

// INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    if (typeof apiFetch !== "function") {
        console.error("❌ Error: main.js no detectado.");
        return;
    }
    
    loadUsers();
    
    // ✅ Ahora resetForm es asíncrono, por lo que lo llamamos así
    btnNew?.addEventListener("click", async () => { 
        await resetForm(); 
        openModal(); 
    });
    
    btnCancel?.addEventListener("click", closeModal);
    form?.addEventListener("submit", onSubmit);
    
    searchInput?.addEventListener("input", (e) => {
        renderTable(e.target.value);
    });
});