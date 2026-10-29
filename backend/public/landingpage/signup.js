const signupForm = document.getElementById("signupForm");
const roleSelect = document.getElementById("role");
const yearField = document.getElementById("yearField");
const departmentField = document.getElementById("departmentField");
const academicFields = document.getElementById("academicFields");
const facultySecretField = document.getElementById("facultySecretField");
const message = document.getElementById("message");
const passwordInput = document.getElementById("password");
const passwordStrengthBar = document.getElementById("passwordStrengthBar");
const passwordHint = document.getElementById("passwordHint");
const submitButton = signupForm.querySelector("button[type='submit']");

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

function toggleAcademicFields() {
    const role = roleSelect.value;
    const isStudent = role === "student";
    const isFaculty = role === "faculty";

    departmentField.style.display = "block";
    yearField.style.display = isStudent ? "block" : "none";
    academicFields.style.display = "grid";
    if (facultySecretField) facultySecretField.style.display = isFaculty ? "block" : "none";

    document.getElementById("department").required = true;
    document.getElementById("year").required = isStudent;

    if (!isFaculty) {
        const facultySecretInput = document.getElementById("facultySecret");
        if (facultySecretInput) facultySecretInput.value = "";
    }
}

function passwordChecks(password) {
    return {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };
}

function isStrongPassword(password) {
    const checks = passwordChecks(password);
    return Object.values(checks).every(Boolean);
}

function updatePasswordStrength() {
    const checks = passwordChecks(passwordInput.value);
    const score = Object.values(checks).filter(Boolean).length;
    const widths = [0, 20, 40, 60, 80, 100];
    passwordStrengthBar.style.width = `${widths[score]}%`;

    if (!passwordInput.value) {
        passwordStrengthBar.className = "";
        passwordHint.textContent = "Minimum 8 characters with uppercase, lowercase, number and special character.";
    } else if (score < 3) {
        passwordStrengthBar.className = "weak";
        passwordHint.textContent = "Weak password — add uppercase, lowercase, numbers and symbols.";
    } else if (score < 5) {
        passwordStrengthBar.className = "medium";
        passwordHint.textContent = "Almost there — meet all password requirements.";
    } else {
        passwordStrengthBar.className = "strong";
        passwordHint.textContent = "Strong password.";
    }
}

roleSelect.addEventListener("change", toggleAcademicFields);
passwordInput.addEventListener("input", updatePasswordStrength);
toggleAcademicFields();
updatePasswordStrength();

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearErrors();

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const department = document.getElementById("department").value;
    const year = document.getElementById("year").value;
    const role = roleSelect.value;
    const password = passwordInput.value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const facultySecretInput = document.getElementById("facultySecret");
    const facultySecret = facultySecretInput ? facultySecretInput.value.trim() : "";

    let valid = true;

    if (name.length < 2) { setError("fullNameError", "Please enter your full name."); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("emailError", "Enter a valid email address."); valid = false; }
    if (!department) { setError("departmentError", "Select a department."); valid = false; }
    if (role === "student" && !year) { setError("yearError", "Select your year."); valid = false; }
    if (role === "faculty" && !facultySecret) {
        setError("facultySecretError", "Faculty onboarding code is required.");
        valid = false;
    }
    if (!isStrongPassword(password)) {
        setError("passwordError", "Use 8+ characters with uppercase, lowercase, number and special character.");
        valid = false;
    }
    if (password !== confirmPassword) { setError("confirmPasswordError", "Passwords do not match."); valid = false; }

    if (!valid) return;

    const originalBtnText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = "Creating account...";

    const activeApiUrl = getApiBaseUrl();

    try {
        const payload = {
            name,
            email,
            department,
            year: role === "student" ? year : "Staff",
            role,
            password
        };

        if (role === "faculty") {
            payload.facultySecret = facultySecret;
        }

        const response = await fetch(`${activeApiUrl}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data || !data.success) {
            const errorMsg = (data && data.message) || "Failed to create account. Please try again.";
            message.className = "message error";
            message.textContent = errorMsg;

            if (response.status === 409 || errorMsg.toLowerCase().includes("email")) {
                setError("emailError", errorMsg);
            }
            return;
        }

        message.className = "message success";
        message.textContent = "Account created successfully. Redirecting you to login...";

        signupForm.reset();
        toggleAcademicFields();
        updatePasswordStrength();

        setTimeout(() => {
            window.location.href = "login.html";
        }, 900);

    } catch (networkError) {
        console.error("[Signup Error]", networkError);
        message.className = "message error";
        message.textContent = "Unable to connect to the SmartLib backend server. Please verify the server is running on " + getApiBaseUrl() + ".";
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalBtnText;
    }
});
