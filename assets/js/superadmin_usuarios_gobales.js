/**
 * usuarios_globales.js - Módulo de Super Admin
 * Usa las funciones globales de main.js
 */

// 1. SELECTORES (Cambié algunos nombres para que sean únicos y no choquen)
const cardsContainer = document.getElementById("tenants-cards-container");
const spyModal = document.getElementById("spy-modal");
const spyModalTitle = document.getElementById("spy-modal-title");
const spyTableBody = document.querySelector("#spy-users-table tbody");
const btnCloseSpy = document.getElementById("btn-close-spy");

// 2. RUTA ESPECÍFICA (Sin usar 'const API_BASE' para evitar el SyntaxError)
// Simplemente definimos el endpoint relativo
const ENDPOINT_USUARIOS_GOBALES = "/usuarios-globales";

async function loadTenants() {
    if (!cardsContainer) return;

    try {
        const response = await apiFetch(`${ENDPOINT_USUARIOS_GOBALES}/summary`);
        
        // 🔍 VALIDACIÓN CLAVE: 
        // Si 'response' es el objeto completo, buscamos '.data'. 
        // Si no, usamos 'response' directamente.
        const tenants = Array.isArray(response) ? response : (response.data || []);
        
        renderCards(tenants);
    } catch (err) {
        console.error("Error loadTenants:", err);
        cardsContainer.innerHTML = `
            <div style="color:#ef4444; text-align:center; padding:20px; grid-column: 1 / -1;">
                <i class="bi bi-exclamation-triangle"></i> Error al cargar el resumen.
            </div>`;
    }
}

function renderCards(tenants) {
    cardsContainer.innerHTML = "";
    
    if (!tenants || tenants.length === 0) {
        cardsContainer.innerHTML = `<p style="text-align:center; color:#64748b; grid-column: 1 / -1;">No hay clientes registrados aún.</p>`;
        return;
    }

    tenants.forEach(t => {
        const total = Number(t.total_usuarios || 0);
        const activos = Number(t.usuarios_activos || 0);
        const inactivos = total - activos;
        
        const isSuspended = t.is_active === false; 
        const cardClass = isSuspended ? 'tenant-card suspended' : 'tenant-card';
        
        const statusBadge = isSuspended 
            ? `<span class="badge-status-red">🔴 Suspendido</span>`
            : `<span class="badge-status-green">🟢 Activo</span>`;

        // Creamos el elemento para manejar el click de forma limpia
        const card = document.createElement("div");
        card.className = cardClass;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                <h3 style="margin:0; color:#0f172a; font-size:1.1rem;">
                    <i class="bi bi-buildings" style="color:#0ea5e9; margin-right:5px;"></i> ${t.empresa}
                </h3>
                ${statusBadge}
            </div>
            <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom: 15px;">
                <div class="stat-box"><span class="stat-number" style="color:#3b82f6;">${total}</span><span class="stat-label">Totales</span></div>
                <div class="stat-box"><span class="stat-number" style="color:#10b981;">${activos}</span><span class="stat-label">Activos</span></div>
                <div class="stat-box"><span class="stat-number" style="color:#ef4444;">${inactivos}</span><span class="stat-label">Inactivos</span></div>
            </div>
            <div style="text-align:right; font-size:0.85rem; color:#0284c7; font-weight:600;">
                Ver empleados <i class="bi bi-arrow-right-short"></i>
            </div>`;
            
        card.onclick = () => openSpyModal(t.tenant_id, t.empresa);
        cardsContainer.appendChild(card);
    });
}

async function openSpyModal(tenantId, empresaName) {
    if (!spyModal || !spyTableBody) return;

    // 1. Bloquear el scroll de la página de fondo
    document.body.style.overflow = 'hidden';

    spyModalTitle.innerHTML = `Usuarios de <span style="color:#38bdf8;">${empresaName}</span>`;
    spyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px;"><i class="bi bi-arrow-repeat spin"></i> Cargando usuarios...</td></tr>`;
    
    spyModal.classList.remove("hidden");
    
    // Resetear el scroll del contenido del modal al abrirlo
    const modalContent = spyModal.querySelector('.modal-content');
    if (modalContent) modalContent.scrollTop = 0;

    try {
        const response = await apiFetch(`${ENDPOINT_USUARIOS_GOBALES}/${tenantId}/users`);
        spyTableBody.innerHTML = "";

        const users = Array.isArray(response) ? response : (response.data || []);

        if (users.length === 0) {
            spyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:40px;">No hay usuarios en esta empresa.</td></tr>`;
            return;
        }

        // Usamos un fragmento o un string acumulado para no saturar el DOM
        let rowsHtml = "";
        users.forEach(u => {
            const date = u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';
            const userStatus = u.is_active 
                ? '<span style="color:#10b981; font-weight:700;"><i class="bi bi-check-circle-fill"></i> Activo</span>' 
                : '<span style="color:#ef4444; font-weight:700;"><i class="bi bi-x-circle-fill"></i> Inactivo</span>';

            rowsHtml += `
                <tr>
                    <td style="font-weight:600; color:#1e293b;">${u.name}</td>
                    <td style="color:#475569; font-size: 0.85rem;">${u.email}</td>
                    <td style="text-align:center;"><span class="role-badge">${u.role || 'EMPLEADO'}</span></td>
                    <td style="text-align:center;">
                        ${userStatus} <br>
                        <span style="color:#94a3b8; font-size: 0.75rem;">${date}</span>
                    </td>
                </tr>`;
        });
        spyTableBody.innerHTML = rowsHtml;

    } catch (err) {
        console.error("Error openSpyModal:", err);
        spyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444; padding:20px;">Error de conexión.</td></tr>`;
    }
}

// 3. INICIALIZACIÓN - Mejorada para cerrar limpio
function initUsuariosGlobales() {
    loadTenants();
    
    const closeSpy = () => {
        spyModal.classList.add("hidden");
        document.body.style.overflow = 'auto'; // Devolver el scroll
    };

    if (btnCloseSpy) btnCloseSpy.onclick = closeSpy;
    
    if (spyModal) {
        spyModal.onclick = (e) => {
            if (e.target === spyModal) closeSpy();
        };
    }
}

// Ejecutamos
initUsuariosGlobales();