/**
 * main.js - Núcleo de Lógica del Frontend Agromedic
 * Versión: 2.2 (Soporte Hybrid Mobile-First)
 */

// =========================================================
// 0. CONFIGURACIÓN GLOBAL Y ESTADO
// =========================================================
const API_BASE = "http://localhost:4000/api";
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
// 7. MAGIA DE PERMISOS (MODO DIOS Y FILTRADO ACTIVO)
// =========================================================
function applyRolePermissions() {
  const userData = localStorage.getItem("agromedic_user");
  if (!userData) return;

  const user = JSON.parse(userData);
  const role = user.role;
  const isCoordinator = user.is_coordinator;
  const isActive = user.is_active; 
  
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");

  menuItems.forEach(item => {
    const textEl = item.querySelector(".menu-text");
    if(!textEl) return;
    const text = textEl.textContent.trim();
    let allowed = false;

    if (role === "SUPER_ADMIN") {
      allowed = true;
    } 
    else if (role === "ADMIN_BRAND") {
      const forbiddenForBrand = ["Dashboard SaaS", "Empresas (Tenants)", "Usuarios Globales", "Reportes de Uso", "Soporte Técnico"];
      allowed = !forbiddenForBrand.includes(text);
    } 
    else {
      const saasItems = ["Dashboard SaaS", "Empresas (Tenants)", "Usuarios Globales", "Reportes de Uso", "Soporte Técnico", "Auditoría"];
      
      if (saasItems.includes(text)) {
        allowed = false;
      } else if (text === "Contactar Soporte" || text === "Equipos (IMEI)") {
        allowed = true; 
      } else if (role === "SALES" && ["Pedidos", "Clientes", "Cuentas por cobrar", "Pagos de Clientes"].includes(text)) {
        allowed = true;
      } else if (role === "INVENTORY" && ["Productos", "Insumos", "Recetas", "Proveedores", "Producción", "Compras"].includes(text)) {
        allowed = true;
      } else if (role === "FINANCE" && ["Pagos de Clientes", "Pagos a Proveedores", "Cuentas por cobrar", "Cuentas por pagar", "Movimientos", "Bancos"].includes(text)) {
        allowed = true;
      } else if (role === "MARKETING" && ["Marketing", "Resultados", "Brand Book", "Buyer Persona", "Calendario Editorial", "Pauta Digital (Ads)", "Publicidad Offline", "Influencers & RR.PP.", "Solicitudes & Tareas"].includes(text)) {
        allowed = (isActive === true);
      }

      if (text === "Dashboard") allowed = isCoordinator;
    }

    item.style.display = allowed ? "flex" : "none";
  });

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
const money = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  await loadComponent("sidebar", "../components/sidebar.html");
  await loadComponent("header", "../components/header.html");

  applyRolePermissions();
  applyCategoryCustomization(); 
  markActiveMenu();
  updateHeaderTitles();
  setupSidebarToggle(); // <--- Aquí se activa la magia del Overlay
  updateHeaderUserInfo();
  setupLogout();
}

document.addEventListener("DOMContentLoaded", initLayout);