document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorBox = document.getElementById("error-box");
    const btn = document.getElementById("btn-submit");
  
    if (errorBox) {
        errorBox.style.display = "none";
        errorBox.textContent = "";
    }
    
    btn.textContent = "Verificando...";
    btn.disabled = true;
  
    try {
        // 🚀 Llamada a la API en Render
        const res = await fetch("https://kont-backend-final.onrender.com/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
  
        const data = await res.json();
  
        if (!res.ok) {
            throw new Error(data.error || "Credenciales incorrectas o error en el servidor.");
        }
  
        // 🛡️ PERSISTENCIA DE SESIÓN
        localStorage.setItem("agromedic_token", data.token);
        localStorage.setItem("agromedic_user", JSON.stringify(data.user));
        
        if (data.user && data.user.tenant_id) {
            localStorage.setItem("agromedic_tenant_id", data.user.tenant_id);
            console.log("✅ Sesión iniciada para tenant:", data.user.tenant_id);
        }
  
        // 🎯 LÓGICA DE REDIRECCIÓN INTELIGENTE (Destino por Rol)
        const user = data.user;
        let destination = "dashboard.html"; // Por defecto para ADMIN y SUPER_ADMIN

        if (user.role === "SELLER") {
            destination = "pedidos.html"; 
        } else if (user.role === "WAREHOUSE") {
            destination = "productos.html";
        } else if (user.role === "FINANCE") {
            destination = "pagos.html";
        } else if (user.role === "MARKETING") {
            destination = "mkt_calendar.html";
        }

        console.log(`🚀 Redirigiendo a ${user.role} hacia: ${destination}`);

        // ⏱️ Pequeño delay y uso de replace para evitar el "rebote"
        setTimeout(() => {
            window.location.replace(destination);
        }, 100);
  
    } catch (err) {
        if (errorBox) {
            errorBox.textContent = err.message;
            errorBox.style.display = "block";
        }
        console.error("Error en login:", err);
    } finally {
        btn.textContent = "Ingresar";
        btn.disabled = false;
    }
});