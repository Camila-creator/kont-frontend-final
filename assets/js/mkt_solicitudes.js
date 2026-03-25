/* =========================================================
   SOLICITUDES Y TAREAS (KANBAN) JS - Conectado a PostgreSQL
   ========================================================= */

const API_TASKS = 'https://kont-backend-final.onrender.com/api/mkt-tasks';
const API_ROLES = 'https://kont-backend-final.onrender.com/api/mkt-tasks/roles';

let dbRoles = [];
let dbTasks = [];

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});

// Auto-Refresh
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        loadAllData(); 
    }
});

// === API FETCH CON GAFETE ===
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) },
        ...options,
    });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("agromedic_token");
        window.location.replace("../pages/login.html");
        return;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`);
    return data;
}

// === 1. CARGA DE DATOS DESDE EL BACKEND ===
async function loadAllData() {
    try {
        const [jsonRoles, jsonTasks] = await Promise.all([
            apiFetch(API_ROLES),
            apiFetch(API_TASKS)
        ]);
        
        if(jsonRoles && jsonRoles.success) dbRoles = jsonRoles.data;
        if(jsonTasks && jsonTasks.success) dbTasks = jsonTasks.data;

        // Limpiar el formato de fecha de Postgres para que JS lo lea bien
        dbTasks.forEach(t => {
            if(t.start_date) t.start_date = t.start_date.split('T')[0];
            if(t.deadline) t.deadline = t.deadline.split('T')[0];
        });

        renderRoles();
        renderDashboard();
        renderKanban();
    } catch(e) { 
        console.error("Error conectando con el servidor de Tareas", e); 
    }
}

// === 2. GESTIÓN DE ROLES (CARGOS) ===
function renderRoles() {
    const filterSelect = document.getElementById('filterRole');
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="ALL">Todas las Áreas</option>';
    
    const taskSelect = document.getElementById('taskRole');
    taskSelect.innerHTML = '';

    const listContainer = document.getElementById('rolesListContainer');
    listContainer.innerHTML = '';

    dbRoles.forEach(r => {
        filterSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
        taskSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
        
        listContainer.innerHTML += `
            <div class="role-item">
                <span>${r.name}</span>
                <button type="button" class="btn-danger-outline" onclick="deleteRole(${r.id})"><i class="bi bi-trash"></i></button>
            </div>
        `;
    });

    if (currentFilter && [...filterSelect.options].some(o => o.value === currentFilter)) {
        filterSelect.value = currentFilter; 
    }
}

async function addRole(e) {
    e.preventDefault();
    const newName = document.getElementById('newRoleName').value;
    try {
        await apiFetch(API_ROLES, { method: 'POST', body: JSON.stringify({name: newName}) });
        document.getElementById('newRoleName').value = '';
        loadAllData();
        showCustomAlert("Cargo Añadido", `Se ha agregado "${newName}" a las áreas de trabajo.`, "success");
    } catch(err) { console.error(err); }
}

async function deleteRole(id) {
    if(confirm("¿Seguro que deseas eliminar esta área de trabajo? Las tareas asignadas a esta área quedarán sin asignar.")) {
        try {
            await apiFetch(`${API_ROLES}/${id}`, { method: 'DELETE' });
            loadAllData();
        } catch(err) { console.error(err); }
    }
}

function openRolesModal() { document.getElementById('rolesModal').classList.add('active'); }

// === 3. RENDERIZADO KANBAN Y DASHBOARD ===
function renderDashboard() {
    let activas = 0; let revision = 0; let atrasadas = 0;
    const today = new Date().toISOString().split('T')[0];

    dbTasks.forEach(t => {
        if(t.status !== 'Finalizado' && t.status !== 'Aprobado') activas++;
        if(t.status === 'En Revisión') revision++;
        if(t.status !== 'Finalizado' && t.status !== 'Aprobado' && t.deadline && t.deadline < today) atrasadas++;
    });

    document.getElementById('dashActivas').innerText = activas;
    document.getElementById('dashRevision').innerText = revision;
    document.getElementById('dashAtrasadas').innerText = atrasadas;
}

function getRoleName(id) {
    const r = dbRoles.find(role => role.id == id);
    return r ? r.name : 'Sin Área';
}

function renderKanban() {
    const cols = {
        'Por Hacer': document.getElementById('col-todo-cards'),
        'En Progreso': document.getElementById('col-progreso-cards'),
        'En Revisión': document.getElementById('col-revision-cards'),
        'Aprobado': document.getElementById('col-aprobado-cards'),
        'Finalizado': document.getElementById('col-finalizado-cards')
    };

    const counts = { 'Por Hacer': 0, 'En Progreso': 0, 'En Revisión': 0, 'Aprobado': 0, 'Finalizado': 0 };
    Object.values(cols).forEach(col => col.innerHTML = '');

    const filterVal = document.getElementById('filterRole').value;
    const today = new Date().toISOString().split('T')[0];

    dbTasks.forEach(t => {
        if (filterVal !== 'ALL' && t.role_id != filterVal) return;

        if(counts[t.status] !== undefined) counts[t.status]++;

        let priClass = 'pri-media';
        if(t.priority === 'Alta') priClass = 'pri-alta';
        if(t.priority === 'Baja') priClass = 'pri-baja';

        let deadlineHtml = `<i class="bi bi-calendar4"></i> ${t.deadline || 'Sin fecha'}`;
        if (t.status !== 'Finalizado' && t.status !== 'Aprobado' && t.deadline) {
            if (t.deadline < today) deadlineHtml = `<span class="deadline-overdue" title="¡Atrasado!"><i class="bi bi-exclamation-circle-fill"></i> ${t.deadline}</span>`;
            else if (t.deadline === today) deadlineHtml = `<span class="deadline-today" title="Entrega Hoy"><i class="bi bi-clock-fill"></i> Hoy</span>`;
        }

        const roleName = getRoleName(t.role_id);

        const cardHtml = `
            <div class="task-card ${priClass}" draggable="true" ondragstart="drag(event, ${t.id})" onclick="openTaskModal(${t.id})">
                <div class="task-badge-role">${roleName}</div>
                <h4 class="task-title">${t.title}</h4>
                <div class="task-footer">
                    <span class="task-deadline">${deadlineHtml}</span>
                    <span><i class="bi bi-chat-text" style="color:${t.feedback ? '#06b6d4' : '#e5e7eb'};"></i></span>
                </div>
            </div>
        `;

        if (cols[t.status]) cols[t.status].innerHTML += cardHtml;
    });

    document.getElementById('count-todo').innerText = counts['Por Hacer'];
    document.getElementById('count-progreso').innerText = counts['En Progreso'];
    document.getElementById('count-revision').innerText = counts['En Revisión'];
    document.getElementById('count-aprobado').innerText = counts['Aprobado'];
    document.getElementById('count-finalizado').innerText = counts['Finalizado'];
}

// === 4. LÓGICA DRAG & DROP Y ACTUALIZACIÓN EN BACKEND ===
function drag(ev, id) { ev.dataTransfer.setData("taskId", id); }
function allowDrop(ev) { ev.preventDefault(); }

async function drop(ev, newStatus) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("taskId");
    const taskIndex = dbTasks.findIndex(t => t.id == id);
    
    if (taskIndex > -1) {
        dbTasks[taskIndex].status = newStatus;
        renderKanban();
        renderDashboard();

        try {
            await apiFetch(`${API_TASKS}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(dbTasks[taskIndex])
            });
        } catch(err) {
            console.error("Error al guardar el nuevo estado:", err);
        }
    }
}

