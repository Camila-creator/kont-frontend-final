// frontend/assets/js/api.js
const API_BASE = "https://kont-backend-final.onrender.com/api";

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (data && data.error) ? data.error : `Error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}