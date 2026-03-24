// =========================================================
// 1. VARIABLES DE ESTADO Y ELEMENTOS UI
// =========================================================
const API_SERIALS = "/serials"; 
let tempSerials = []; 
let allItems = [];    
let allMasterData = []; 
let html5QrCode; // Instancia del escáner

const inputScan = document.getElementById('reg-serial-input');
const tempContainer = document.getElementById('temp-serial-list');
const btnSave = document.getElementById('btn-save-serials');
const selectItem = document.getElementById('reg-item-id');
const tableBody = document.getElementById('serial-master-table');
const searchInput = document.getElementById('search-serial');
const btnScanner = document.getElementById('btn-toggle-scanner');
const readerDiv = document.getElementById('reader');

// =========================================================
// 2. INICIALIZACIÓN
// =========================================================
async function init() {
    await loadAssignableItems(); 
    await loadSerialMasterTable();
    
    // Capturar parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const preselectId = urlParams.get('item_id');
    const preselectType = urlParams.get('type');

    if (preselectId && preselectType) {
        selectItem.value = `${preselectType}-${preselectId}`;
        if(inputScan) inputScan.focus();
    }
    
    // Eventos
    if(inputScan) inputScan.addEventListener('keypress', handleScan);
    if(btnSave) btnSave.addEventListener('click', saveSerialsToDB);
    if(searchInput) searchInput.addEventListener('input', (e) => filterTable(e.target.value));
    if(btnScanner) btnScanner.addEventListener('click', toggleScanner);
}

// =========================================================
// 3. CARGA DE DATOS (READ)
// =========================================================
async function loadAssignableItems() {
    try {
        const res = await apiFetch(`${API_SERIALS}/assignable-items`);
        allItems = res.data || [];
        
        if(!selectItem) return;
        
        selectItem.innerHTML = '<option value="">Buscar en Inventario...</option>';
        allItems.forEach(item => {
            const opt = document.createElement('option');
            opt.value = `${item.type}-${item.id}`;
            opt.textContent = `[${item.type === 'PRODUCT' ? 'VENTA' : 'KIT'}] ${item.name}`;
            selectItem.appendChild(opt);
        });
    } catch (err) {
        console.error("Error cargando items:", err);
    }
}

async function loadSerialMasterTable() {
    try {
        const res = await apiFetch(`${API_SERIALS}/all`);
        const data = res.data || [];
        allMasterData = data; 
        
        renderMasterTable(data);
        
        const globalCounter = document.getElementById('global-counter');
        if(globalCounter) {
            const available = data.filter(s => s.status === 'DISPONIBLE').length;
            globalCounter.textContent = available;
        }
    } catch (err) {
        console.error("Error cargando tabla maestra:", err);
    }
}

// =========================================================
// 4. LÓGICA DE ESCANEO (MANUAL Y CÁMARA)
// =========================================================
function handleScan(e) {
    if (e.key === 'Enter') {
        processNewSerial(inputScan.value);
        inputScan.value = "";
    }
}

function processNewSerial(val) {
    val = val.trim().toUpperCase();
    if (!val) return;

    if (val.length < 5) {
        showToast("Serial demasiado corto", "warning");
        return;
    }

    if (tempSerials.includes(val)) {
        showToast("Este IMEI ya está en la lista", "warning");
        return;
    }

    tempSerials.push(val);
    renderTempList();
    
    // Feedback visual
    if(inputScan) {
        inputScan.parentElement.style.backgroundColor = "#dcfce7"; 
        setTimeout(() => inputScan.parentElement.style.backgroundColor = "transparent", 300);
    }
    
    if (navigator.vibrate) navigator.vibrate(100);
}

// --- Lógica de html5-qrcode ---
async function toggleScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        await stopScanner();
        return;
    }

    readerDiv.style.display = "block";
    btnScanner.innerHTML = `<i class="bi bi-camera-off"></i> APAGAR CÁMARA`;
    btnScanner.style.background = "#fee2e2";
    btnScanner.style.color = "#991b1b";

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 280, height: 180 } };

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                processNewSerial(decodedText);
                showToast(`Escaneado: ${decodedText}`, "success");
            }
        );
    } catch (err) {
        console.error("Error cámara:", err);
        showToast("No se pudo acceder a la cámara", "danger");
        readerDiv.style.display = "none";
    }
}

