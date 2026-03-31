/**
 * main.js - Núcleo de Lógica del Frontend Agromedic
 * Versión: 2.2 (Soporte Hybrid Mobile-First)
 */

// =========================================================
// 0. CONFIGURACIÓN GLOBAL Y ESTADO
// =========================================================
const API_BASE = "https://kont-backend-final.onrender.com/api";
const VERTICALS_WITH_SERIALS = [1, 2]; // 1: Teléfonos, 2: Tecnología

// =========================================================
// 1. EL CANDADO MÁGICO (Autenticación)
// =========================================================
function checkAuth() {
  const token = localStorage.getItem("agromedic_token");
  const isLoginPage = window.location.pathname.includes("login.html");

  if (!token && !isLoginPage) {
    window.location.replace("login.html");
  }
}
checkAuth();

function isSerialEnabled() {
  const userData = JSON.parse(localStorage.getItem("agromedic_user"));
  return VERTICALS_WITH_SERIALS.includes(Number(userData?.tenant_category_id));
}

// =========================================================
// 2. COMUNICADOR UNIVERSAL (API Fetch Blindado)
// =========================================================
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("agromedic_token");
  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    ...options
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    // Si el token expiró (401)
    if (response.status === 401 && !window.location.pathname.includes("login.html")) {
      localStorage.clear();
      window.location.replace("login.html");
      return;
    }

    // SI EL BACKEND BLOQUEA EL MÓDULO (403)
    if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Acceso denegado:", errorData.message);
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || data?.message || `Error HTTP ${response.status}`);
    
    return data;
  } catch (err) {
    console.error("Error en apiFetch:", err);
    throw err;
  }
}

// =========================================================
// 3. CARGA DE COMPONENTES (Layout)
// =========================================================
async function loadComponent(id, path) {
  const el = document.getElementById(id);
  if (!el) return;

  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
    const html = await res.text();
    el.innerHTML = html;
  } catch (err) {
    console.error("Error cargando componente:", id, err);
  }
}

// =========================================================
// 4. LÓGICA DEL MENÚ LATERAL (Sidebar & Mobile Toggle)
// =========================================================
function markActiveMenu() {
  const links = document.querySelectorAll(".menu-item");
  const currentPath = location.pathname.split("/").pop() || "dashboard.html";

  links.forEach(a => {
    const href = a.getAttribute("href");
    if (href) {
      const linkPath = href.split("/").pop();
      if (linkPath === currentPath) {
        a.classList.add("active");
        setTimeout(() => {
          a.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } else {
        a.classList.remove("active");
      }
    }
  });
}

function setupSidebarToggle() {
  const btn = document.getElementById("btn-toggle-sidebar");
  const btnClose = document.getElementById("btn-close-sidebar"); // NUEVO
  const sidebar = document.querySelector(".sidebar");
  const content = document.querySelector(".content");

  if (!sidebar || !content) return;

  // CREACIÓN DINÁMICA DEL OVERLAY PARA MÓVIL
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  // Función unificada para cerrar
  const closeSidebar = () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  };

  // Abrir / Colapsar
  if (btn) {
    btn.onclick = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        sidebar.classList.toggle("active");
        overlay.classList.toggle("active");
      } else {
        sidebar.classList.toggle("collapsed");
        content.classList.toggle("expanded");
      }
    };
  }

  // Cerrar con el botón X (solo móvil)
  if (btnClose) {
    btnClose.onclick = closeSidebar;
  }

  // Cerrar al hacer clic en el overlay (solo móvil)
  overlay.onclick = closeSidebar;
}

// =========================================================
// 5. LÓGICA DEL HEADER (Títulos y Datos del Usuario)
// =========================================================
function updateHeaderTitles() {
  const headerTitle = document.getElementById("header-page-title");
  const headerSubtitle = document.getElementById("header-page-subtitle");
  const activeMenuItem = document.querySelector(".sidebar-menu .menu-item.active");

  if (activeMenuItem && headerTitle) {
    const pageName = activeMenuItem.querySelector(".menu-text").textContent.trim();
    headerTitle.textContent = pageName;

    const saasPages = ["Dashboard SaaS", "Empresas (Tenants)", "Usuarios Globales", "Reportes de Uso", "Soporte Técnico"];
    
    if (saasPages.includes(pageName)) {
      headerSubtitle.textContent = "Centro de Comando Super Admin";
    } else if (pageName === "Auditoría") {
      headerSubtitle.textContent = "Trazabilidad y Seguridad del Sistema";
    } else if (pageName === "Dashboard") {
      headerSubtitle.textContent = "Resumen general de la empresa";
    } else if (["Insumos", "Productos", "Recetas", "Producción", "Compras"].includes(pageName)) {
      headerSubtitle.textContent = "Control Operativo e Inventario";
    } else if (["Pedidos", "Clientes", "Proveedores"].includes(pageName)) {
      headerSubtitle.textContent = "Gestión Comercial";
    } else if (["Cuentas por cobrar", "Cuentas por pagar", "Movimientos", "Bancos", "Pagos de Clientes", "Pagos a Proveedores"].includes(pageName)) {
      headerSubtitle.textContent = "Módulo de Finanzas";
    } else {
      headerSubtitle.textContent = "Módulo de Gestión";
    }
  }
}

