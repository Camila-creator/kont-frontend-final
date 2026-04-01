/* =========================================================
   SOLICITUDES Y TAREAS (KANBAN) JS - Integrado con Kont
   ========================================================= */

// 1. Configuración de Endpoints (Heredando de main.js)
const API_TASKS = `${API_BASE}/mkt-tasks`;
const API_ROLES = `${API_BASE}/mkt-tasks/roles`;

let dbRoles = [];
let dbTasks = [];

// 2. Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});

// Auto-Refresh al volver a la pestaña
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadAllData(); 
});

/**
 * CARGA INICIAL DE DATOS (ROLES Y TAREAS)
 */
async function loadAllData() {
    try {
        const [jsonRoles, jsonTasks] = await Promise.all([
            apiFetch(API_ROLES),
            apiFetch(API_TASKS)
        ]);
        
        if(jsonRoles && (jsonRoles.success || Array.isArray(jsonRoles))) {
            dbRoles = jsonRoles.data || jsonRoles;
        }
        if(jsonTasks && (jsonTasks.success || Array.isArray(jsonTasks))) {
            dbTasks = jsonTasks.data || jsonTasks;
        }

        // Normalizar fechas de Postgres
        dbTasks.forEach(t => {
            if(t.start_date) t.start_date = t.start_date.split('T')[0];
            if(t.deadline) t.deadline = t.deadline.split('T')[0];
        });

        renderRoles();
        renderDashboard();
        renderKanban();
    } catch(e) { 
        console.error("Error cargando el Tablero Kanban:", e); 
    }
}

/**
 * GESTIÓN DE ÁREAS / ROLES
 */
function renderRoles() {
    const filterSelect = document.getElementById('filterRole');
    const taskSelect = document.getElementById('taskRole');
    const listContainer = document.getElementById('rolesListContainer');
    
    if (!filterSelect || !taskSelect || !listContainer) return;

    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="ALL">Todas las Áreas</option>';
    taskSelect.innerHTML = '<option value="">Asignar Área...</option>';
    listContainer.innerHTML = '';

    dbRoles.forEach(r => {
        const option = `<option value="${r.id}">${r.name}</option>`;
        filterSelect.innerHTML += option;
        taskSelect.innerHTML += option;
        
        listContainer.innerHTML += `
            <div class="role-item">
                <span>${r.name}</span>
                <button type="button" class="btn-role-delete" onclick="deleteRole(${r.id})">
                    <i class="bi bi-x-circle"></i>
                </button>
            </div>`;
    });

    if (currentFilter) filterSelect.value = currentFilter; 
}

async function addRole(e) {
    if(e) e.preventDefault();
    const input = document.getElementById('newRoleName');
    const name = input.value.trim();
    if(!name) return;

    try {
        await apiFetch(API_ROLES, { method: 'POST', body: JSON.stringify({name}) });
        input.value = '';
        loadAllData();
        showCustomAlert("Área Creada", `"${name}" ahora está disponible.`, "success");
    } catch(err) { console.error(err); }
}

async function deleteRole(id) {
    if(!confirm("¿Eliminar esta área? Las tareas asociadas quedarán sin categoría.")) return;
    try {
        await apiFetch(`${API_ROLES}/${id}`, { method: 'DELETE' });
        loadAllData();
    } catch(err) { console.error(err); }
}

/**
 * MÉTRICAS DEL TABLERO
 */
function renderDashboard() {
    let activas = 0; let revision = 0; let atrasadas = 0;
    const today = new Date().toISOString().split('T')[0];

    dbTasks.forEach(t => {
        const isClosed = (t.status === 'Finalizado' || t.status === 'Aprobado');
        if(!isClosed) activas++;
        if(t.status === 'En Revisión') revision++;
        if(!isClosed && t.deadline && t.deadline < today) atrasadas++;
    });

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    };

    setVal('dashActivas', activas);
    setVal('dashRevision', revision);
    setVal('dashAtrasadas', atrasadas);
}

/**
 * RENDERIZADO DEL KANBAN
 */
