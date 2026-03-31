// assets/js/api.js
// Cliente HTTP centralizado para Kont Frontend
// Maneja token, sesión expirada y errores globales

const API_BASE = "https://kont-backend-final.onrender.com/api";

/**
 * Función base para todas las peticiones al backend.
 * Agrega el token automáticamente y maneja el 401 (sesión expirada).
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    // INTERCEPTOR 401 — sesión expirada o token inválido
    if (response.status === 401) {
      console.warn("Sesión expirada. Redirigiendo al login...");
      localStorage.clear();
      // Pequeño delay para que el usuario vea el mensaje si hay uno
      setTimeout(() => {
        window.location.href = "/pages/login.html";
      }, 300);
      return null;
    }

    // INTERCEPTOR 403 — sin permisos
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      console.warn("Acceso denegado:", data.error || data.message);
      showToast("No tienes permisos para realizar esta acción.", "error");
      return null;
    }

    // Error del servidor
    if (!response.ok && response.status >= 500) {
      console.error("Error del servidor:", response.status);
      showToast("Error del servidor. Intenta de nuevo.", "error");
      return null;
    }

    return response;

  } catch (networkError) {
    console.error("Error de red:", networkError.message);
    showToast("Sin conexión con el servidor. Verifica tu internet.", "error");
    return null;
  }
}

/**
 * Helpers de conveniencia
 */
const api = {
  get: (endpoint) =>
    apiFetch(endpoint, { method: "GET" }),

  post: (endpoint, body) =>
    apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint, body) =>
    apiFetch(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (endpoint) =>
    apiFetch(endpoint, { method: "DELETE" }),
};

/**
 * Toast de notificación ligero (sin dependencias)
 * Muestra un mensaje flotante por 3 segundos
 */
function showToast(message, type = "info") {
  const existing = document.getElementById("kont-toast");
  if (existing) existing.remove();

  const colors = {
    info:    { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
    success: { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
    error:   { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
    warning: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  };

  const c = colors[type] || colors.info;

  const toast = document.createElement("div");
  toast.id = "kont-toast";
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: ${c.bg}; color: ${c.text};
    border: 1px solid ${c.border};
    padding: 12px 20px; border-radius: 8px;
    font-size: 14px; font-family: sans-serif;
    max-width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    animation: fadeInUp 0.2s ease;
  `;
  toast.textContent = message;

  const style = document.createElement("style");
  style.textContent = `@keyframes fadeInUp { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }`;
  document.head.appendChild(style);

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Exportar para uso en otros scripts
window.api = api;
window.showToast = showToast;
