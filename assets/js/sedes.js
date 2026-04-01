// assets/js/sedes.js

const API_BRANCHES = `${API_BASE}/branches`;

let branches = [];
let editingId = null;

// ── Al cargar ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", loadBranches);

// ── Cargar sedes ──────────────────────────────────────
async function loadBranches() {
  try {
    const res = await apiFetch("/branches");
    if (!res) return;
    const data = await res.json();
    branches = data.data || [];
    renderBranches();
    updatePlanBanner();
  } catch (err) {
    console.error("Error cargando sedes:", err);
    document.getElementById("branches-grid").innerHTML = `
      <div class="empty-state">
        <i class="bi bi-exclamation-circle"></i>
        <p>No se pudieron cargar las sedes.</p>
      </div>`;
  }
}

// ── Render de tarjetas ────────────────────────────────
function renderBranches() {
  const grid = document.getElementById("branches-grid");

  if (!branches.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <i class="bi bi-buildings"></i>
        <p style="font-size:1rem; font-weight:500; color:#334155;">Aún no tienes sedes creadas</p>
        <p style="font-size:0.85rem;">Crea tu primera sede para organizar a tu equipo por ubicación.</p>
      </div>`;
    return;
  }

  grid.innerHTML = branches.map(b => `
    <div class="branch-card ${b.is_active ? "" : "inactive"}">
      <div class="branch-name">
        <i class="bi bi-geo-alt-fill" style="color:#3b82f6; margin-right:6px;"></i>${b.name}
      </div>
      <div class="branch-info">
        ${b.address ? `<span><i class="bi bi-map"></i>${b.address}</span>` : ""}
        ${b.phone ? `<span><i class="bi bi-telephone"></i>${b.phone}</span>` : ""}
        ${!b.address && !b.phone ? `<span style="color:#cbd5e1;">Sin información de contacto</span>` : ""}
      </div>
      <div class="branch-meta">
        <span class="badge-users"><i class="bi bi-people" style="margin-right:4px;"></i>${b.user_count || 0} usuario${b.user_count != 1 ? "s" : ""}</span>
        <span class="${b.is_active ? "badge-active" : "badge-inactive"}">${b.is_active ? "Activa" : "Inactiva"}</span>
      </div>
      <div class="branch-actions">
        <button class="btn-icon" onclick="editBranch(${b.id})">
          <i class="bi bi-pencil"></i> Editar
        </button>
        ${b.is_active ? `
          <button class="btn-icon danger" onclick="confirmDeactivate(${b.id}, '${b.name.replace(/'/g, "\\'")}')">
            <i class="bi bi-slash-circle"></i> Desactivar
          </button>` : ""}
      </div>
    </div>
  `).join("");
}

// ── Banner de plan ────────────────────────────────────
function updatePlanBanner() {
  const banner = document.getElementById("plan-banner");
  const text = document.getElementById("plan-text");

  // Intentamos leer el plan del token (no está ahí), así que mostramos conteo
  const total = branches.length;
  banner.style.display = "flex";
  text.innerHTML = `Tienes <span>${total}</span> sede${total !== 1 ? "s" : ""} creada${total !== 1 ? "s" : ""}. Si llegas al límite de tu plan, necesitarás actualizar para agregar más.`;
}

// ── Modal abrir/cerrar ────────────────────────────────
function openModal() {
  editingId = null;
  document.getElementById("modal-title").textContent = "Nueva Sede";
  document.getElementById("branch-name").value = "";
  document.getElementById("branch-address").value = "";
  document.getElementById("branch-phone").value = "";
  document.getElementById("branch-id").value = "";
  document.getElementById("modal-error").style.display = "none";
  document.getElementById("branch-modal").classList.add("open");
  document.getElementById("branch-name").focus();
}

function closeModal() {
  document.getElementById("branch-modal").classList.remove("open");
}

// ── Editar ─────────────────────────────────────────────
function editBranch(id) {
  const branch = branches.find(b => b.id === id);
  if (!branch) return;
  editingId = id;
  document.getElementById("modal-title").textContent = "Editar Sede";
  document.getElementById("branch-name").value = branch.name;
  document.getElementById("branch-address").value = branch.address || "";
  document.getElementById("branch-phone").value = branch.phone || "";
  document.getElementById("branch-id").value = id;
  document.getElementById("modal-error").style.display = "none";
  document.getElementById("branch-modal").classList.add("open");
  document.getElementById("branch-name").focus();
}

// ── Guardar (crear o editar) ──────────────────────────
async function saveBranch() {
  const name    = document.getElementById("branch-name").value.trim();
  const address = document.getElementById("branch-address").value.trim();
  const phone   = document.getElementById("branch-phone").value.trim();
  const errorEl = document.getElementById("modal-error");
  const btn     = document.getElementById("btn-save-branch");

  if (!name) {
    errorEl.textContent = "El nombre de la sede es obligatorio.";
    errorEl.style.display = "block";
    return;
  }

  errorEl.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    const body = { name, address: address || null, phone: phone || null };
    let res;

    if (editingId) {
      res = await apiFetch(`/branches/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      res = await apiFetch("/branches", { method: "POST", body: JSON.stringify(body) });
    }

    if (!res) { btn.disabled = false; btn.textContent = "Guardar"; return; }

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || "No se pudo guardar la sede.";
      errorEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Guardar";
      return;
    }

    closeModal();
    await loadBranches();
    if (typeof showToast === "function") showToast(editingId ? "Sede actualizada." : "Sede creada exitosamente.", "success");

  } catch (err) {
    errorEl.textContent = "Error de conexión. Intenta de nuevo.";
    errorEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar";
  }
}

// ── Desactivar ────────────────────────────────────────
async function confirmDeactivate(id, name) {
  if (!confirm(`¿Desactivar la sede "${name}"?\n\nNo se podrá usar para asignar usuarios. Los usuarios ya asignados permanecen.`)) return;

  try {
    const res = await apiFetch(`/branches/${id}`, { method: "DELETE" });
    if (!res) return;

    const data = await res.json();
    if (!res.ok) {
      if (typeof showToast === "function") showToast(data.error, "error");
      else alert(data.error);
      return;
    }

    await loadBranches();
    if (typeof showToast === "function") showToast("Sede desactivada.", "warning");
  } catch (err) {
    console.error("Error al desactivar:", err);
  }
}

// Cerrar modal al hacer clic fuera
document.getElementById("branch-modal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

// Enter para guardar
document.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && document.getElementById("branch-modal").classList.contains("open")) {
    saveBranch();
  }
  if (e.key === "Escape") closeModal();
});