function renderKanban() {
    const cols = {
        'Por Hacer': document.getElementById('col-todo-cards'),
        'En Progreso': document.getElementById('col-progreso-cards'),
        'En Revisión': document.getElementById('col-revision-cards'),
        'Aprobado': document.getElementById('col-aprobado-cards'),
        'Finalizado': document.getElementById('col-finalizado-cards')
    };

    const counts = { 'Por Hacer': 0, 'En Progreso': 0, 'En Revisión': 0, 'Aprobado': 0, 'Finalizado': 0 };
    Object.values(cols).forEach(col => { if(col) col.innerHTML = ''; });

    const filterVal = document.getElementById('filterRole')?.value || 'ALL';
    const today = new Date().toISOString().split('T')[0];

    dbTasks.forEach(t => {
        if (filterVal !== 'ALL' && t.role_id != filterVal) return;
        if(counts[t.status] !== undefined) counts[t.status]++;

        const priClass = t.priority === 'Alta' ? 'pri-alta' : (t.priority === 'Baja' ? 'pri-baja' : 'pri-media');
        
        let deadlineHtml = `<i class="bi bi-calendar4"></i> ${t.deadline || 'Sin fecha'}`;
        if (t.status !== 'Finalizado' && t.status !== 'Aprobado' && t.deadline) {
            if (t.deadline < today) deadlineHtml = `<span class="deadline-overdue"><i class="bi bi-exclamation-circle"></i> Atrasado</span>`;
            else if (t.deadline === today) deadlineHtml = `<span class="deadline-today"><i class="bi bi-clock"></i> Entrega Hoy</span>`;
        }

        const roleName = dbRoles.find(r => r.id == t.role_id)?.name || 'General';

        const cardHtml = `
            <div class="task-card ${priClass}" draggable="true" ondragstart="drag(event, ${t.id})" onclick="openTaskModal(${t.id})">
                <div class="task-badge-role">${roleName}</div>
                <h4 class="task-title">${t.title}</h4>
                <div class="task-footer">
                    <span class="task-deadline">${deadlineHtml}</span>
                    <i class="bi bi-chat-left-text" style="color:${t.feedback ? '#06b6d4' : '#d1d5db'}"></i>
                </div>
            </div>`;

        if (cols[t.status]) cols[t.status].innerHTML += cardHtml;
    });

    // Actualizar contadores de columna
    Object.keys(counts).forEach(key => {
        const elId = `count-${key.toLowerCase().replace(' ', '')}`;
        const el = document.getElementById(elId);
        if(el) el.innerText = counts[key];
    });
}

/**
 * LÓGICA DRAG & DROP
 */
function drag(ev, id) { ev.dataTransfer.setData("taskId", id); }
function allowDrop(ev) { ev.preventDefault(); }

async function drop(ev, newStatus) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("taskId");
    const task = dbTasks.find(t => t.id == id);
    
    if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        task.status = newStatus; // Optimismo UI
        renderKanban();
        renderDashboard();

        try {
            await apiFetch(`${API_TASKS}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(task)
            });
        } catch(err) {
            task.status = oldStatus; // Revertir si falla
            renderKanban();
            console.error("Error al mover tarea:", err);
        }
    }
}

/**
 * MODALES Y GUARDADO
 */
function openTaskModal(id = null) {
    const form = document.getElementById('taskForm');
    if(!form) return;
    form.reset();
    document.getElementById('taskId').value = '';
    
    const tabs = document.querySelectorAll('.tab-btn');
    if(tabs.length > 0) tabs[0].click(); 

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

async function saveTask(e) {
    if(e) e.preventDefault();
    const id = document.getElementById('taskId').value;
    
    let currentStatus = 'Por Hacer';
    if(id) {
        const existing = dbTasks.find(t => t.id == id);
        if(existing) currentStatus = existing.status;
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

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_TASKS}/${id}` : API_TASKS;
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        
        closeModal('taskModal'); 
        loadAllData(); 
        showCustomAlert("¡Logrado!", "Tarea actualizada en el tablero.", "success"); 
    } catch(err) { console.error(err); }
}

// Helpers UI
function closeModal(id) { 
    const el = document.getElementById(id);
    if(el) el.classList.remove('active'); 
}

function openRolesModal() { 
    const el = document.getElementById('rolesModal');
    if(el) el.classList.add('active'); 
}

function switchTab(evt, tabName) {
    if (evt && evt.preventDefault) evt.preventDefault(); 
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    const target = document.getElementById(tabName);
    if(target) target.classList.add("active");
    if(evt) evt.currentTarget.classList.add("active");
}

function showCustomAlert(title, message, type = 'success') {
    const icon = document.getElementById('alertIcon');
    const btn = document.getElementById('alertBtn');
    if(!icon || !btn) return;

    icon.innerHTML = type === 'success' 
        ? '<i class="bi bi-check-circle-fill" style="color: #06b6d4;"></i>' 
        : '<i class="bi bi-exclamation-triangle-fill" style="color: #f59e0b;"></i>';
    
    btn.style.background = type === 'success' ? '#06b6d4' : '#f59e0b';
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = message;
    document.getElementById('customAlertModal').classList.add('active');
}