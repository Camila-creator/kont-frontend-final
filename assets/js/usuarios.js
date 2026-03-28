// frontend/assets/js/usuarios.js

const API_USERS = "https://kont-backend-final.onrender.com/api/users";

// ---------------- ELEMENTOS ----------------
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

// Los nuevos campos mágicos
const inputCustomTitle = document.getElementById("user-custom-title");
const inputRole = document.getElementById("user-role");
const inputIsCoordinator = document.getElementById("user-is-coordinator");
const coordinatorWrap = document.getElementById("coordinator-wrap");

const btnCancel = document.getElementById("btn-cancel");

let usersList = [];

// ---------------- API FETCH (Con Seguridad VIP) ----------------
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
        window.location.replace("login.html");
        return;
    }
    
    if (!res.ok) throw new Error(data?.error || `Error HTTP ${res.status}`);
    return data;
}

// ---------------- CARGA Y RENDERIZADO ----------------
async function loadUsers() {
    try {
        const json = await apiFetch(API_USERS);
        usersList = json.data || [];
        renderTable();
    } catch (err) {
        if(!err.message.includes("404")) {
            openAlert({ title: "Error", message: "No se pudieron cargar los usuarios: " + err.message });
        }
    }
}

function getRoleBadge(role) {
    const map = {
        "SUPER_ADMIN": { class: "badge-super", text: "Super Admin" },
        "ADMIN_BRAND": { class: "badge-admin", text: "Administrador" },
        "SALES": { class: "badge-sales", text: "Ventas" },
        "FINANCE": { class: "badge-finance", text: "Finanzas" },
        "MARKETING": { class: "badge-mkt", text: "Marketing" },
        "INVENTORY": { class: "badge-inv", text: "Almacén" },
        "HR": { class: "badge-hr", text: "RRHH" }
    };
    const r = map[role] || { class: "badge-admin", text: role };
    return `<span class="badge ${r.class}">${r.text}</span>`;
}

function renderTable(filterText = "") {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const term = filterText.toLowerCase();
    const filtered = usersList.filter(u => 
        (u.name || "").toLowerCase().includes(term) || 
        (u.email || "").toLowerCase().includes(term) ||
        (u.custom_title || "").toLowerCase().includes(term)
    );

    if (!filtered.length) {
        tableBody.innerHTML = `<tr><td colspan="5" style="padding:20px; text-align:center; color:#64748b;">No se encontraron empleados.</td></tr>`;
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem("agromedic_user") || "{}");

    filtered.forEach((u) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        const statusBadge = u.is_active 
            ? `<span style="color:#16a34a; font-weight:600; font-size:0.9rem;"><i class="bi bi-circle-fill" style="font-size:8px; margin-right:5px;"></i> Activo</span>`
            : `<span class="badge badge-inactive">Inactivo</span>`;

        // Estrellita para los coordinadores
        const coordBadge = u.is_coordinator 
            ? `<span class="badge badge-coord" title="Coordinador de Área"><i class="bi bi-star-fill"></i> Coord</span>` 
            : '';

        const isMe = Number(u.id) === Number(currentUser.id);
        const actionButtons = isMe 
            ? `<span style="color:#94a3b8; font-size:0.85rem;">(Tú)</span>`
            : `
                <button class="btn-icon btn-edit" data-action="edit" data-id="${u.id}" title="Editar"><i class="bi bi-pencil-square"></i></button>
                <button class="btn-icon btn-del" data-action="delete" data-id="${u.id}" title="${u.is_active ? 'Desactivar' : 'Activar'}"><i class="bi bi-power"></i></button>
              `;

        // Asegúrate de que el primer TD tenga esta estructura en tu renderTable:
tr.innerHTML = `
    <td style="padding:15px; font-weight:600; color:#1e293b;">
        <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:35px; height:35px; flex-shrink:0; background:#e2e8f0; border-radius:50%; display:flex; justify-content:center; align-items:center; color:#475569; font-weight:bold; font-size:0.9rem;">
                ${(u.name || "U").charAt(0).toUpperCase()}
            </div>
            <div style="overflow: hidden;">
                <span style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.name}</span>
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: normal; display: block;">${u.email}</span>
            </div>
        </div>
    </td>
    <td style="padding:15px; color:#475569; font-weight: 600;">${u.custom_title || "Sin cargo"}</td>
    <td style="padding:15px;">${getRoleBadge(u.role)} ${coordBadge}</td>
    <td style="padding:15px;">${statusBadge}</td>
    <td style="padding:15px;">
        <div class="table-actions">${actionButtons}</div>
    </td>
`;
        tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const action = btn.getAttribute("data-action");
            const id = btn.getAttribute("data-id");
            if (action === "edit") onEdit(id);
            if (action === "delete") onToggleActive(id);
        });
    });
}

