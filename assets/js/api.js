// assets/js/api.js
// CLIENTE HTTP CENTRALIZADO — con soporte para Refresh Token

const API_BASE = "https://kont-backend-final.onrender.com/api";

async function apiFetch(endpoint, options = {}) {
  // Obtenemos el token de acceso actual
  let token = localStorage.getItem("agromedic_token");

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config = {
    ...options,
    headers: { ...defaultHeaders, ...(options.headers || {}) },
  };

  try {
    let response = await fetch(`${API_BASE}${endpoint}`, config);

    // --- LÓGICA DE REFRESH TOKEN SI EL ACCESS TOKEN EXPIRÓ (401) ---
    if (response.status === 401) {
      const refreshToken = localStorage.getItem("agromedic_refresh_token");

      if (refreshToken) {
        console.warn("Access token expirado. Intentando renovar con refresh token...");
        
        try {
          // Intentamos obtener un nuevo access token del backend
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.token;

            // Guardamos el nuevo token
            localStorage.setItem("agromedic_token", newToken);
            console.log("✅ Token renovado exitosamente.");

            // Re-intentamos la petición original con el nuevo token
            config.headers["Authorization"] = `Bearer ${newToken}`;
            return fetch(`${API_BASE}${endpoint}`, config);
          }
        } catch (refreshErr) {
          console.error("Error crítico al intentar renovar sesión:", refreshErr);
        }
      }

      // Si llegamos aquí es porque no había refresh token, el backend lo rechazó, 
      // o hubo un error de red en el proceso de renovación.
      console.warn("No se pudo renovar la sesión. Redirigiendo al login...");
      localStorage.clear();
      setTimeout(() => { window.location.href = "/pages/login.html"; }, 300);
      return null;
    }
    // --- FIN LÓGICA REFRESH ---

    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      console.warn("Acceso denegado:", data.error || data.message);
      if (typeof showToast === "function") showToast("No tienes permisos para esta acción.", "error");
      return null;
    }

    if (!response.ok && response.status >= 500) {
      console.error("Error del servidor:", response.status);
      if (typeof showToast === "function") showToast("Error del servidor. Intenta de nuevo.", "error");
      return null;
    }

    return response;
  } catch (networkError) {
    console.error("Error de red:", networkError.message);
    if (typeof showToast === "function") showToast("Sin conexión con el servidor.", "error");
    return null;
  }
}

const api = {
  get:    (endpoint)       => apiFetch(endpoint, { method: "GET" }),
  post:   (endpoint, body) => apiFetch(endpoint, { method: "POST",   body: JSON.stringify(body) }),
  put:    (endpoint, body) => apiFetch(endpoint, { method: "PUT",    body: JSON.stringify(body) }),
  delete: (endpoint)       => apiFetch(endpoint, { method: "DELETE" }),
};

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
    background: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border};
    padding: 12px 20px; border-radius: 8px; font-size: 14px; font-family: sans-serif;
    max-width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

window.api = api;
window.showToast = showToast;