function updateHeaderUserInfo() {
  const userData = localStorage.getItem("agromedic_user");
  if (userData) {
    const user = JSON.parse(userData);
    const userNameEl = document.querySelector(".user-name");
    const userAvatarEl = document.querySelector(".user-avatar");

    if (userNameEl) userNameEl.textContent = user.name;
    if (userAvatarEl) userAvatarEl.textContent = user.name.charAt(0).toUpperCase();
  }
}

// =========================================================
// 6. CERRAR SESIÓN (Logout)
// =========================================================
function setupLogout() {
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.onclick = async (e) => {
      e.preventDefault();
      await registrarActividad('SISTEMA', 'LOGOUT', 'El usuario cerró sesión voluntariamente');
      localStorage.clear();
      window.location.replace("login.html");
    };
  }
}

// =========================================================
// 7. MAGIA DE PERMISOS (Sincronizado con constants/roles.js)
// =========================================================
function applyRolePermissions() {
  const userData = localStorage.getItem("agromedic_user");
  if (!userData) return;

  const user = JSON.parse(userData);
  const role = user.role; // Ahora vendrá como SELLER, WAREHOUSE, ADMIN, etc.
  const isCoordinator = user.is_coordinator;
  const isActive = user.is_active; 
  
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");

  menuItems.forEach(item => {
    const textEl = item.querySelector(".menu-text");
    if(!textEl) return;
    const text = textEl.textContent.trim();
    let allowed = false;

    // 1. MODO DIOS
    if (role === "SUPER_ADMIN") {
      allowed = true;
    } 
    // 2. ADMIN DE MARCA (Acceso total menos cosas de dueños del SaaS)
    else if (role === "ADMIN") {
      const saasOnly = ["Dashboard SaaS", "Empresas (Tenants)", "Usuarios Globales", "Reportes de Uso", "Soporte Técnico"];
      allowed = !saasOnly.includes(text);
    } 
    // 3. ROLES OPERATIVOS
    else {
      // Bloqueo total de Auditoría y SaaS para roles menores
      const forbiddenGeneral = ["Dashboard SaaS", "Empresas (Tenants)", "Usuarios Globales", "Reportes de Uso", "Soporte Técnico", "Auditoría"];
      
      if (forbiddenGeneral.includes(text)) {
        allowed = false;
      } else if (text === "Contactar Soporte" || text === "Equipos (IMEI)") {
        allowed = true; 
      } 
      // VENDEDORES (Antes era SALES, ahora SELLER)
      else if (role === "SELLER" && ["Pedidos", "Clientes", "Cuentas por cobrar", "Pagos de Clientes", "Dashboard"].includes(text)) {
        allowed = true;
      } 
      // ALMACÉN (Antes era INVENTORY, ahora WAREHOUSE)
      else if (role === "WAREHOUSE" && ["Productos", "Artículos de Venta", "Insumos", "Inventario", "Recetas", "Kits y Combos", "Proveedores", "Producción", "Compras"].includes(text)) {
        allowed = true;
      } 
      // FINANZAS
      else if (role === "FINANCE" && ["Pagos de Clientes", "Pagos a Proveedores", "Cuentas por cobrar", "Cuentas por pagar", "Movimientos", "Bancos"].includes(text)) {
        allowed = true;
      } 
      // MARKETING (Solo si está activo)
      else if (role === "MARKETING" && ["Marketing", "Resultados", "Brand Book", "Buyer Persona", "Calendario Editorial", "Pauta Digital (Ads)", "Publicidad Offline", "Influencers & RR.PP.", "Solicitudes & Tareas"].includes(text)) {
        allowed = (isActive === true);
      }

      // El Dashboard principal requiere ser coordinador si no eres Admin
      if (text === "Dashboard" && !allowed) allowed = isCoordinator;
    }

    item.style.display = allowed ? "flex" : "none";
  });

  // Limpieza: Si una sección se queda sin hijos visibles, la ocultamos
  rehideEmptySections();
}

/**
 * Función auxiliar para limpiar títulos de sección vacíos
 */