// ---------------- FORMULARIO ----------------
function resetForm() {
    modalTitle.textContent = "Registrar Empleado";
    form.reset();
    inputId.value = "";
    inputPassword.required = true;
    passwordHint.textContent = "(Obligatorio)";
    inputCustomTitle.value = "";
    inputIsCoordinator.checked = false;
    coordinatorWrap.style.display = "flex"; // Lo mostramos por defecto
}

function onEdit(id) {
    const u = usersList.find(x => Number(x.id) === Number(id));
    if (!u) return;
    
    modalTitle.textContent = "Editar Empleado";
    inputId.value = u.id;
    inputName.value = u.name;
    inputEmail.value = u.email;
    inputRole.value = u.role;
    
    // Llenamos los campos nuevos
    inputCustomTitle.value = u.custom_title || "";
    inputIsCoordinator.checked = !!u.is_coordinator;

    // Si es Administrador, ocultamos lo de coordinador porque no tiene sentido (el admin ya ve todo)
    if (u.role === "ADMIN_BRAND") {
        coordinatorWrap.style.display = "none";
    } else {
        coordinatorWrap.style.display = "flex";
    }
    
    inputPassword.value = "";
    inputPassword.required = false;
    passwordHint.textContent = "(Déjalo en blanco para no cambiarla)";
    
    openModal();
}

// Esconder/Mostrar el switch de coordinador si cambian a "Administrador"
inputRole?.addEventListener("change", (e) => {
    if (e.target.value === "ADMIN_BRAND") {
        coordinatorWrap.style.display = "none";
        inputIsCoordinator.checked = true; // Por defecto el admin tiene los poderes
    } else {
        coordinatorWrap.style.display = "flex";
    }
});

// NUEVO: Protección contra doble clic
async function onSubmit(e) {
    e.preventDefault();
    
    // 1. Capturamos el botón y lo bloqueamos
    const btnSubmit = form.querySelector("button[type='submit']");
    const originalText = btnSubmit.innerHTML; 
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
    btnSubmit.style.opacity = "0.7";

    const id = inputId.value;
    const payload = {
        name: inputName.value.trim(),
        email: inputEmail.value.trim(),
        role: inputRole.value,
        custom_title: inputCustomTitle.value.trim(),       
        is_coordinator: !!inputIsCoordinator.checked       
    };

    if (inputPassword.value.trim() !== "") {
        payload.password = inputPassword.value.trim();
    }

    try {
        if (!id) {
            await apiFetch(API_USERS, { method: "POST", body: JSON.stringify(payload) });
            openAlert({ title: "¡Éxito!", message: "Empleado registrado correctamente." });
        } else {
            await apiFetch(`${API_USERS}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
            openAlert({ title: "Actualizado", message: "Los datos se guardaron correctamente." });
        }
        await loadUsers();
        closeModal();
    } catch (err) { 
        openAlert({ title: "Error", message: err.message }); 
    } finally {
        // 2. Pase lo que pase (éxito o error), volvemos a encender el botón
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
        btnSubmit.style.opacity = "1";
    }
}

async function onToggleActive(id) {
    const u = usersList.find(x => Number(x.id) === Number(id));
    if (!u) return;

    const actionText = u.is_active ? "desactivar" : "reactivar";
    const ok = await openConfirm({ 
        title: "¿Estás segura?", 
        message: `Vas a ${actionText} el acceso de ${u.name}.`, 
        okText: "Sí, continuar", 
        okVariant: u.is_active ? "danger" : "primary" 
    });
    
    if (!ok) return;

    try {
        await apiFetch(`${API_USERS}/${id}`, { 
            method: "PUT", 
            body: JSON.stringify({ is_active: !u.is_active }) 
        });
        await loadUsers();
    } catch (err) { openAlert({ title: "Error", message: err.message }); }
}

// ---------------- UI & EVENTOS ----------------
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
function closeConfirm() { document.getElementById("confirm-modal").classList.add("hidden"); }
document.getElementById("confirm-ok")?.addEventListener("click", () => { confirmResolver?.(true); closeConfirm(); });
document.getElementById("confirm-cancel")?.addEventListener("click", () => { confirmResolver?.(false); closeConfirm(); });

function openAlert({ title, message }) {
    document.getElementById("alert-title").textContent = title;
    document.getElementById("alert-message").textContent = message;
    document.getElementById("alert-modal").classList.remove("hidden");
}
document.getElementById("alert-ok")?.addEventListener("click", () => { document.getElementById("alert-modal").classList.add("hidden"); });

// INICIO
document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
    btnNew?.addEventListener("click", () => { resetForm(); openModal(); });
    btnCancel?.addEventListener("click", closeModal);
    form?.addEventListener("submit", onSubmit);
    searchInput?.addEventListener("input", (e) => renderTable(e.target.value));
});