async function stopScanner() {
    if (html5QrCode) {
        await html5QrCode.stop();
        readerDiv.style.display = "none";
        btnScanner.innerHTML = `<i class="bi bi-camera"></i> ACTIVAR CÁMARA`;
        btnScanner.style.background = "#f8fafc";
        btnScanner.style.color = "#64748b";
    }
}

// =========================================================
// 5. RENDERIZADO TEMPORAL
// =========================================================
function renderTempList() {
    if(!tempContainer) return;

    tempContainer.innerHTML = tempSerials.map((s, index) => `
        <div class="imei-tag">
            <i class="bi bi-cpu"></i>
            <span>${s}</span>
            <i class="bi bi-x-circle-fill" style="cursor:pointer; opacity:0.7;" onclick="removeTemp(${index})"></i>
        </div>
    `).join('');

    if(btnSave) btnSave.style.display = tempSerials.length > 0 ? "block" : "none";
}

window.removeTemp = function(index) {
    tempSerials.splice(index, 1);
    renderTempList();
};

// =========================================================
// 6. GUARDADO Y PERSISTENCIA
// =========================================================
async function saveSerialsToDB() {
    if (!selectItem || !selectItem.value) {
        showToast("Selecciona un producto primero", "warning");
        return;
    }

    const [type, id] = selectItem.value.split('-');
    const countSaved = tempSerials.length;

    try {
        if(btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = `<i class="bi bi-hourglass-split"></i> Guardando...`;
        }

        await apiFetch(`${API_SERIALS}/bulk-register`, {
            method: 'POST',
            body: JSON.stringify({
                item_id: Number(id),
                item_type: type, 
                serials: tempSerials
            })
        });

        if (html5QrCode && html5QrCode.isScanning) await stopScanner();
        
        showSuccess(countSaved); 
        tempSerials = [];
        renderTempList();
        await loadSerialMasterTable(); 
        
    } catch (err) {
        showToast("Error de Registro: " + err.message, "danger");
    } finally {
        if(btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = `Confirmar Ingreso al Sistema`;
        }
    }
}

function showSuccess(count) {
    const modal = document.getElementById('feedback-modal');
    const msg = document.getElementById('feedback-message');
    const btn = document.getElementById('close-feedback');

    msg.innerHTML = `Se han vinculado <b>${count}</b> unidades de forma exitosa al inventario de <b>Kont</b>.`;
    modal.classList.remove('hidden');

    btn.onclick = () => {
        modal.classList.add('hidden');
        if(inputScan) inputScan.focus();
    };
}

// =========================================================
// 7. TABLA MAESTRA Y FILTROS
// =========================================================
function renderMasterTable(data) {
    if(!tableBody) return;

    if(data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color:#94a3b8;">No hay seriales registrados.</td></tr>`;
        return;
    }

    tableBody.innerHTML = data.map(s => {
        const serialNum = s.imei || s.serial_number || 'N/A';
        const itemName = s.product_name || s.supply_name || 'Desconocido';
        const itemTypeLabel = s.product_id ? 'Equipo Venta' : 'Insumo/Pieza';
        const statusClass = s.status === 'DISPONIBLE' ? 'status-available' : 'status-sold';

        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 18px; font-family: monospace; font-weight: 700; color: #1e293b;">${serialNum}</td>
            <td style="padding: 18px;">
                <div style="font-weight: 600;">${itemName}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${itemTypeLabel}</div>
            </td>
            <td style="padding: 18px; color: #64748b;">${s.location || 'Principal'}</td>
            <td style="padding: 18px;">
                <span class="status-badge ${statusClass}">
                    ${s.status}
                </span>
            </td>
            <td style="padding: 18px; text-align: center;">
                <button onclick="viewSerialHistory(${s.id})" style="border:none; background: #f8fafc; color: #64748b; padding: 8px; border-radius: 8px; cursor: pointer;">
                    <i class="bi bi-clock-history"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

function filterTable(term) {
    const q = term.trim().toLowerCase();
    const filtered = allMasterData.filter(s => {
        const serialNum = (s.imei || s.serial_number || '').toLowerCase();
        const itemName = (s.product_name || s.supply_name || '').toLowerCase();
        return serialNum.includes(q) || itemName.includes(q);
    });
    renderMasterTable(filtered);
}

function showToast(message, type) {
    // Si tienes un toast en main.js, úsalo aquí. Si no, alert es el fallback.
    if(window.showNotification) {
        window.showNotification(message, type);
    } else {
        // Opcional: alert(message);
    }
}

window.viewSerialHistory = function(id) {
    alert(`Próximamente: Historial del equipo ID: ${id}`);
}

// Arranque
init();