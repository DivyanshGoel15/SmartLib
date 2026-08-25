const currentUser = JSON.parse(sessionStorage.getItem("smartlibCurrentUser") || sessionStorage.getItem("currentUser") || "null");
if (!currentUser || currentUser.role !== "faculty" || sessionStorage.getItem("smartlibLoggedIn") !== "true") {
    window.location.href = "../landingpage/login.html";
}

let exams = JSON.parse(localStorage.getItem("smartlibExams") || "[]");
const today = new Date();
today.setHours(0, 0, 0, 0);

function saveExams() { localStorage.setItem("smartlibExams", JSON.stringify(exams)); }

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getStatus(exam) {
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Unknown";
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (today >= start && today <= end) return "Active";
    return today < start ? "Upcoming" : "Finished";
}

function departmentExams() {
    return exams.filter(exam => exam.department === currentUser.department)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

function render() {
    const list = departmentExams();
    const active = list.filter(exam => getStatus(exam) === "Active");
    const upcoming = list.filter(exam => getStatus(exam) === "Upcoming");

    document.getElementById("facultyName").textContent = currentUser.name;
    document.getElementById("welcomeName").textContent = currentUser.name.split(" ")[0];
    document.getElementById("departmentValue").textContent = currentUser.department || "—";
    document.getElementById("departmentStat").textContent = currentUser.department || "—";
    document.getElementById("activeExamCount").textContent = active.length;
    document.getElementById("upcomingExamCount").textContent = upcoming.length;

    const body = document.getElementById("examTableBody");
    if (!list.length) {
        body.innerHTML = `<tr><td colspan="4" class="empty">No examinations have been scheduled for your department yet.</td></tr>`;
        return;
    }
    body.innerHTML = list.map(exam => {
        const status = getStatus(exam);
        return `<tr><td><strong>${exam.year}</strong></td><td>${exam.name}</td><td><small>${formatDate(exam.startDate)} — ${formatDate(exam.endDate)}</small></td><td><span class="status ${status.toLowerCase()}">${status.toUpperCase()}</span></td></tr>`;
    }).join("");
}

function openFacultyModal() {
    document.getElementById("facultyExamModal").classList.remove("hidden");
    document.getElementById("facultyExamForm").reset();
    document.getElementById("facultyModalError").textContent = "";
}

function closeFacultyModal() { document.getElementById("facultyExamModal").classList.add("hidden"); }

document.getElementById("addFacultyExamBtn").addEventListener("click", openFacultyModal);
document.getElementById("closeFacultyModal").addEventListener("click", closeFacultyModal);
document.getElementById("facultyExamModal").addEventListener("click", event => {
    if (event.target.id === "facultyExamModal") closeFacultyModal();
});

document.getElementById("facultyExamForm").addEventListener("submit", event => {
    event.preventDefault();
    const start = document.getElementById("facultyExamStart").value;
    const end = document.getElementById("facultyExamEnd").value;
    const time = document.getElementById("facultyExamTime").value;
    const error = document.getElementById("facultyModalError");
    if (new Date(end) < new Date(start)) {
        error.textContent = "End date cannot be before start date.";
        return;
    }
   exams.push({

    id:
        Date.now(),

    department:
        currentUser.department,

    year:
        document.getElementById(
            "facultyExamYear"
        ).value,

    name:
        document.getElementById(
            "facultyExamName"
        ).value.trim(),

    startDate:
        start,

    endDate:
        end,

    time:
        time,

    createdBy:
        currentUser.id,

    createdByRole:
        "faculty"

});
    saveExams();
    closeFacultyModal();
    render();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("smartlibCurrentUser");
    sessionStorage.removeItem("smartlibLoggedIn");

    window.location.href = "../../landingpage/landingpage.html";
});

render();

