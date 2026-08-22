const currentUser = JSON.parse(sessionStorage.getItem("smartlibCurrentUser"));

if (!currentUser || sessionStorage.getItem("smartlibLoggedIn") !== "true") {
    window.location.href = "landingpage/login.html";
}

const users = JSON.parse(localStorage.getItem("smartlibUsers")) || [];
const exams = JSON.parse(localStorage.getItem("smartlibExams")) || [];

const userName = document.getElementById("userName");
const welcomeName = document.getElementById("welcomeName");
const profileName = document.getElementById("profileName");
const profileDetails = document.getElementById("profileDetails");
const profileInitial = document.getElementById("profileInitial");
const departmentValue = document.getElementById("departmentValue");
const yearValue = document.getElementById("yearValue");
const reservationCount = document.getElementById("reservationCount");

userName.textContent = currentUser.name;
welcomeName.textContent = currentUser.name.split(" ")[0];
profileName.textContent = currentUser.name;
profileDetails.textContent = `${currentUser.department} · ${currentUser.year}`;
profileInitial.textContent = currentUser.name.charAt(0).toUpperCase();
departmentValue.textContent = currentUser.department;
yearValue.textContent = currentUser.year;

function countReservations() {
    const possibleKeys = ["smartlibReservations", "reservations"];

    for (const key of possibleKeys) {
        const data = JSON.parse(localStorage.getItem(key) || "null");

        if (Array.isArray(data)) {
            return data.filter(
                item =>
                    item.userId === currentUser.id ||
                    item.email === currentUser.email
            ).length;
        }
    }

    return 0;
}

reservationCount.textContent = countReservations();

function parseDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/*
 * Returns all exams relevant to the logged-in student.
 * The exam must match BOTH:
 * 1. Student's department
 * 2. Student's academic year
 */
function getStudentExams() {
    return exams.filter(exam => {

        const departmentMatches =
            exam.department === currentUser.department;

        const yearMatches =
            exam.year === currentUser.year;

        return departmentMatches && yearMatches;
    });
}

function getCurrentExams() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return getStudentExams().filter(exam => {

        const start = parseDate(exam.startDate);
        const end = parseDate(exam.endDate);

        if (!start || !end) return false;

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return today >= start && today <= end;
    });
}

function getUpcomingExams() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return getStudentExams()
        .filter(exam => {

            const start = parseDate(exam.startDate);

            if (!start) return false;

            start.setHours(0, 0, 0, 0);

            return start > today;
        })
        .sort((a, b) => {
            return new Date(a.startDate) - new Date(b.startDate);
        });
}

function formatDate(value) {
    const date = parseDate(value);

    return date
        ? date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
        : "—";
}

function renderExamStatus() {

    const activeExams = getCurrentExams();
    const upcomingExams = getUpcomingExams();

    const badge = document.getElementById("examBadge");
    const content = document.getElementById("examContent");

    /*
     * ACTIVE EXAMS
     */
    if (activeExams.length > 0) {

        badge.textContent = "EXAM PRIORITY ACTIVE";
        badge.className = "status-badge active";

        const activeHTML = activeExams.map(exam => `
            <div class="exam-row">
                <div>
                    <strong>${exam.name}</strong>
                    <br>
                    <small>${exam.department} · ${exam.year}</small>
                </div>

                <small>
                    ${formatDate(exam.startDate)}
                    —
                    ${formatDate(exam.endDate)}
                </small>
            </div>
        `).join("");

        /*
         * Also show upcoming exams underneath active exams.
         */
        const upcomingHTML = upcomingExams.length > 0
            ? `
                <div style="margin-top: 22px;">
                    <p class="eyebrow" style="margin-bottom: 8px;">
                        UPCOMING EXAMS
                    </p>

                    ${upcomingExams.map(exam => `
                        <div class="exam-row">
                            <div>
                                <strong>${exam.name}</strong>
                                <br>
                                <small>${exam.department} · ${exam.year}</small>
                            </div>

                            <small>
                                ${formatDate(exam.startDate)}
                                —
                                ${formatDate(exam.endDate)}
                            </small>
                        </div>
                    `).join("")}
                </div>
            `
            : "";

        content.innerHTML = activeHTML + upcomingHTML;

        return;
    }

    /*
     * NO ACTIVE EXAM BUT UPCOMING EXAMS EXIST
     */
    if (upcomingExams.length > 0) {

        badge.textContent = "UPCOMING";
        badge.className = "status-badge normal";

        content.innerHTML = `
            <div>
                <p class="exam-empty" style="margin-bottom: 12px;">
                    No active examination currently. Your upcoming examination schedule is shown below.
                </p>

                ${upcomingExams.map(exam => `
                    <div class="exam-row">
                        <div>
                            <strong>${exam.name}</strong>
                            <br>
                            <small>${exam.department} · ${exam.year}</small>
                        </div>

                        <small>
                            ${formatDate(exam.startDate)}
                            —
                            ${formatDate(exam.endDate)}
                        </small>
                    </div>
                `).join("")}
            </div>
        `;

        return;
    }

    /*
     * NO ACTIVE OR UPCOMING EXAMS
     */
    badge.textContent = "NORMAL";
    badge.className = "status-badge normal";

    content.innerHTML = `
        <p class="exam-empty">
            No active or upcoming examination has been recorded for
            ${currentUser.department} ${currentUser.year}.
            Your reservation requests will use the standard priority rules.
        </p>
    `;
}

