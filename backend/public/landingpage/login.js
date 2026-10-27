const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const submitButton = loginForm.querySelector("button[type='submit']");

function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.SMARTLIB_CONFIG) {
        if (typeof window.SMARTLIB_CONFIG.getBaseUrl === "function") {
            return window.SMARTLIB_CONFIG.getBaseUrl();
        }
        if (window.SMARTLIB_CONFIG.API_BASE_URL) {
            return window.SMARTLIB_CONFIG.API_BASE_URL;
        }
    }
    return "https://smartlib-sjya.onrender.com/api";
}

function setError(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function clearErrors() {
    document.querySelectorAll(".field-error").forEach(item => item.textContent = "");
    message.className = "message";
    message.textContent = "";
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearErrors();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    let valid = true;

    if (!email) {
        setError("emailError", "Enter your email.");
        valid = false;
    }

    if (!password) {
        setError("passwordError", "Enter your password.");
        valid = false;
    }

    if (!valid) return;

    // Prevent repeated submission while request is in progress
    const originalBtnText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = "Signing in...";

    const activeApiUrl = getApiBaseUrl();

    try {
        const response = await fetch(`${activeApiUrl}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data || !data.success) {
            message.className = "message error";
            message.textContent = (data && data.message) ||
                "Incorrect email or password. Please check your details or create an account.";
            return;
        }

        const user = data.user;

        // Store secure session token and non-sensitive user profile
        if (data.token) {
            sessionStorage.setItem("smartlibToken", data.token);
        }
        sessionStorage.setItem("smartlibCurrentUser", JSON.stringify(user));
        sessionStorage.setItem("currentUser", JSON.stringify(user));
        sessionStorage.setItem("smartlibLoggedIn", "true");

        message.className = "message success";
        message.textContent = `Welcome back, ${user.name}. Redirecting...`;

        setTimeout(() => {
            const role = (user.role || "").toLowerCase();
            if (role === "library_admin" || role === "admin") {
                window.location.href = "../adminportal/admin.html";
            } else if (role === "faculty") {
                window.location.href = "../facultyportal/faculty.html";
            } else {
                window.location.href = "../home/studentportal/home.html";
            }
        }, 700);

    } catch (networkError) {
        console.error("[Login Error]", networkError);
        message.className = "message error";
        message.textContent = "Unable to connect to the SmartLib backend server. Please verify the server is running on " + getApiBaseUrl() + ".";
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalBtnText;
    }
});
