// frontend/assets/js/bancos.js

// === UTILIDADES ===
function safeText(v) { return (v ?? "").toString().trim(); }
function upper(v) { return safeText(v).toUpperCase(); }
function toInt(v) { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; }
function isActiveRow(x) { return x?.is_active === false ? false : true; }

function humanizeEnum(s) { 
    const raw = upper(s); 
    if (!raw) return "—"; 
    const map = { 
        PAGO_MOVIL: "Pago móvil", 
        TRANSFERENCIA: "Transferencia", 
        EFECTIVO: "Efectivo", 
        ZELLE: "Zelle", 
        CUENTA_EXTRANJERA: "Cuenta extranjera", 
        BANCO: "Banco" 
    }; 
    return map[raw] || raw.replaceAll("_", " ").toLowerCase(); 
}

function openAlert({ title = "Aviso", message = "" } = {}) { 
    const modal = document.getElementById("alert-modal"); 
    const t = document.getElementById("alert-title"); 
    const m = document.getElementById("alert-message"); 
    const ok = document.getElementById("alert-ok"); 
    if (!modal) return; 
    t.textContent = title; 
    m.textContent = message; 
    modal.classList.remove("hidden"); 
    ok.onclick = () => modal.classList.add("hidden"); 
}

// === API FETCH MEJORADO ===
async function fetchJson(url, opts = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, { 
        cache: "no-store", 
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}`, 
            ...(opts.headers || {}) 
        }, 
        ...opts 
    });

    if (res.status === 401 || res.status === 403) { 
        localStorage.removeItem("agromedic_token"); 
        window.location.replace("../pages/login.html"); 
        return; 
    }

    if (!res.ok) {
        // Intentamos obtener el mensaje de error del backend ({ error: "..." } o { message: "..." })
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData.error || errorData.message || `Error HTTP ${res.status}`;
        throw new Error(msg);
    }

    return res.headers.get("content-type")?.includes("application/json") ? res.json() : null;
}

// === SELECTORES Y VARIABLES ===
const banksTbody = document.querySelector("#banks-table tbody"); 
const accountsTbody = document.querySelector("#accounts-table tbody"); 
const routingTbody = document.querySelector("#routing-table tbody"); 
const bankModal = document.getElementById("bank-modal"); 
const accountModal = document.getElementById("account-modal");

let banks = []; 
let accounts = []; 
let routing = [];

// === RENDERS ===
function renderBanks() {
    if (!banksTbody) return; 
    banksTbody.innerHTML = "";
    if (!banks?.length) { 
        banksTbody.innerHTML = `<tr><td colspan="5" style="padding:20px; text-align:center; color:#94a3b8;">No hay bancos registrados.</td></tr>`; 
        return; 
    }
    
    banks.forEach((b) => {
        const status = isActiveRow(b) 
            ? '<span class="badge" style="background:#dcfce7; color:#166534; border:1px solid #bbf7d0;">Activo</span>' 
            : '<span class="badge" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca;">Inactivo</span>';
        
        const tr = document.createElement("tr"); 
        tr.style.borderBottom = "1px solid #f1f5f9";
        tr.innerHTML = `
            <td style="color:#94a3b8; font-weight:bold; padding:15px;">#${b.id}</td>
            <td style="font-weight:700; color:#1e293b; padding:15px;">${safeText(b.name)}</td>
            <td style="text-align:center; padding:15px;">${safeText(b.country_code) || "VE"}</td>
            <td style="text-align:center; padding:15px;">${status}</td>
            <td style="text-align:center; padding:15px;">
                <button type="button" class="btn-icon btn-edit" data-act="edit" data-id="${b.id}" title="Editar" style="color:#3b82f6; background:#eff6ff;"><i class="bi bi-pencil-square"></i></button>
                <button type="button" class="btn-icon btn-del" data-act="del" data-id="${b.id}" title="Desactivar" style="color:#ef4444; background:#fef2f2;"><i class="bi bi-trash"></i></button>
            </td>`; 
        banksTbody.appendChild(tr);
    });
    
    banksTbody.querySelectorAll("button").forEach(btn => { 
        btn.onclick = () => { 
            const id = toInt(btn.dataset.id); 
            const bank = banks.find(x => x.id === id); 
            if (btn.dataset.act === "edit") openEditBank(bank); 
            else uiDeleteBank(bank); 
        }; 
    });
}

function renderAccounts() {
    if (!accountsTbody) return; 
    accountsTbody.innerHTML = "";
    
    if (!accounts?.length) { 
        accountsTbody.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center; color:#94a3b8;">No hay cuentas registradas.</td></tr>`; 
        return; 
    }
    
    accounts.forEach((a) => {
        const status = isActiveRow(a) 
            ? '<span class="badge" style="background:#dcfce7; color:#166534; border:1px solid #bbf7d0;">Activo</span>' 
            : '<span class="badge" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca;">Inactivo</span>';
        
        const tipoCuenta = a.kind || a.type || "OTRO";

        const tr = document.createElement("tr"); 
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        // Agregamos data-label para que el CSS Slim funcione perfectamente
        tr.innerHTML = `
            <td data-label="ID" style="color:#94a3b8; font-weight:bold; padding:15px;">#${a.id}</td>
            <td data-label="Tipo" style="padding:15px;"><span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0;">${humanizeEnum(tipoCuenta)}</span></td>
            <td data-label="Nombre" style="font-weight:700; color:#1e293b; padding:15px;">${safeText(a.name)}</td>
            <td data-label="Moneda" style="text-align:center; font-weight:800; color:#0f766e; padding:15px;">${safeText(a.currency)}</td>
            <td data-label="Banco" style="padding:15px; color:#475569;">${safeText(a.bank_name) || "—"}</td>
            <td data-label="Estatus" style="text-align:center; padding:15px;">${status}</td>
            <td style="text-align:center; padding:15px;">
                <button type="button" class="btn-icon btn-edit" data-act="edit" data-id="${a.id}" title="Editar" style="color:#3b82f6; background:#eff6ff;"><i class="bi bi-pencil-square"></i></button>
                <button type="button" class="btn-icon btn-del" data-act="del" data-id="${a.id}" title="Desactivar" style="color:#ef4444; background:#fef2f2;"><i class="bi bi-trash"></i></button>
            </td>`; 
        accountsTbody.appendChild(tr);
    });
    
    // Delegación de eventos para los botones
    accountsTbody.querySelectorAll("button").forEach(btn => { 
        btn.onclick = () => { 
            const id = toInt(btn.dataset.id); 
            const account = accounts.find(x => x.id === id); 
            if (btn.dataset.act === "edit") {
                openEditAccount(account);
            } else {
                uiDeleteAccount(account);
            }
        }; 
    });
}

