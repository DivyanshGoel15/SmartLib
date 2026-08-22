const signupForm = document.getElementById("signupForm");
const roleSelect = document.getElementById("role");
const yearField = document.getElementById("yearField");
const departmentField = document.getElementById("departmentField");
const academicFields = document.getElementById("academicFields");
const message = document.getElementById("message");
const passwordInput = document.getElementById("password");
const passwordStrengthBar = document.getElementById("passwordStrengthBar");
const passwordHint = document.getElementById("passwordHint");

const getUsers = () => JSON.parse(localStorage.getItem("smartlibUsers")) || [];
const saveUsers = users => localStorage.setItem("smartlibUsers", JSON.stringify(users));

function setError(id, text) {
    document.getElementById(id).textContent = text;
}

function clearErrors() {
    document.querySelectorAll(".field-error").forEach(item => item.textContent = "");
    message.className = "message";
    message.textContent = "";
}

function toggleAcademicFields() {
    const role = roleSelect.value;
    const isStudent = role === "student";
    const isAdmin = role === "library_admin";

    departmentField.style.display = isAdmin ? "none" : "block";
    yearField.style.display = isStudent ? "block" : "none";
    academicFields.style.display = isAdmin ? "block" : "grid";

    document.getElementById("department").required = !isAdmin;
    document.getElementById("year").required = isStudent;

    if (isAdmin) {
        document.getElementById("department").value = "";
        document.getElementById("year").value = "";
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

signupForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearErrors();

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const department = document.getElementById("department").value;
    const year = document.getElementById("year").value;
    const role = roleSelect.value;
    const password = passwordInput.value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    let valid = true;

    if (name.length < 2) { setError("fullNameError", "Please enter your full name."); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("emailError", "Enter a valid email address."); valid = false; }
    if (role !== "library_admin" && !department) { setError("departmentError", "Select a department."); valid = false; }
    if (role === "student" && !year) { setError("yearError", "Select your year."); valid = false; }
    if (!isStrongPassword(password)) {
        setError("passwordError", "Use 8+ characters with uppercase, lowercase, number and special character.");
        valid = false;
    }
    if (password !== confirmPassword) { setError("confirmPasswordError", "Passwords do not match."); valid = false; }

    const users = getUsers();
    if (users.some(user => user.email === email)) {
        setError("emailError", "An account with this email already exists.");
        valid = false;
    }

    if (!valid) return;

    const newUser = {
        id: Date.now(),
        name,
        email,
        department: role === "library_admin" ? "" : department,
        year: role === "student" ? year : "Staff",
        role,
        password,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    message.className = "message success";
    message.textContent = "Account created successfully. Redirecting you to login...";

    signupForm.reset();
    toggleAcademicFields();
    updatePasswordStrength();

    setTimeout(() => {
        window.location.href = "login.html";
    }, 900);
});
