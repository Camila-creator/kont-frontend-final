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
        // 🚀 CAMBIO CLAVE: Ahora llamamos a Render, no a tu computadora
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
            console.log("✅ Tenant ID guardado correctamente:", data.user.tenant_id);
        }
  
        // 🚀 Redirección al Dashboard tras éxito
        window.location.href = "./dashboard.html";
  
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