function renderRouting() {
    if (!routingTbody) return; 
    routingTbody.innerHTML = ""; 
    const activeAccounts = (accounts || []).filter(isActiveRow);
    
    routing.forEach((r) => {
        const method = safeText(r.method); 
        const tr = document.createElement("tr"); 
        tr.style.borderBottom = "1px dashed #e2e8f0";
        // Añadimos una clase a la fila para el CSS móvil
        tr.classList.add("routing-row"); 

        const opts = activeAccounts.map(a => `<option value="${a.id}" ${toInt(r.account_id) === a.id ? "selected" : ""}>${a.name} (${a.currency})</option>`).join("");
        
        let icon = 'bi-wallet2';
        if(method === 'ZELLE') icon = 'bi-currency-dollar';
        if(method === 'PAGO_MOVIL') icon = 'bi-phone';
        if(method === 'EFECTIVO') icon = 'bi-cash-stack';
        if(method === 'TRANSFERENCIA') icon = 'bi-bank';

        // Solo añadimos clases descriptivas (rt-method, rt-select, etc) para el CSS
        tr.innerHTML = `
            <td class="rt-method" style="font-weight:700; color:#1e293b; padding:15px; width: 20%;">
                <i class="bi ${icon}" style="color:#94a3b8; margin-right:5px; font-size:1.1rem;"></i> ${humanizeEnum(method)}
            </td>
            <td class="rt-select-container" style="padding:15px; width: 50%;">
                <select data-method="${method}" class="routing-select" style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc; color:#334155; font-weight:500; outline:none; cursor:pointer;">
                    <option value="">(Sin cuenta asignada)</option>
                    ${opts}
                </select>
            </td>
            <td class="rt-currency" style="text-align:center; font-weight:800; color:#0f766e; padding:15px; width: 15%;">
                ${safeText(r.account_currency) || "—"}
            </td>
            <td class="rt-action" style="text-align:right; padding:15px; width: 15%;">
                <button type="button" class="btn-primary btn-save-routing" data-act="save" data-method="${method}" style="padding:8px 16px; border-radius:6px; font-weight:600; display:inline-flex; align-items:center; gap:5px; transition: all 0.2s;">
                    <i class="bi bi-cloud-arrow-up"></i> Guardar
                </button>
            </td>`; 
        routingTbody.appendChild(tr);
    });
    
    routingTbody.querySelectorAll("button[data-act='save']").forEach(btn => { 
        // Dentro de renderRouting, en el evento onclick del botón:

btn.onclick = async () => { 
    const method = btn.dataset.method; 
    const sel = routingTbody.querySelector(`select[data-method="${method}"]`); 
    const originalContent = btn.innerHTML; // Guardamos el HTML completo (icono + texto)

    // Estado: Cargando
    btn.classList.add("btn-loading");
    btn.disabled = true;

    try { 
        await apiSetRouting(method, sel.value ? Number(sel.value) : null); 
        await loadAll(); 
        
        // Estado: Éxito (Transición fluida)
        btn.classList.remove("btn-loading");
        btn.classList.add("btn-success-anim");
        btn.innerHTML = `<i class="bi bi-check2-circle"></i> <span>¡Listo!</span>`;
        
        setTimeout(() => { 
            btn.classList.remove("btn-success-anim");
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }, 2500);

    } catch (e) { 
        openAlert({ title: "Error", message: e.message }); 
        btn.classList.remove("btn-loading");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    } 
        }; 
    });
}

