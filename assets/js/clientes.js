// frontend/assets/js/clientes.js
const API_CUSTOMERS = `${API_BASE}/customers`;

const tableBody = document.querySelector("#clients-table tbody");
const btnNew = document.getElementById("btn-new-client");
const searchInput = document.getElementById("client-search");
const modal = document.getElementById("client-modal");
const modalTitle = document.getElementById("client-modal-title");
const form = document.getElementById("client-form");

const inputId = document.getElementById("client-id"); const inputName = document.getElementById("client-name"); const inputType = document.getElementById("client-type"); const inputDoc = document.getElementById("client-doc"); const inputPhone = document.getElementById("client-phone"); const inputEmail = document.getElementById("client-email"); const inputLocation = document.getElementById("client-location"); const inputAddress = document.getElementById("client-address"); const inputTerms = document.getElementById("client-terms"); const inputWholesaleMin = document.getElementById("client-wholesale-min"); const inputNotes = document.getElementById("client-notes"); const btnCancel = document.getElementById("client-cancel");

let customers = [];

function safeText(v) { return (v ?? "").toString().trim(); }
function toInt(v, def = 0) { const n = Number.parseInt(v, 10); return Number.isNaN(n) ? def : n; }

async function apiFetch(url, opts = {}) {
  const token = localStorage.getItem("agromedic_token");
  const res = await fetch(url, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(opts.headers || {}) }, ...opts });
  if (res.status === 401 || res.status === 403) { localStorage.removeItem("agromedic_token"); window.location.replace("../pages/login.html"); return; }
  let data = null; try { data = await res.json(); } catch { data = null; }
  if (!res.ok) throw new Error(data?.message || `Error HTTP ${res.status}`);
  return data;
}

function renderTable() {
    if (!tableBody) return; 
    tableBody.innerHTML = ""; 
    const term = safeText(searchInput.value).toLowerCase();
    
    const filtered = customers.filter(c => { 
        return safeText(c.name).toLowerCase().includes(term) || 
               safeText(c.doc).toLowerCase().includes(term) || 
               safeText(c.location).toLowerCase().includes(term); 
    });

    if (!filtered.length) { 
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center; color:#64748b;">No hay clientes.</td></tr>`; 
        return; 
    }

    filtered.forEach((c) => {
        const tr = document.createElement("tr"); 
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        const typeBadge = c.type === "MAYORISTA" 
            ? '<span class="badge badge-mayor">Mayorista</span>' 
            : '<span class="badge badge-retail">Detal</span>';
        
        const termsBadge = c.terms === "CREDITO" 
            ? '<span class="badge badge-credito">Crédito</span>' 
            : '<span class="badge badge-contado">Contado</span>';

        tr.innerHTML = `
            <td data-label="ID" style="padding:15px; font-weight:700; color:#94a3b8;">#${c.id}</td>
            <td data-label="Nombre" style="padding:15px; font-weight:700; color:#1e293b;">${safeText(c.name)}</td>
            <td data-label="Tipo" style="padding:15px; text-align:center;">${typeBadge}</td>
            <td data-label="Documento" style="padding:15px; color:#475569; font-weight:600;">${safeText(c.doc) || "-"}</td>
            <td data-label="Contacto" style="padding:15px;">
                <div class="contact-cell">
                    <span><i class="bi bi-telephone"></i> ${safeText(c.phone) || ""}</span>
                    <span><i class="bi bi-geo-alt"></i> ${safeText(c.location) || ""}</span>
                </div>
            </td>
            <td data-label="Condición" style="padding:15px; text-align:center;">${termsBadge}</td>
            <td style="padding:15px;">
                <div class="table-actions">
                    <button class="btn-icon btn-edit" data-action="edit" data-id="${c.id}"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn-icon btn-del" data-action="delete" data-id="${c.id}"><i class="bi bi-trash"></i></button>
                </div>
            </td>`;
        tableBody.appendChild(tr);
    });

    // Re-vincular eventos
    tableBody.querySelectorAll("button[data-action]").forEach((btn) => { 
        btn.onclick = () => { 
            const id = Number(btn.getAttribute("data-id")); 
            const c = customers.find(x => x.id === id); 
            if (btn.getAttribute("data-action") === "edit") openEdit(c); 
            else onDelete(id); 
        }; 
    });
}

async function refresh() { const res = await apiFetch(API_CUSTOMERS); customers = Array.isArray(res?.data) ? res.data : []; renderTable(); }

function openEdit(c) { modalTitle.textContent = "Editar Cliente"; inputId.value = c.id; inputName.value = c.name || ""; inputType.value = c.type || ""; inputDoc.value = c.doc || ""; inputPhone.value = c.phone || ""; inputEmail.value = c.email || ""; inputLocation.value = c.location || ""; inputAddress.value = c.address || ""; inputTerms.value = c.terms || "CONTADO"; inputWholesaleMin.value = c.wholesale_min ?? c.wholesaleMin ?? "6"; inputNotes.value = c.notes || ""; modal.classList.remove("hidden"); }
function onDelete(id) { const c = customers.find(x => x.id === id); openConfirm({ title: "Eliminar Cliente", message: `¿Seguro que quieres eliminar a "${c.name}"?` }).then(ok => { if(ok) { apiFetch(`${API_CUSTOMERS}/${id}`, { method: "DELETE" }).then(() => refresh()); } }); }

let confirmResolver = null;
function openConfirm({title, message}) { document.getElementById("confirm-title").textContent = title; document.getElementById("confirm-message").textContent = message; document.getElementById("confirm-modal").classList.remove("hidden"); return new Promise(res => { confirmResolver = res; }); }
document.getElementById("confirm-ok").onclick = () => { confirmResolver(true); document.getElementById("confirm-modal").classList.add("hidden"); }; document.getElementById("confirm-cancel").onclick = () => { confirmResolver(false); document.getElementById("confirm-modal").classList.add("hidden"); };
function openAlert({title, message}) { document.getElementById("alert-title").textContent = title; document.getElementById("alert-message").textContent = message; document.getElementById("alert-modal").classList.remove("hidden"); }
document.getElementById("alert-ok").onclick = () => document.getElementById("alert-modal").classList.add("hidden");

document.addEventListener("DOMContentLoaded", () => {
  refresh();
  btnNew.onclick = () => { form.reset(); inputId.value = ""; modalTitle.textContent = "Nuevo Cliente"; modal.classList.remove("hidden"); };
  btnCancel.onclick = () => modal.classList.add("hidden"); searchInput.oninput = renderTable;
  form.onsubmit = async (e) => {
      e.preventDefault(); const id = inputId.value;
      const payload = { name: safeText(inputName.value), type: inputType.value, doc: safeText(inputDoc.value), phone: safeText(inputPhone.value), email: safeText(inputEmail.value), location: safeText(inputLocation.value), address: safeText(inputAddress.value), terms: inputTerms.value, wholesale_min: toInt(inputWholesaleMin.value), notes: safeText(inputNotes.value) };
      try { if(id) await apiFetch(`${API_CUSTOMERS}/${id}`, { method: "PUT", body: JSON.stringify(payload) }); else await apiFetch(API_CUSTOMERS, { method: "POST", body: JSON.stringify(payload) }); modal.classList.add("hidden"); refresh(); } catch (err) { openAlert({title:"Error", message: err.message}); }
  };
});