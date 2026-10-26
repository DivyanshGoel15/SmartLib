const API_BASE_URL = (window.SMARTLIB_CONFIG && window.SMARTLIB_CONFIG.API_BASE_URL) || "http://localhost:5000/api";

const currentUser = JSON.parse(sessionStorage.getItem("smartlibCurrentUser") || sessionStorage.getItem("currentUser") || "null");
const currentToken = sessionStorage.getItem("smartlibToken");
if (!currentUser || currentUser.role !== "faculty" || sessionStorage.getItem("smartlibLoggedIn") !== "true") {
    window.location.href = "../landingpage/login.html";
}

function getFacultyHeaders(includeJson = false) {
    const headers = {};
    if (includeJson) {
        headers["Content-Type"] = "application/json";
    }
    const token = sessionStorage.getItem("smartlibToken");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

let exams = [];
const today = new Date();
today.setHours(0, 0, 0, 0);

function formatDate(value) {
    if (!value || value === "—") return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getStatus(exam) {
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate || exam.startDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Unknown";
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (today >= start && today <= end) return "Active";
    return today < start ? "Upcoming" : "Finished";
}

async function loadDepartmentExams() {
    const body = document.getElementById("examTableBody");
    body.innerHTML = `<tr><td colspan="5" class="empty">Loading department examinations...</td></tr>`;

    try {
        const dept = currentUser.department || "";
        const response = await fetch(`${API_BASE_URL}/exams/department/${encodeURIComponent(dept)}`);
        const data = await response.json().catch(() => null);

        if (response.ok && data && Array.isArray(data.data)) {
            exams = data.data;
        } else {
            // Fallback to local storage if API is temporarily unavailable
            exams = JSON.parse(localStorage.getItem("smartlibExams") || "[]")
                .filter(item => item.department === currentUser.department);
        }
    } catch (err) {
        console.warn("[Faculty Portal] Failed to fetch exams from API, using fallback:", err);
        exams = JSON.parse(localStorage.getItem("smartlibExams") || "[]")
            .filter(item => item.department === currentUser.department);
    }

    render();
}

function render() {
    const active = exams.filter(exam => getStatus(exam) === "Active");
    const upcoming = exams.filter(exam => getStatus(exam) === "Upcoming");

    document.getElementById("facultyName").textContent = currentUser.name || "Faculty";
    document.getElementById("welcomeName").textContent = (currentUser.name || "Faculty").split(" ")[0];
    document.getElementById("departmentValue").textContent = currentUser.department || "—";
    document.getElementById("departmentStat").textContent = currentUser.department || "—";
    document.getElementById("activeExamCount").textContent = active.length;
    document.getElementById("upcomingExamCount").textContent = upcoming.length;

    const body = document.getElementById("examTableBody");
    if (!exams.length) {
        body.innerHTML = `<tr><td colspan="5" class="empty">No examinations have been scheduled for your department yet.</td></tr>`;
        return;
    }

    body.innerHTML = exams.map(exam => {
        const status = getStatus(exam);
        const examId = exam.id || exam._id || exam.customId || "";
        return `<tr>
            <td><strong>${exam.year || "All Years"}</strong></td>
            <td>${exam.name}</td>
            <td><small>${formatDate(exam.startDate)} — ${formatDate(exam.endDate)}</small></td>
            <td><span class="status ${status.toLowerCase()}">${status.toUpperCase()}</span></td>
            <td>
                <button type="button" class="logout" style="padding: 5px 10px; font-size: 11px; color: #8d3d32; border-color: #8d3d32;" onclick="deleteFacultyExam('${examId}')">Delete</button>
            </td>
        </tr>`;
    }).join("");
}

window.deleteFacultyExam = async function(examId) {
    if (!examId) return;

    const exam = exams.find(e => (e.id === examId || e._id === examId || e.customId === examId));
    const examName = exam ? exam.name : "this examination";

    if (!confirm(`Are you sure you want to delete "${examName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/exams/${encodeURIComponent(examId)}`, {
            method: "DELETE",
            headers: getFacultyHeaders()
        });

        if (!response.ok) {
            const data = await response.json().catch(() => null);
            alert((data && data.message) || "Failed to delete examination.");
            return;
        }

        // Reconcile and refresh
        await loadDepartmentExams();
    } catch (err) {
        console.error("[Faculty Portal] Delete error:", err);
        alert("Network error: Could not reach backend server to delete examination.");
    }
};

function openFacultyModal() {
    document.getElementById("facultyExamModal").classList.remove("hidden");
    document.getElementById("facultyExamForm").reset();
    document.getElementById("facultyModalError").textContent = "";
}

function closeFacultyModal() {
    document.getElementById("facultyExamModal").classList.add("hidden");
}

document.getElementById("addFacultyExamBtn").addEventListener("click", openFacultyModal);
document.getElementById("closeFacultyModal").addEventListener("click", closeFacultyModal);
document.getElementById("facultyExamModal").addEventListener("click", event => {
    if (event.target.id === "facultyExamModal") closeFacultyModal();
});

document.getElementById("facultyExamForm").addEventListener("submit", async event => {
    event.preventDefault();
    const start = document.getElementById("facultyExamStart").value;
    const end = document.getElementById("facultyExamEnd").value;
    const time = document.getElementById("facultyExamTime").value;
    const year = document.getElementById("facultyExamYear").value;
    const name = document.getElementById("facultyExamName").value.trim();
    const error = document.getElementById("facultyModalError");

    if (new Date(end) < new Date(start)) {
        error.textContent = "End date cannot be before start date.";
        return;
    }

    const submitBtn = event.target.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Saving...";

    const newExamPayload = {
        name,
        department: currentUser.department,
        year,
        startDate: start,
        endDate: end,
        time,
        facultyName: currentUser.name,
        createdByFaculty: currentUser.name,
        createdBy: currentUser.id || currentUser._id,
        createdByRole: "faculty"
    };

    try {
        const response = await fetch(`${API_BASE_URL}/exams`, {
            method: "POST",
            headers: getFacultyHeaders(true),
            body: JSON.stringify(newExamPayload)
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data || !data.success) {
            error.textContent = (data && data.message) || "Failed to save examination.";
            return;
        }

        closeFacultyModal();
        await loadDepartmentExams();
    } catch (err) {
        console.error("[Faculty Portal] Save exam error:", err);
        error.textContent = "Unable to connect to server. Check backend connection.";
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("smartlibToken");
    sessionStorage.removeItem("smartlibCurrentUser");
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("smartlibLoggedIn");

    window.location.href = "../landingpage/landingpage.html";
});

// Initial load
loadDepartmentExams();