// === ACCIONES DE UI ===
function openModal(m) { if(m) m.classList.remove("hidden"); } 
function closeModal(m) { if(m) m.classList.add("hidden"); }

async function openNewBank() { document.getElementById("bank-form").reset(); document.getElementById("bank-id").value = ""; openModal(bankModal); }
async function openEditBank(b) { 
    document.getElementById("bank-id").value = b.id; 
    document.getElementById("bank-name").value = b.name; 
    document.getElementById("bank-country").value = b.country_code; 
    document.getElementById("bank-active").checked = isActiveRow(b); 
    openModal(bankModal); 
}

async function openNewAccount() { document.getElementById("account-form").reset(); document.getElementById("account-id").value = ""; fillBanksSelect(); openModal(accountModal); }
async function openEditAccount(a) { 
    document.getElementById("account-id").value = a.id; 
    // Aseguramos leer 'kind' o 'type' independientemente de cómo lo mande el backend
    document.getElementById("account-kind").value = upper(a.kind || a.type); 
    document.getElementById("account-name").value = a.name; 
    document.getElementById("account-currency").value = a.currency; 
    fillBanksSelect(a.bank_id); 
    document.getElementById("account-number").value = a.account_ref || ""; 
    document.getElementById("account-holder").value = a.holder_name || ""; 
    document.getElementById("account-notes").value = a.notes || ""; 
    document.getElementById("account-active").checked = isActiveRow(a); 
    openModal(accountModal); 
}

function fillBanksSelect(selectedId = null) { 
    const sel = document.getElementById("account-bank"); 
    sel.innerHTML = '<option value="">(Sin banco)</option>' + banks.filter(isActiveRow).map(b => `<option value="${b.id}" ${Number(selectedId) === b.id ? 'selected' : ''}>${b.name}</option>`).join(""); 
}

