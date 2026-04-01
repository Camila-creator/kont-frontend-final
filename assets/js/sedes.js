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
        
        // Si res ya es el objeto de datos (depende de tu apiFetch en main.js)
        // Probamos obtener data.data directamente
        branches = res.data || [];
        renderBranches();
        updatePlanBanner();
    } catch (err) {
        console.error("Error cargando sedes:", err);
        const grid = document.getElementById("branches-grid");
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-exclamation-circle" style="font-size: 2rem; color: #ef4444;"></i>
                    <p>No se pudieron cargar las sedes. Verifica tu conexión.</p>
                </div>`;
        }
    }
}

// ── Render de tarjetas ────────────────────────────────
function renderBranches() {
    const grid = document.getElementById("branches-grid");
    if (!grid) return;

    if (!branches.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; padding: 40px; text-align: center;">
                <i class="bi bi-buildings" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px; display: block;"></i>
                <p style="font-size: 1.1rem; font-weight: 600; color: #334155;">Aún no tienes sedes creadas</p>
                <p style="color: #64748b;">Crea tu primera sede para organizar a tu equipo por ubicación.</p>
            </div>`;
        return;
    }

    grid.innerHTML = branches.map(b => `
        <div class="branch-card ${b.is_active ? "" : "inactive"}">
            <div class="branch-name">
                <i class="bi bi-geo-alt-fill" style="color:#3b82f6; margin-right:8px;"></i>
                ${b.name}
            </div>
            <div class="branch-info">
                ${b.address ? `<span><i class="bi bi-map"></i>${b.address}</span>` : ""}
                ${b.phone ? `<span><i class="bi bi-telephone"></i>${b.phone}</span>` : ""}
                ${!b.address && !b.phone ? `<span style="color:#cbd5e1; font-style: italic;">Sin información de contacto</span>` : ""}
            </div>
            <div class="branch-meta" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span style="font-size: 0.8rem; color: #64748b;">
                    <i class="bi bi-people" style="margin-right:4px;"></i>${b.user_count || 0} usuario${b.user_count != 1 ? "s" : ""}
                </span>
                <span class="${b.is_active ? "badge-active" : "badge-inactive"}">
                    ${b.is_active ? "Activa" : "Inactiva"}
                </span>
            </div>
            <div class="branch-actions">
                <button class="btn-icon" onclick="editBranch(${b.id})" style="background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #475569;">
                    <i class="bi bi-pencil"></i> Editar
                </button>
                ${b.is_active ? `
                    <button class="btn-icon danger" onclick="confirmDeactivate(${b.id}, '${b.name.replace(/'/g, "\\'")}')" style="background: #fee2e2; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #dc2626; margin-left: auto;">
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
    if (!banner || !text) return;

    const total = branches.length;
    banner.style.display = "flex";
    text.innerHTML = `Tienes <span>${total}</span> sede${total !== 1 ? "s" : ""} creada${total !== 1 ? "s" : ""}.`;
}

// ── Modal abrir/cerrar ────────────────────────────────
function openModal() {
    editingId = null;
    const modal = document.getElementById("branch-modal");
    const title = document.getElementById("modal-title");
    const errorEl = document.getElementById("modal-error");

    if (title) title.textContent = "Nueva Sede";
    if (errorEl) errorEl.style.display = "none";

    document.getElementById("branch-name").value = "";
    document.getElementById("branch-address").value = "";
    document.getElementById("branch-phone").value = "";
    document.getElementById("branch-id").value = "";

    modal.classList.add("open");
    setTimeout(() => document.getElementById("branch-name").focus(), 100);
}

function closeModal() {
    const modal = document.getElementById("branch-modal");
    if (modal) modal.classList.remove("open");
}

// ── Editar ─────────────────────────────────────────────
function editBranch(id) {
    const branch = branches.find(b => b.id === id);
    if (!branch) return;

    editingId = id;
    const modal = document.getElementById("branch-modal");
    const title = document.getElementById("modal-title");
    const errorEl = document.getElementById("modal-error");

    if (title) title.textContent = "Editar Sede";
    if (errorEl) errorEl.style.display = "none";

    document.getElementById("branch-name").value = branch.name;
    document.getElementById("branch-address").value = branch.address || "";
    document.getElementById("branch-phone").value = branch.phone || "";
    document.getElementById("branch-id").value = id;

    modal.classList.add("open");
}

// ── Guardar (crear o editar) ──────────────────────────
async function saveBranch() {
    const name = document.getElementById("branch-name").value.trim();
    const address = document.getElementById("branch-address").value.trim();
    const phone = document.getElementById("branch-phone").value.trim();
    const errorEl = document.getElementById("modal-error");
    const btn = document.getElementById("btn-save-branch");

    if (!name) {
        if (errorEl) {
            errorEl.textContent = "El nombre de la sede es obligatorio.";
            errorEl.style.display = "block";
        }
        return;
    }

    if (errorEl) errorEl.style.display = "none";
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.textContent = "Guardando...";

    try {
        const body = { name, address: address || null, phone: phone || null };
        const method = editingId ? "PUT" : "POST";
        const endpoint = editingId ? `/branches/${editingId}` : "/branches";

        const res = await apiFetch(endpoint, { 
            method, 
            body: JSON.stringify(body) 
        });

        // Si apiFetch falla o lanza error, ya se maneja en el catch o devuelve null
        if (!res || res.error) {
            throw new Error(res?.error || "Error al guardar");
        }

        closeModal();
        await loadBranches();
        if (typeof showToast === "function") {
            showToast(editingId ? "Sede actualizada." : "Sede creada exitosamente.", "success");
        }

    } catch (err) {
        if (errorEl) {
            errorEl.textContent = err.message || "Error al conectar con el servidor.";
            errorEl.style.display = "block";
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ── Desactivar ────────────────────────────────────────
async function confirmDeactivate(id, name) {
    if (!confirm(`¿Desactivar la sede "${name}"?\n\nNo se podrá usar para asignar usuarios. Los usuarios ya asignados permaneceren.`)) return;

    try {
        const res = await apiFetch(`/branches/${id}`, { method: "DELETE" });
        
        if (res && res.error) {
            if (typeof showToast === "function") showToast(res.error, "error");
            else alert(res.error);
            return;
        }

        await loadBranches();
        if (typeof showToast === "function") showToast("Sede desactivada.", "warning");
    } catch (err) {
        console.error("Error al desactivar:", err);
    }
}

// ── Event Listeners ───────────────────────────────────

// Cerrar modal al hacer clic fuera de la tarjeta (en el overlay)
document.getElementById("branch-modal").addEventListener("click", function(e) {
    if (e.target === this) closeModal();
});

// Teclas rápidas
document.addEventListener("keydown", function(e) {
    const modal = document.getElementById("branch-modal");
    if (modal && modal.classList.contains("open")) {
        if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
            saveBranch();
        }
        if (e.key === "Escape") {
            closeModal();
        }
    }
});