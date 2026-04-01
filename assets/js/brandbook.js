/* =========================================================
   BRANDBOOK.JS - Lógica de Identidad Corporativa (KONT)
   ========================================================= */

// ✅ Ruta ajustada para el backend de Kont
const API_URL = '/brand-assets'; 
let assetMap = {}; 

document.addEventListener('DOMContentLoaded', () => { 
    if (typeof apiFetch !== 'function') {
        console.error("Error: main.js no detectado. Las funciones de Brandbook fallarán.");
    }
    loadBrandBook(); 
});

// === CARGA DE DATOS DE MARCA ===
async function loadBrandBook() {
    try {
        const result = await apiFetch(API_URL);
        if (result && (result.success || result.data)) {
            const data = result.data || result;
            const { adn, estrategia, logos, colores, empaque } = data;

            renderADN(adn || []); 
            renderEstrategia(estrategia || []); 
            renderVisual(logos || [], colores || []); 
            renderEmpaque(empaque || []); 
            populateForm(data);
        }
    } catch (error) { 
        console.error("Error cargando el Brandbook:", error); 
    }
}

// === RENDER ADN (Misión, Visión, Valores) ===
function renderADN(data) {
    const container = document.getElementById('container-adn'); 
    if(!container) return; 
    container.innerHTML = '';

    data.forEach(item => {
        // Mapeamos para edición posterior
        assetMap[item.nombre.toLowerCase()] = { id: item.id, valor: item.valor };
        
        let icon = 'bi-patch-check'; 
        let colorClass = 'phi-default'; 
        const nombre = item.nombre.toLowerCase();

        if (nombre.includes('visión') || nombre.includes('vision')) { 
            icon = 'bi-eye-fill'; colorClass = 'phi-green'; 
        } else if (nombre.includes('valores')) { 
            icon = 'bi-gem'; colorClass = 'phi-yellow'; 
        } else if (nombre.includes('misión') || nombre.includes('mision')) { 
            icon = 'bi-target'; colorClass = 'phi-blue';
        }

        container.innerHTML += `
            <div class="philosophy-item ${colorClass}" style="padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                <h4 style="display:flex; align-items:center; gap:10px; margin-bottom:10px; color: #1e293b;">
                    <i class="bi ${icon}"></i> ${item.nombre}
                </h4>
                <p style="font-size: 0.9rem; color: #64748b; line-height: 1.6;">${item.descripcion}</p>
            </div>`;
    });
}

// === RENDER ESTRATEGIA (Manifiesto y Tono) ===
function renderEstrategia(data) {
    const mani = data.find(i => i.nombre.toLowerCase().includes('manifiesto'));
    const tono = data.find(i => i.nombre.toLowerCase().includes('tono'));

    if (mani) { 
        assetMap['manifiesto'] = { id: mani.id, valor: mani.valor }; 
        const box = document.getElementById('container-manifiesto'); 
        if(box) box.innerText = `"${mani.descripcion}"`; 
    }

    if (tono) { 
        assetMap['tono_voz'] = { id: tono.id, valor: tono.valor }; 
        const lista = document.getElementById('lista-tono-voz'); 
        if(lista) {
            const puntos = tono.descripcion.split(';').map(p => 
                `<li style="margin-bottom:8px;"><i class="bi bi-check2-circle" style="color:#10b981; margin-right:8px;"></i>${p.trim()}</li>`
            ).join('');
            lista.innerHTML = puntos; 
        }
    }
}