renderExamStatus();

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("smartlibCurrentUser");
    sessionStorage.removeItem("smartlibLoggedIn");

    window.location.href = "../../landingpage/landingpage.html";
});


function renderStudentExtras() {

    const u = JSON.parse(
        sessionStorage.getItem("smartlibCurrentUser") ||
        sessionStorage.getItem("currentUser") ||
        "null"
    );

    if (!u) return;

    const $ = id => document.getElementById(id);

    if ($("profileName"))
        $("profileName").textContent = u.name || "—";

    if ($("profileDepartment"))
        $("profileDepartment").textContent = u.department || "—";

    if ($("profileYear"))
        $("profileYear").textContent =
            u.year ? u.year + " Year" : "—";


    /*
     * Student exam countdown.
     * Uses the same smartlibExams data created by
     * Faculty and Library Administration.
     */
    const studentExams = JSON.parse(
        localStorage.getItem("smartlibExams") || "[]"
    ).filter(exam =>
        exam.department === u.department &&
        exam.year === u.year
    );


    const now = new Date();

    const active = studentExams.find(exam => {

        const start = new Date(
            exam.startDate || exam.start
        );

        const end = new Date(
            exam.endDate || exam.end
        );

        return now >= start && now <= end;
    });


    const next = studentExams
        .filter(exam => {

            const start = new Date(
                exam.startDate || exam.start
            );

            return start > now;
        })
        .sort((a, b) =>
            new Date(a.startDate || a.start) -
            new Date(b.startDate || b.start)
        )[0];


    if ($("examCountdown")) {

        $("examCountdown").innerHTML = active
            ? `
                <strong>
                    ${active.name || "Examination"}
                </strong>
                <span>
                    Active now
                </span>
            `
            : next
                ? `
                    <strong>
                        ${next.name || "Upcoming examination"}
                    </strong>
                    <span>
                        Starts ${next.startDate || next.start}
                    </span>
                `
                : `
                    <strong>
                        No upcoming exams
                    </strong>
                    <span>
                        Your department has no scheduled examinations.
                    </span>
                `;
    }


    /*
     * Reservation information
     */
    const rs = JSON.parse(
        localStorage.getItem("smartlibReservations") || "[]"
    ).filter(
        r =>
            r.userId === u.id ||
            r.email === u.email
    );


    if ($("activeReservations"))
        $("activeReservations").textContent =
            rs.filter(
                r => (r.status || "active") === "active"
            ).length;


    const q = rs.find(
        r => r.status === "queued"
    );


    if ($("queuePosition"))
        $("queuePosition").textContent =
            q?.position ?? "—";


    if ($("nextReservation"))
        $("nextReservation").textContent =
            rs[0]?.resourceName ||
            rs[0]?.seatName ||
            "None";
}


document.addEventListener(
    "DOMContentLoaded",
    renderStudentExtras
);