function rehideEmptySections() {
  const sections = document.querySelectorAll(".sidebar-menu .menu-section");
  sections.forEach(section => {
    let hasVisibleItems = false;
    let nextEl = section.nextElementSibling;
    while (nextEl && !nextEl.classList.contains("menu-section")) {
      if (nextEl.classList.contains("menu-item") && nextEl.style.display !== "none") {
        hasVisibleItems = true;
        break;
      }
      nextEl = nextEl.nextElementSibling;
    }
    section.style.display = hasVisibleItems ? "block" : "none";
  });
}

// =========================================================
// 8. PERSONALIZACIÓN POR CATEGORÍA (Verticales)
// =========================================================
function applyCategoryCustomization() {
  const userData = localStorage.getItem("agromedic_user");
  if (!userData) return;

  const user = JSON.parse(userData);
  const catId = Number(user.tenant_category_id);
  
  if (user.role === "SUPER_ADMIN") return;

  const hasTechModules = [1].includes(catId); 
  const hasRecipes = [1, 4, 5].includes(catId); 
  const isServiceOnly = [6].includes(catId); 
  const isRetail = [1, 2].includes(catId); 

  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");

  menuItems.forEach(item => {
    const textEl = item.querySelector(".menu-text");
    if (!textEl) return;
    const text = textEl.textContent.trim();

    if (["Equipos Recibidos", "IMEIs", "Equipos (IMEI)"].includes(text)) {
      item.style.display = hasTechModules ? "flex" : "none";
    }

    if (text === "Recetas") {
      item.style.display = hasRecipes ? "flex" : "none";
      if (isRetail && catId === 1) textEl.textContent = "Kits y Combos";
    }

    if (isRetail) {
      if (text === "Productos") textEl.textContent = "Artículos de Venta";
      if (text === "Insumos") textEl.textContent = "Inventario";
      if (text === "Producción") item.style.display = "none";
    }

    if (isServiceOnly) {
      const physicalStuff = ["Insumos", "Productos", "Recetas", "Producción", "Proveedores", "Compras", "Equipos Recibidos", "IMEIs"];
      if (physicalStuff.includes(text)) item.style.display = "none";
    }
  });

  document.querySelectorAll(".menu-section").forEach(section => {
    let hasVisible = false;
    let next = section.nextElementSibling;
    while (next && !next.classList.contains("menu-section")) {
      if (next.classList.contains("menu-item") && next.style.display !== "none") {
        hasVisible = true;
        break;
      }
      next = next.nextElementSibling;
    }
    section.style.display = hasVisible ? "block" : "none";
  });
}

// =========================================================
// 9. AYUDANTES UNIVERSALES (Money, Date, Audit)
// =========================================================

// Formateo de moneda (USD)
const money = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * LÓGICA DINÁMICA DE ICONOS (Personalización Kont)
 * Retorna el icono según el método de pago. 
 * Si es un teléfono recibido, activa la vibración.
 */
const getIconForMethod = (metodo, tipo) => {
    const isIngreso = tipo === 'INGRESO';
    
    // Si el método es equipo usado (puedes añadir más variantes si usas otros nombres en DB)
    if (metodo === 'EQUIPO_USADO' || metodo === 'TELEFONO_PARTE_PAGO') {
        return `<i class="bi bi-phone-vibrate vibrate-icon" title="Equipo recibido"></i>`;
    }

    // Iconos por defecto: Flecha abajo para entrada, flecha arriba para salida
    return isIngreso 
        ? `<i class="bi bi-arrow-down-circle-fill text-success"></i>` 
        : `<i class="bi bi-arrow-up-circle-fill text-danger"></i>`;
};

const formatDateStatus = (dateStr) => {
    if (!dateStr) return `<span class="badge-date">-</span>`;
    const due = new Date(dateStr); const today = new Date(); 
    due.setHours(0,0,0,0); today.setHours(0,0,0,0);
    const formatted = due.toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' });
    return due < today 
        ? `<span class="badge-date overdue" title="Vencida"><i class="bi bi-exclamation-triangle-fill"></i> ${formatted}</span>`
        : `<span class="badge-date"><i class="bi bi-calendar"></i> ${formatted}</span>`;
};

async function registrarActividad(modulo, accion, descripcion) {
  try {
    const user = JSON.parse(localStorage.getItem("agromedic_user"));
    if (!user) return;

    await apiFetch("/audit/save", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: user.tenant_id,
        user_id: user.id,
        user_name: user.name,
        module: modulo,
        action: accion,
        description: descripcion
      })
    });
  } catch (err) { console.error("Error auditoría:", err); }
}


