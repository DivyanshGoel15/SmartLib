const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

const getUsers = () => JSON.parse(localStorage.getItem("smartlibUsers")) || [];

function setError(id, text) {
    document.getElementById(id).textContent = text;
}

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    document.querySelectorAll(".field-error").forEach(item => item.textContent = "");
    message.className = "message";
    message.textContent = "";

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

    const user = getUsers().find(
        item => item.email === email && item.password === password
    );

    if (!user) {
        message.className = "message error";
        message.textContent =
            "Incorrect email or password. Please check your details or create an account.";
        return;
    }

    sessionStorage.setItem(
        "smartlibCurrentUser",
        JSON.stringify(user)
    );

    sessionStorage.setItem(
        "smartlibLoggedIn",
        "true"
    );

    message.className = "message success";
    message.textContent =
        `Welcome back, ${user.name}. Redirecting...`;

    setTimeout(() => {

        if (user.role === "library_admin") {

            window.location.href =
                "../adminportal/admin.html";

        } else if (user.role === "faculty") {

            window.location.href =
                "../facultyportal/faculty.html";

        } else {

            window.location.href =
                "../home/studentportal/home.html";

        }

    }, 700);
});