// === 5. CONTROL DE MODALES ===
function switchTab(evt, tabName) {
    if (evt && evt.preventDefault) evt.preventDefault(); 
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function openTaskModal(id = null) {
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.querySelectorAll('.tab-btn')[0].click(); 

    if (id !== null) {
        const t = dbTasks.find(task => task.id == id);
        document.getElementById('modalTitle').innerText = 'Editar Tarea';
        document.getElementById('taskId').value = t.id;
        document.getElementById('taskTitle').value = t.title || '';
        document.getElementById('taskRole').value = t.role_id || '';
        document.getElementById('taskPriority').value = t.priority || 'Media';
        document.getElementById('taskStartDate').value = t.start_date || '';
        document.getElementById('taskDeadline').value = t.deadline || '';
        document.getElementById('taskDesc').value = t.description || '';
        document.getElementById('taskResources').value = t.link_resources || '';
        document.getElementById('taskDeliverable').value = t.link_deliverable || '';
        document.getElementById('taskFeedback').value = t.feedback || '';
    } else {
        document.getElementById('modalTitle').innerText = 'Nueva Tarea / Solicitud';
        document.getElementById('taskStartDate').value = new Date().toISOString().split('T')[0]; 
    }
    document.getElementById('taskModal').classList.add('active');
}

function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

function showCustomAlert(title, message, type = 'success') {
    const iconContainer = document.getElementById('alertIcon');
    const btn = document.getElementById('alertBtn');
    
    if (type === 'success') {
        iconContainer.innerHTML = '<i class="bi bi-check-circle-fill" style="color: #06b6d4;"></i>';
        btn.style.background = '#06b6d4'; btn.style.color = 'white';
    } else if (type === 'warning') {
        iconContainer.innerHTML = '<i class="bi bi-exclamation-triangle-fill" style="color: #f59e0b;"></i>';
        btn.style.background = '#f59e0b'; btn.style.color = 'white';
    }
    
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = message;
    document.getElementById('customAlertModal').classList.add('active');
}

// === 6. GUARDAR TAREA EN POSTGRES ===
async function saveTask(e) {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    
    let currentStatus = 'Por Hacer';
    if(id) {
        const existingTask = dbTasks.find(t => t.id == id);
        if(existingTask) currentStatus = existingTask.status;
    }

    const payload = {
        title: document.getElementById('taskTitle').value,
        role_id: document.getElementById('taskRole').value || null,
        priority: document.getElementById('taskPriority').value,
        start_date: document.getElementById('taskStartDate').value || null,
        deadline: document.getElementById('taskDeadline').value || null,
        status: currentStatus,
        description: document.getElementById('taskDesc').value,
        link_resources: document.getElementById('taskResources').value,
        link_deliverable: document.getElementById('taskDeliverable').value,
        feedback: document.getElementById('taskFeedback').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_TASKS}/${id}` : API_TASKS;

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('taskModal'); 
        loadAllData(); 
        showCustomAlert("¡Tarea Guardada!", "La solicitud ha sido registrada y actualizada correctamente.", "success"); 
    } catch(err) { console.error(err); }
}