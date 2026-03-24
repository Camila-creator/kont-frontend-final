/* =========================================================
   BRANDBOOK.JS - Lógica de Frontend (Versión Genérica SaaS)
   ========================================================= */
const API_URL = 'http://localhost:4000/api/brand-assets'; 
let assetMap = {}; 

document.addEventListener('DOMContentLoaded', () => { loadBrandBook(); });

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("agromedic_token");
    const res = await fetch(url, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) }, ...options });
    if (res.status === 401 || res.status === 403) { localStorage.removeItem("agromedic_token"); window.location.replace("../pages/login.html"); return; }
    if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
    return res.json();
}

async function loadBrandBook() {
    try {
        const result = await apiFetch(API_URL);
        if (result && result.success) {
            const { adn, estrategia, logos, colores, empaque } = result.data;
            renderADN(adn); renderEstrategia(estrategia); renderVisual(logos, colores); renderEmpaque(empaque); populateForm(result.data);
        }
    } catch (error) { console.error("Error de conexión:", error); }
}

function renderADN(data) {
    const container = document.getElementById('container-adn'); if(!container) return; container.innerHTML = '';
    data.forEach(item => {
        assetMap[item.nombre] = { id: item.id, valor: item.valor };
        let icon = 'bi-star'; let colorClass = ''; const nombre = item.nombre.toLowerCase();
        if (nombre.includes('visión') || nombre.includes('vision')) { icon = 'bi-eye'; colorClass = 'phi-green'; }
        if (nombre.includes('valores')) { icon = 'bi-trophy'; colorClass = 'phi-yellow'; }
        if (nombre.includes('misión') || nombre.includes('mision')) { icon = 'bi-bullseye'; }
        container.innerHTML += `<div class="philosophy-item ${colorClass}"><h4><i class="bi ${icon}"></i> ${item.nombre}</h4><p>${item.descripcion}</p></div>`;
    });
}

function renderEstrategia(data) {
    const mani = data.find(i => i.nombre === 'manifiesto' || i.nombre === 'Manifiesto de Marca');
    const tono = data.find(i => i.nombre === 'tono_voz' || i.nombre === 'Tono de Voz');
    if (mani) { assetMap['manifiesto'] = { id: mani.id, valor: mani.valor }; const box = document.getElementById('container-manifiesto'); if(box) box.innerText = `"${mani.descripcion}"`; }
    if (tono) { assetMap['tono_voz'] = { id: tono.id, valor: tono.valor }; const puntos = tono.descripcion.split(';').map(p => `<li>${p.trim()}</li>`).join(''); const lista = document.getElementById('lista-tono-voz'); if(lista) lista.innerHTML = puntos; }
}

function renderVisual(logos, colores) {
    const container = document.getElementById('container-colores');
    if(container) {
        container.innerHTML = '';
        colores.forEach(c => {
            if(c.nombre === 'Color Principal') assetMap['color_principal'] = { id: c.id }; if(c.nombre === 'Color Secundario') assetMap['color_secundario'] = { id: c.id }; if(c.nombre === 'Color Terciario') assetMap['color_terciario'] = { id: c.id }; if(c.nombre === 'Color Opcional' || c.nombre === 'Color Texto') assetMap['color_opcional'] = { id: c.id };
            container.innerHTML += `<div class="brand-card"><div class="color-swatch" style="background:${c.descripcion};"></div><div class="color-info"><strong>${c.nombre}</strong><div class="color-hex" onclick="copiarColor('${c.descripcion}')"><span>${c.descripcion}</span> <i class="bi bi-clipboard"></i></div></div></div>`;
        });
    }
    const logoContainer = document.getElementById('container-logos');
    if(logoContainer) {
        logoContainer.innerHTML = '';
        logos.forEach(l => {
            let bgClass = l.nombre.toLowerCase().includes('negativo') ? 'dark' : '';
            logoContainer.innerHTML += `<div class="brand-card"><div class="logo-preview ${bgClass}"><img src="../assets/img/${l.descripcion}" alt="${l.nombre}" onerror="this.style.display='none'"></div><div class="card-body"><strong>${l.nombre}</strong><button class="btn-outline"><i class="bi bi-download"></i> Descargar</button></div></div>`;
        });
    }
}