// === RENDER VISUAL (Colores y Logos) ===
function renderVisual(logos, colores) {
    // 1. Colores
    const containerColores = document.getElementById('container-colores');
    if(containerColores) {
        containerColores.innerHTML = '';
        colores.forEach(c => {
            const n = c.nombre.toLowerCase();
            if(n.includes('principal')) assetMap['color_principal'] = { id: c.id };
            if(n.includes('secundario')) assetMap['color_secundario'] = { id: c.id };
            
            containerColores.innerHTML += `
                <div class="brand-card" style="border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; background: #fff;">
                    <div class="color-swatch" style="height: 100px; background:${c.descripcion}; transition: 0.3s;"></div>
                    <div class="color-info" style="padding: 12px;">
                        <strong style="display:block; font-size: 0.85rem; color:#1e293b;">${c.nombre}</strong>
                        <div class="color-hex" onclick="copiarColor('${c.descripcion}')" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; margin-top:5px; color:#64748b; font-family:monospace; font-size:0.8rem;">
                            <span>${c.descripcion.toUpperCase()}</span> 
                            <i class="bi bi-clipboard"></i>
                        </div>
                    </div>
                </div>`;
        });
    }

    // 2. Logos
    const logoContainer = document.getElementById('container-logos');
    if(logoContainer) {
        logoContainer.innerHTML = '';
        logos.forEach(l => {
            let bgClass = l.nombre.toLowerCase().includes('negativo') ? 'background: #1e293b;' : 'background: #f8fafc;';
            logoContainer.innerHTML += `
                <div class="brand-card" style="border: 1px solid #f1f5f9; border-radius: 12px; background: #fff;">
                    <div class="logo-preview" style="${bgClass} height: 120px; display:flex; justify-content:center; align-items:center; padding: 20px; border-radius: 12px 12px 0 0;">
                        <img src="${l.descripcion}" alt="${l.nombre}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.src='../assets/img/placeholder-logo.png'">
                    </div>
                    <div style="padding: 12px; display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size: 0.8rem;">${l.nombre}</strong>
                        <a href="${l.descripcion}" download class="btn-outline" style="font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; color: #64748b; text-decoration:none;"><i class="bi bi-download"></i></a>
                    </div>
                </div>`;
        });
    }
}

// === GESTIÓN DE FORMULARIO DE EDICIÓN ===
function populateForm(data) {
    const f = document.forms['brandForm']; 
    if(!f) return;

    // Poblar textos
    const findDesc = (arr, key) => arr.find(i => i.nombre.toLowerCase().includes(key))?.descripcion || '';
    
    if(f.mision) f.mision.value = findDesc(data.adn, 'mision');
    if(f.vision) f.vision.value = findDesc(data.adn, 'vision');
    if(f.valores) f.valores.value = findDesc(data.adn, 'valores');
    if(f.manifiesto) f.manifiesto.value = findDesc(data.estrategia, 'manifiesto');
    if(f.tono_voz) f.tono_voz.value = findDesc(data.estrategia, 'tono');

    // Poblar colores
    data.colores.forEach(c => {
        let key = '';
        const n = c.nombre.toLowerCase();
        if(n.includes('principal')) key = 'principal';
        else if(n.includes('secundario')) key = 'secundario';
        
        if(key && f[`color_${key}`]) {
            f[`color_${key}`].value = c.descripcion;
            const picker = document.getElementById(`picker_${key}`);
            if(picker) picker.value = c.descripcion;
        }
    });
}

async function saveChanges(event) {
    event.preventDefault(); 
    const f = document.forms['brandForm']; 
    const updates = [];

    const addUpdate = (key, newValue) => {
        const keyLower = key.toLowerCase();
        if (assetMap[keyLower] && newValue) {
            updates.push({ 
                id: assetMap[keyLower].id, 
                descripcion: newValue, 
                valor: assetMap[keyLower].valor 
            });
        }
    };

    // Recolectar datos
    addUpdate('mision', f.mision.value);
    addUpdate('vision', f.vision.value);
    addUpdate('manifiesto', f.manifiesto.value);
    addUpdate('color_principal', f.color_principal.value);

    const btn = event.submitter;
    const originalText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';

        // Ejecutar todas las actualizaciones
        await Promise.all(updates.map(u => apiFetch(API_URL, { method: 'PUT', body: JSON.stringify(u) })));
        
        if (typeof openAlert === 'function') {
            openAlert({ title: "Éxito", message: "Identidad de marca actualizada." });
        }
        
        closeModal(); 
        loadBrandBook(); 
    } catch (error) { 
        console.error("Error al guardar:", error); 
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// === UTILIDADES UI ===
function copiarColor(hex) {
    navigator.clipboard.writeText(hex).then(() => {
        if (typeof openAlert === 'function') {
            // Un pequeño toast o alerta sería mejor aquí
            console.log("Copiado al portapapeles: " + hex);
        }
    });
}

function openModal() { document.getElementById('editModal')?.classList.add('active'); }
function closeModal() { document.getElementById('editModal')?.classList.remove('active'); }