// =========================================================
// 10. INICIALIZACIÓN MAESTRA
// =========================================================
async function initLayout() {
  const isLoginPage = window.location.pathname.includes("login.html");
  if (isLoginPage) return;

  // Carga de componentes base
  await loadComponent("sidebar", "../components/sidebar.html");
  await loadComponent("header", "../components/header.html");

  // Configuración de UI y Seguridad
  applyRolePermissions();
  applyCategoryCustomization(); 
  markActiveMenu();
  updateHeaderTitles();
  setupSidebarToggle(); 
  updateHeaderUserInfo();
  setupLogout();

  // --- INICIALIZACIÓN DE ALERTAS ---
  setupAlertsToggle(); 
  refreshHeaderAlerts(); 
}

// =========================================================
// 11. SISTEMA DE ALERTAS (Notificaciones de Impacto)
// =========================================================

/**
 * Consulta las alertas al backend y actualiza la UI del Header
 */
async function refreshHeaderAlerts() {
    const listContainer = document.getElementById("alerts-list-container");
    const badge = document.getElementById("alerts-badge");
    if (!listContainer) return;

    try {
        // CORRECCIÓN 1: La ruta correcta es /alerts (sin el /all)
        const res = await apiFetch("/alerts"); 
        
        // CORRECCIÓN 2: Tu backend devuelve directamente el array, no un objeto { data: [...] }
        const alertas = Array.isArray(res) ? res : (res.data || []);

        // Contar solo las que no han sido resueltas
        const activas = alertas.filter(a => a.status === 'PENDING').length;
        
        if (badge) {
            badge.textContent = activas > 99 ? '99+' : activas; // Un toque profesional por si tienes muchas
            badge.style.display = activas > 0 ? "flex" : "none";
        }

        // Renderizado de la lista
        if (alertas.length === 0) {
            listContainer.innerHTML = `<p style="padding:20px; text-align:center; color:#94a3b8; font-size:0.8rem;">No hay notificaciones pendientes ✨</p>`;
            return;
        }

        // CORRECCIÓN 3: Agregamos un botón para marcar como leída
        listContainer.innerHTML = alertas.map(a => `
            <div class="alert-item-mini ${a.status === 'RESOLVED' ? 'resolved' : ''}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                    <i class="${getAlertIconByType(a.tipo)}" style="font-size: 1.2rem;"></i>
                    <div class="info-text">
                        <b style="font-size: 0.85rem; display: block;">${a.titulo}</b>
                        <span style="font-size: 0.75rem; color: #666;">${a.mensaje}</span>
                    </div>
                </div>
                ${a.status === 'PENDING' ? `
                <button onclick="resolveAlertFrontend(${a.id}, event)" style="background: none; border: none; color: #10b981; cursor: pointer; padding: 5px;" title="Marcar como leída">
                    <i class="bi bi-check2-circle" style="font-size: 1.2rem;"></i>
                </button>
                ` : ''}
            </div>
        `).join('');

    } catch (err) {
        console.error("Error al cargar alertas del sistema:", err);
        listContainer.innerHTML = `<p style="padding:15px; font-size:0.7rem; color:red; text-align:center;">Error al conectar con notificaciones.</p>`;
    }
}

/**
 * Función para marcar una alerta como leída desde el frontend
 */
window.resolveAlertFrontend = async (alertId, event) => {
    // Evita que el dropdown se cierre al hacer clic en el check
    if(event) event.stopPropagation(); 
    
    try {
        await apiFetch(`/alerts/${alertId}/resolve`, "PUT");
        // Refrescamos la lista para que desaparezca o cambie de estado
        refreshHeaderAlerts();
    } catch (error) {
        console.error("Error al resolver alerta:", error);
        alert("No se pudo marcar la alerta como leída.");
    }
};

/**
 * Configura los eventos de clic para el dropdown de alertas
 */
function setupAlertsToggle() {
    const btn = document.getElementById("btn-open-alerts");
    const dropdown = document.getElementById("alerts-dropdown");

    if (btn && dropdown) {
        btn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("active");
            // Si lo abrimos, refrescamos para tener lo último
            if (dropdown.classList.contains("active")) refreshHeaderAlerts();
        };

        // Cerrar al hacer clic en cualquier otra parte de la pantalla
        document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn) {
                dropdown.classList.remove("active");
            }
        });
    }
}

/**
 * Helper para asignar iconos según el tipo de alerta (Ajustado a los tipos reales de tu BD)
 */
function getAlertIconByType(tipo) {
    const icons = {
        'STOCK_PRODUCTO': 'bi bi-box-seam-fill text-danger',
        'PAGO_PROVEEDOR': 'bi bi-calendar-x-fill text-warning',
        'SOPORTE': 'bi bi-headset text-primary',
        'SISTEMA': 'bi bi-gear-fill text-secondary'
    };
    return icons[tipo] || 'bi bi-bell-fill text-primary';
}

document.addEventListener("DOMContentLoaded", initLayout);