function renderEmpaque(data) {
    const container = document.getElementById('container-empaques'); if(!container) return; container.innerHTML = '';
    data.forEach(paso => { assetMap[`pack_${paso.valor}`] = { id: paso.id, valor: paso.valor }; container.innerHTML += `<div class="brand-card"><div class="pack-step"><div class="step-num">${paso.valor}</div><strong>${paso.nombre}</strong><p style="font-size:0.85rem; color:#666;">${paso.descripcion}</p></div></div>`; });
}

function populateForm(data) {
    const f = document.forms['brandForm']; if(!f) return;
    const fmision = data.adn.find(i => i.nombre.toLowerCase().includes('mision')); if(fmision) f.mision.value = fmision.descripcion;
    const fvision = data.adn.find(i => i.nombre.toLowerCase().includes('vision')); if(fvision) f.vision.value = fvision.descripcion;
    const fvalores = data.adn.find(i => i.nombre.toLowerCase().includes('valores')); if(fvalores) f.valores.value = fvalores.descripcion;
    const fmani = data.estrategia.find(i => i.nombre.toLowerCase().includes('manifiesto')); if(fmani) f.manifiesto.value = fmani.descripcion;
    const ftono = data.estrategia.find(i => i.nombre.toLowerCase().includes('tono')); if(ftono) f.tono_voz.value = ftono.descripcion;

    data.colores.forEach(c => {
        let inputKey = ''; if(c.nombre === 'Color Principal') inputKey = 'principal'; if(c.nombre === 'Color Secundario') inputKey = 'secundario'; if(c.nombre === 'Color Terciario') inputKey = 'terciario'; if(c.nombre === 'Color Opcional' || c.nombre === 'Color Texto') inputKey = 'opcional';
        if(inputKey) { if(f[`color_${inputKey}`]) f[`color_${inputKey}`].value = c.descripcion; const picker = document.getElementById(`picker_${inputKey}`); if(picker && c.descripcion.startsWith('#')) { picker.value = c.descripcion; } }
    });
    data.empaque.forEach(p => { if(f[`pack_${p.valor}`]) f[`pack_${p.valor}`].value = p.descripcion; });
}

function syncColor(type, value, fromText = false) {
    const picker = document.getElementById(`picker_${type}`); const textInput = document.forms['brandForm'][`color_${type}`];
    if (fromText) { if (value.startsWith('#') && value.length === 7) picker.value = value; } else { textInput.value = value; }
}

async function saveChanges(event) {
    event.preventDefault(); const f = document.forms['brandForm']; const updates = [];
    const addUpdate = (keyName, newValue) => { if (assetMap[keyName] && newValue) updates.push({ id: assetMap[keyName].id, descripcion: newValue, valor: assetMap[keyName].valor }); };

    addUpdate('mision', f.mision.value); addUpdate('vision', f.vision.value); addUpdate('valores', f.valores.value); addUpdate('manifiesto', f.manifiesto.value); addUpdate('tono_voz', f.tono_voz.value);
    addUpdate('color_principal', f.color_principal.value); addUpdate('color_secundario', f.color_secundario.value); addUpdate('color_terciario', f.color_terciario.value); addUpdate('color_opcional', f.color_opcional.value);
    addUpdate('pack_1', f.pack_1.value); addUpdate('pack_2', f.pack_2.value); addUpdate('pack_3', f.pack_3.value); addUpdate('pack_4', f.pack_4.value);

    const hayLogos = f.logo_principal?.value || f.logo_negativo?.value || f.isotipo?.value;
    if (hayLogos) alert("⚠️ Nota: La subida de imágenes requiere configuración de servidor de archivos. Se guardarán solo los textos y colores.");

    try {
        const promises = updates.map(u => apiFetch(API_URL, { method: 'PUT', body: JSON.stringify(u) }));
        await Promise.all(promises); alert('Cambios guardados correctamente'); closeModal(); loadBrandBook(); 
    } catch (error) { console.error("Error guardando:", error); alert('Error al guardar cambios.'); }
}

const modal = document.getElementById('editModal');
function openModal() { modal.classList.add('active'); }
function closeModal() { modal.classList.remove('active'); }
if(modal) { modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); }); }

function switchTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content"); for (let i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; tabcontent[i].classList.remove("active"); }
    const tablinks = document.getElementsByClassName("tab"); for (let i = 0; i < tablinks.length; i++) { tablinks[i].classList.remove("active"); }
    document.getElementById(tabName).style.display = "block"; document.getElementById(tabName).classList.add("active"); evt.currentTarget.classList.add("active");
}
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
function copiarColor(hex) { navigator.clipboard.writeText(hex).then(() => alert("Copiado: " + hex)); }