// === FUNCIONES DE ELIMINAR ===
async function uiDeleteBank(b) {
    if (!confirm(`¿Estás seguro de desactivar el banco "${b.name}"?`)) return;
    try {
        await fetchJson(`${API_BASE}/finance/banks/${b.id}`, { method: "DELETE" });
        await loadAll();
    } catch (e) {
        openAlert({ title: "Error", message: e.message });
    }
}

async function uiDeleteAccount(a) {
    if (!confirm(`¿Estás seguro de desactivar la cuenta "${a.name}"?`)) return;
    try {
        await fetchJson(`${API_BASE}/finance/accounts/${a.id}`, { method: "DELETE" });
        await loadAll();
    } catch (e) {
        openAlert({ title: "Error", message: e.message });
    }
}

// === API CALLS ===
async function apiListBanks() { banks = await fetchJson(`${API_BASE}/finance/banks`); }
async function apiListAccounts() { accounts = await fetchJson(`${API_BASE}/finance/accounts`); }
async function apiListRouting() { routing = await fetchJson(`${API_BASE}/finance/method-routing`); }
async function apiSetRouting(method, account_id) { return fetchJson(`${API_BASE}/finance/method-routing/${encodeURIComponent(method)}`, { method: "PUT", body: JSON.stringify({ account_id }) }); }

async function loadAll() { 
    try { 
        await Promise.all([apiListBanks(), apiListAccounts(), apiListRouting()]); 
        renderBanks(); renderAccounts(); renderRouting(); 
    } catch (e) { openAlert({ title: "Error al cargar la bóveda", message: e.message }); } 
}

// === DOM READY ===
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-new-bank").onclick = openNewBank; 
    document.getElementById("btn-new-account").onclick = openNewAccount; 
    document.getElementById("btn-refresh").onclick = loadAll; 
    document.getElementById("bank-cancel").onclick = () => closeModal(bankModal); 
    document.getElementById("account-cancel").onclick = () => closeModal(accountModal);
    
    // Formulario de Bancos
    document.getElementById("bank-form").onsubmit = async (e) => { 
        e.preventDefault(); 
        const btn = e.target.querySelector('button[type="submit"]');
        const id = document.getElementById("bank-id").value; 
        const payload = { 
            name: document.getElementById("bank-name").value, 
            country_code: document.getElementById("bank-country").value, 
            is_active: document.getElementById("bank-active").checked 
        }; 

        btn.disabled = true;
        try { 
            if(id) await fetchJson(`${API_BASE}/finance/banks/${id}`, { method: "PUT", body: JSON.stringify(payload) }); 
            else await fetchJson(`${API_BASE}/finance/banks`, { method: "POST", body: JSON.stringify(payload) }); 
            closeModal(bankModal); 
            await loadAll(); 
        } catch(err) { 
            openAlert({title:"Error", message: err.message}); 
        } finally {
            btn.disabled = false;
        }
    };

    // Formulario de Cuentas (Único y corregido)
    document.getElementById("account-form").onsubmit = async (e) => { 
        e.preventDefault(); 
        const btn = e.target.querySelector('button[type="submit"]');
        const id = document.getElementById("account-id").value; 
        
        const payload = { 
            kind: document.getElementById("account-kind").value, 
            name: document.getElementById("account-name").value, 
            currency: document.getElementById("account-currency").value, 
            bank_id: toInt(document.getElementById("account-bank").value), 
            account_ref: document.getElementById("account-number").value, 
            holder_name: document.getElementById("account-holder").value, 
            notes: document.getElementById("account-notes").value, 
            is_active: document.getElementById("account-active").checked 
        }; 

        btn.disabled = true;
        try { 
            if(id) await fetchJson(`${API_BASE}/finance/accounts/${id}`, { method: "PUT", body: JSON.stringify(payload) }); 
            else await fetchJson(`${API_BASE}/finance/accounts`, { method: "POST", body: JSON.stringify(payload) }); 
            closeModal(accountModal); 
            await loadAll(); 
        } catch(err) { 
            openAlert({title:"Error", message: err.message}); 
        } finally {
            btn.disabled = false;
        }
    };
    
    loadAll();
});