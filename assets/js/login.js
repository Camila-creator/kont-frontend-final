document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorBox = document.getElementById("error-box");
    const btn = document.getElementById("btn-submit");
  
    // 1. Limpiar interfaz y feedback visual
    if (errorBox) {
        errorBox.style.display = "none";
        errorBox.textContent = "";
    }
    
    btn.textContent = "Verificando...";
    btn.disabled = true;
  
    try {
        // 2. Petición al backend
        const res = await fetch("http://localhost:4000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
  
        const data = await res.json();
  
        if (!res.ok) {
            throw new Error(data.error || "Credenciales incorrectas o error en el servidor.");
        }
  
        // 3. 🛡️ PERSISTENCIA DE SESIÓN (Sincronización SaaS)
        
        // Guardamos el Token para las cabeceras Authorization: Bearer
        localStorage.setItem("agromedic_token", data.token);
        
        // Guardamos el objeto completo del usuario (para el perfil/header)
        localStorage.setItem("agromedic_user", JSON.stringify(data.user));
        
        // 🚀 ESTO ARREGLA EL ERROR EN COMPRAS:
        // Extraemos el tenant_id del objeto user que envía tu controlador
        if (data.user && data.user.tenant_id) {
            localStorage.setItem("agromedic_tenant_id", data.user.tenant_id);
            console.log("✅ Tenant ID guardado correctamente:", data.user.tenant_id);
        } else {
            console.warn("⚠️ Advertencia: El usuario no tiene un Tenant ID asociado.");
        }
  
        // 4. Redirección al Dashboard tras éxito
        window.location.href = "./dashboard.html";
  
    } catch (err) {
        // Manejo de errores visual
        if (errorBox) {
            errorBox.textContent = err.message;
            errorBox.style.display = "block";
        }
        console.error("Error en login:", err);
    } finally {
        // Restaurar botón
        btn.textContent = "Ingresar";
        btn.disabled = false;
    }
});