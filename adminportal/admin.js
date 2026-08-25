/*
============================================================
SMARTLIB
LIBRARY STAFF ADMINISTRATION
============================================================
*/


/*
============================================================
1. DOM ELEMENTS
============================================================
*/

const resourceTableBody =
    document.getElementById("resourceTableBody");

const reservationTableBody =
    document.getElementById("reservationTableBody");

const resourceCount =
    document.getElementById("resourceCount");

const availableCount =
    document.getElementById("availableCount");

const reservationCount =
    document.getElementById("reservationCount");

const studentCount =
    document.getElementById("studentCount");

const activityFeed =
    document.getElementById("activityFeed");

const message =
    document.getElementById("message");



/*
============================================================
2. STORAGE
============================================================
*/

function getResources() {

    return JSON.parse(
        localStorage.getItem("libraryResources") || "[]"
    );

}


function saveResources(resources) {

    localStorage.setItem(
        "libraryResources",
        JSON.stringify(resources)
    );

}


function getReservations() {

    return JSON.parse(
        localStorage.getItem("libraryReservations") || "[]"
    );

}


function saveReservations(reservations) {

    localStorage.setItem(
        "libraryReservations",
        JSON.stringify(reservations)
    );

}


/*
============================================================
3. STUDENTS
============================================================
*/

function getUsers() {

    try {

        return JSON.parse(
            localStorage.getItem("smartlibUsers") || "[]"
        );

    } catch (error) {

        console.error(
            "Error reading SmartLib users:",
            error
        );

        return [];

    }

}


/*
============================================================
4. MESSAGE
============================================================
*/

function showMessage(text, type = "success") {

    message.textContent = text;

    message.className =
        "message " + type;

    message.style.display =
        "block";


    setTimeout(() => {

        message.style.display =
            "none";

    }, 3000);

}



/*
============================================================
5. ID GENERATOR
============================================================
*/

function generateId(prefix) {

    return (
        prefix +
        Date.now() +
        Math.floor(
            Math.random() * 1000
        )
    );

}



/*
============================================================
6. STATS
============================================================
*/

function renderStats() {

    const resources =
        getResources();

    const reservations =
        getReservations();

    const users =
        getUsers();


    /* =====================================================
       1. TOTAL RESOURCE TYPES
       ===================================================== */

    const totalResourceTypes =
        resources.length;


    /* =====================================================
       2. AVAILABLE COPIES
       ===================================================== */

    const totalAvailableCopies =
        resources.reduce(
            (total, resource) => {

                return (
                    total +
                    Number(
                        resource.availableQuantity || 0
                    )
                );

            },
            0
        );


    /* =====================================================
       3. ACTIVE RESERVATIONS
       ===================================================== */

    const activeReservations =
        reservations.filter(
            reservation =>
                reservation.status === "active"
        ).length;


    /* =====================================================
       4. REGISTERED STUDENTS
       ===================================================== */

    const registeredStudents =
        users.filter(
            user =>
                user.role === "student"
        ).length;


    /* =====================================================
       UPDATE DASHBOARD
       ===================================================== */

    resourceCount.textContent =
        totalResourceTypes;

    availableCount.textContent =
        totalAvailableCopies;

    reservationCount.textContent =
        activeReservations;

    studentCount.textContent =
        registeredStudents;

}



/*
============================================================
7. RESOURCE FILTERS
============================================================
*/

function populateDepartmentFilter() {

    const resources =
        getResources();

    const departments =
        [
            ...new Set(
                resources.map(
                    resource =>
                        resource.department
                )
            )
        ];


    const select =
        document.getElementById(
            "resourceDepartmentFilter"
        );


    select.innerHTML =
        `<option value="">All departments</option>`;


    departments.forEach(
        department => {

            const option =
                document.createElement("option");

            option.value =
                department;

            option.textContent =
                department;

            select.appendChild(option);

        }
    );

}



/*
============================================================
8. RENDER RESOURCES
============================================================
*/

function renderResources() {

    const resources =
        getResources();


    const search =
        document.getElementById(
            "resourceSearch"
        )
        .value
        .trim()
        .toLowerCase();


    const type =
        document.getElementById(
            "resourceTypeFilter"
        )
        .value;


    const department =
        document.getElementById(
            "resourceDepartmentFilter"
        )
        .value;


    const filtered =
        resources.filter(
            resource => {

                const matchesSearch =
                    resource.name
                        .toLowerCase()
                        .includes(search);


                const matchesType =
                    !type ||
                    resource.type === type;


                const matchesDepartment =
                    !department ||
                    resource.department === department;


                return (
                    matchesSearch &&
                    matchesType &&
                    matchesDepartment
                );

            }
        );


    resourceTableBody.innerHTML =
        "";


    if (filtered.length === 0) {

        resourceTableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty-table"
                >
                    No resources found.
                </td>

            </tr>

        `;

        return;

    }


    filtered.forEach(
        resource => {

            const total =
                Number(
                    resource.totalQuantity || 0
                );

            const available =
                Number(
                    resource.availableQuantity || 0
                );

            const issued =
                total - available;


            let status =
                "Available";

            let statusClass =
                "available";


            if (available === 0) {

                status =
                    "Fully issued";

                statusClass =
                    "unavailable";

            }

            else if (
                available <=
                total * 0.4
            ) {

                status =
                    "Limited";

                statusClass =
                    "warning";

            }


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>

                    <strong>
                        ${escapeHTML(resource.name)}
                    </strong>

                    <small>
                        ${resource.id}
                    </small>

                </td>


                <td>
                    ${escapeHTML(resource.type)}
                </td>


                <td>
                    ${escapeHTML(resource.department)}
                </td>


                <td>

                    <strong>
                        ${available}
                    </strong>

                    / ${total}

                    <small>
                        ${issued} issued
                    </small>

                </td>


                <td>

                    <span
                        class="status-badge ${statusClass}"
                    >
                        ${status}
                    </span>

                </td>


                <td>

                    <button
                        class="danger-button"
                        onclick="deleteResource('${resource.id}')"
                    >
                        Delete
                    </button>

                </td>

            `;


            resourceTableBody.appendChild(row);

        }
    );

}



/*
============================================================
9. ADD RESOURCE
============================================================
*/

function addResource(event) {

    event.preventDefault();


    const name =
        document.getElementById(
            "resourceName"
        )
        .value
        .trim();


    const type =
        document.getElementById(
            "resourceType"
        )
        .value;


    const department =
        document.getElementById(
            "resourceDepartment"
        )
        .value;


    const quantity =
        Number(
            document.getElementById(
                "resourceQuantity"
            ).value
        );


    const error =
        document.getElementById(
            "resourceModalError"
        );


    error.textContent =
        "";


    if (
        !name ||
        !type ||
        !department ||
        quantity < 1
    ) {

        error.textContent =
            "Please enter valid resource details.";

        return;

    }


    const resources =
        getResources();


    const duplicate =
        resources.some(
            resource =>
                resource.name
                    .toLowerCase() ===
                name.toLowerCase() &&
                resource.department ===
                department
        );


    if (duplicate) {

        error.textContent =
            "This resource already exists.";

        return;

    }


    const newResource = {

        id:
            generateId("RES"),

        name:
            name,

        type:
            type,

        department:
            department,

        totalQuantity:
            quantity,

        availableQuantity:
            quantity

    };


    resources.push(
        newResource
    );


    saveResources(
        resources
    );


    closeResourceModal();


    document.getElementById(
        "resourceForm"
    ).reset();


    refreshDashboard();


    showMessage(
        "Resource added successfully."
    );

}



/*
============================================================
10. DELETE RESOURCE
============================================================
*/

function deleteResource(resourceId) {

    const resources =
        getResources();

    const reservations =
        getReservations();


    const resource =
        resources.find(
            item =>
                item.id === resourceId
        );


    if (!resource) {

        return;

    }


    const activeReservation =
        reservations.some(
            reservation =>
                reservation.resourceId ===
                    resourceId &&
                reservation.status ===
                    "active"
        );


    if (activeReservation) {

        showMessage(
            "Cannot delete a resource with an active reservation.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete "${resource.name}"?`
        );


    if (!confirmed) {

        return;

    }


    const updatedResources =
        resources.filter(
            item =>
                item.id !== resourceId
        );


    saveResources(
        updatedResources
    );


    refreshDashboard();


    showMessage(
        "Resource deleted."
    );

}



/*
============================================================
11. RENDER RESERVATIONS
============================================================
*/

function renderReservations() {

    const reservations =
        getReservations();

    const resources =
        getResources();

    const users =
        getUsers();


    const search =
        document.getElementById(
            "reservationSearch"
        )
        .value
        .trim()
        .toLowerCase();


    const status =
        document.getElementById(
            "reservationStatusFilter"
        )
        .value;


    const filtered =
        reservations.filter(
            reservation => {

                const user =
                    users.find(
                        item =>
                            String(item.id) ===
                            String(reservation.userId)
                    );


                const userName =
                 reservation.userName ||
                  user?.name ||
                  "Unknown User";


                const resourceName =
                    reservation.resourceName ||
                    "Unknown Resource";


                const searchable =
                    (
                        userName +
                        " " +
                        resourceName +
                        " " +
                        (user?.email || "") +
                        " " +
                        (user?.department || "")
                    )
                    .toLowerCase();


                const matchesSearch =
                    searchable.includes(
                        search
                    );


                const matchesStatus =
                    !status ||
                    reservation.status === status;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    reservationTableBody.innerHTML =
        "";


    if (filtered.length === 0) {

        reservationTableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty-table"
                >
                    No reservations found.
                </td>

            </tr>

        `;

        return;

    }


    filtered
        .sort(
            (a, b) =>
                new Date(b.reservedAt) -
                new Date(a.reservedAt)
        )
        .forEach(
            reservation => {

                const user =
                    users.find(
                        item =>
                            String(item.id) ===
                            String(reservation.userId)
                    );


                const resource =
                    resources.find(
                        item =>
                            item.id ===
                            reservation.resourceId
                    );


                const userName =
                    user?.name ||
                    "Unknown User";


                const userRole =
                    user?.role ||
                    "unknown";


                const roleLabel =
                    userRole === "faculty"
                        ? "Faculty"
                        : userRole === "student"
                            ? "Student"
                            : userRole === "library_admin"
                                ? "Library Admin"
                                : "Unknown";


                const department =
                     reservation.department ||
                     user?.department ||
                     resource?.department ||
                     "—";


                const email =
                    user?.email ||
                    "No email available";


                const date =
                    reservation.reservedAt
                        ? new Date(
                            reservation.reservedAt
                        ).toLocaleDateString(
                            "en-IN",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        )
                        : "—";


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <strong>
                            ${escapeHTML(userName)}
                        </strong>

                        <small>
                            ${roleLabel}
                        </small>

                        <small>
                            ${escapeHTML(email)}
                        </small>

                    </td>


                    <td>

                        <strong>
                            ${escapeHTML(
                                reservation.resourceName ||
                                resource?.name ||
                                "Unknown Resource"
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                resource?.type ||
                                ""
                            )}
                        </small>

                    </td>


                    <td>
                        ${escapeHTML(department)}
                    </td>


                    <td>
                        ${date}
                    </td>


                    <td>

                        <span
                            class="status-badge ${getReservationStatusClass(reservation.status)}"
                        >
                            ${reservation.status}
                        </span>

                    </td>


                    <td>

                        ${
                            reservation.status === "active"

                            ?

                            `
                            <button
                                class="danger-button"
                                onclick="cancelReservation('${reservation.id}')"
                            >
                                Cancel
                            </button>
                            `

                            :

                            `
                            <button
                                class="danger-button"
                                onclick="deleteReservation('${reservation.id}')"
                            >
                                Delete
                            </button>
                            `
                        }

                    </td>

                `;


                reservationTableBody.appendChild(
                    row
                );

            }
        );

}



/*
============================================================
12. RESERVATION STATUS
============================================================
*/

function getReservationStatusClass(status) {

    if (status === "active") {

        return "available";

    }


    if (status === "returned") {

        return "returned";

    }


    return "cancelled";

}



/*
============================================================
13. CANCEL RESERVATION
============================================================
*/

function cancelReservation(
    reservationId
) {

    const reservations =
        getReservations();

    const resources =
        getResources();


    const reservation =
        reservations.find(
            item =>
                item.id ===
                reservationId
        );


    if (
        !reservation ||
        reservation.status !== "active"
    ) {

        return;

    }


    const confirmed =
        confirm(
            "Cancel this reservation?"
        );


    if (!confirmed) {

        return;

    }


    reservation.status =
        "cancelled";


    reservation.returnedAt =
        new Date().toISOString();


    const resource =
        resources.find(
            item =>
                item.id ===
                reservation.resourceId
        );


    if (resource) {

        resource.availableQuantity =
            Math.min(
                Number(resource.availableQuantity || 0) + 1,
                Number(resource.totalQuantity || 0)
            );

    }


    saveReservations(
        reservations
    );


    saveResources(
        resources
    );


    refreshDashboard();


    showMessage(
        "Reservation cancelled and resource returned."
    );

}



/*
============================================================
14. DELETE RESERVATION
============================================================
*/

function deleteReservation(
    reservationId
) {

    const reservations =
        getReservations();


    const confirmed =
        confirm(
            "Delete this reservation record?"
        );


    if (!confirmed) {

        return;

    }


    const updated =
        reservations.filter(
            reservation =>
                reservation.id !==
                reservationId
        );


    saveReservations(
        updated
    );


    refreshDashboard();


    showMessage(
        "Reservation record deleted."
    );

}



/*
============================================================
15. ACTIVITY FEED
============================================================
*/

function renderActivity() {

    const reservations =
        getReservations();


    const activities =
        reservations
            .sort(
                (a, b) =>
                    new Date(b.reservedAt) -
                    new Date(a.reservedAt)
            )
            .slice(0, 8);


    activityFeed.innerHTML =
        "";


    if (activities.length === 0) {

        activityFeed.innerHTML = `

            <div class="empty-state">

                No recent library activity.

            </div>

        `;

        return;

    }


    activities.forEach(
        reservation => {

            const item =
                document.createElement("div");


            item.className =
                "activity-item";


            const date =
                reservation.reservedAt
                    ? new Date(
                        reservation.reservedAt
                    ).toLocaleString(
                        "en-IN"
                    )
                    : "";


            item.innerHTML = `

                <div class="activity-dot"></div>

                <div>

                    <strong>
                        ${escapeHTML(
                            reservation.resourceName ||
                            "Resource"
                        )}
                    </strong>

                    <p>
                        Reservation created
                    </p>

                    <small>
                        ${date}
                    </small>

                </div>

            `;


            activityFeed.appendChild(
                item
            );

        }
    );

}



/*
============================================================
16. MODAL
============================================================
*/

const resourceModal =
    document.getElementById(
        "resourceModal"
    );


function openResourceModal() {

    resourceModal.classList.remove(
        "hidden"
    );

}


function closeResourceModal() {

    resourceModal.classList.add(
        "hidden"
    );

}


document
    .getElementById("addResourceBtn")
    .addEventListener(
        "click",
        openResourceModal
    );


document
    .getElementById("addResourceBtnTop")
    .addEventListener(
        "click",
        openResourceModal
    );


document
    .getElementById("closeResourceModal")
    .addEventListener(
        "click",
        closeResourceModal
    );



/*
============================================================
17. SEARCH / FILTERS
============================================================
*/

document
    .getElementById("resourceSearch")
    .addEventListener(
        "input",
        renderResources
    );


document
    .getElementById("resourceTypeFilter")
    .addEventListener(
        "change",
        renderResources
    );


document
    .getElementById("resourceDepartmentFilter")
    .addEventListener(
        "change",
        renderResources
    );


document
    .getElementById("reservationSearch")
    .addEventListener(
        "input",
        renderReservations
    );


document
    .getElementById("reservationStatusFilter")
    .addEventListener(
        "change",
        renderReservations
    );



/*
============================================================
18. FORM
============================================================
*/

document
    .getElementById("resourceForm")
    .addEventListener(
        "submit",
        addResource
    );



/*
============================================================
19. LOGOUT
============================================================
*/

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        function () {

            sessionStorage.removeItem(
                "currentUser"
            );

            sessionStorage.removeItem(
                "smartlibCurrentUser"
            );

            sessionStorage.removeItem(
                "smartlibLoggedIn"
            );


            window.location.href =
                "../landingpage/login.html";

        }
    );



/*
============================================================
20. HTML ESCAPE
============================================================
*/

function escapeHTML(value) {

    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



/*
============================================================
21. REFRESH
============================================================
*/

function refreshDashboard() {

    renderStats();

    populateDepartmentFilter();

    renderResources();

    renderReservations();

    renderActivity();

}



/*
============================================================
22. INITIALIZE
============================================================
*/

refreshDashboard();


/* ============================================================
   SMARTLIB ADMIN EXTENSION
   STUDENT + EXAM MANAGEMENT
   ============================================================ */

(function initializeAdminExtension() {

    const EXAMS_KEY = "smartlibExams";


    /* =========================================================
       STUDENTS
       ========================================================= */

    function getStudents() {

        return getUsers().filter(
            user =>
                user &&
                user.role === "student"
        );

    }


    function saveUsers(users) {

        localStorage.setItem(
            "smartlibUsers",
            JSON.stringify(users)
        );

    }


    /* =========================================================
       EXAMS STORAGE
       ========================================================= */

    function getExams() {

        const possibleKeys = [
            "smartlibExams",
            "libraryExams",
            "exams",
            "libraryExamsData"
        ];


        for (const key of possibleKeys) {

            try {

                const data =
                    JSON.parse(
                        localStorage.getItem(key) || "null"
                    );


                if (Array.isArray(data)) {

                    return data;

                }

            } catch (error) {

                console.warn(
                    "Could not read exam data:",
                    key,
                    error
                );

            }

        }


        return [];

    }


    function saveExams(exams) {

        localStorage.setItem(
            EXAMS_KEY,
            JSON.stringify(exams)
        );

    }


    /* =========================================================
       CURRENT FACULTY
       ========================================================= */

    function getCurrentFaculty() {

        let currentUser = null;


        try {

            currentUser =
                JSON.parse(
                    sessionStorage.getItem(
                        "currentUser"
                    ) || "null"
                );


            if (!currentUser) {

                currentUser =
                    JSON.parse(
                        sessionStorage.getItem(
                            "smartlibCurrentUser"
                        ) || "null"
                    );

            }

        } catch (error) {

            currentUser = null;

        }


        if (!currentUser) {

            return "Faculty";

        }


        return (

            currentUser.name ||

            currentUser.fullName ||

            currentUser.facultyName ||

            currentUser.email ||

            "Faculty"

        );

    }


    /* =========================================================
       EXAM HELPERS
       ========================================================= */

    function getExamName(exam) {

        return (

            exam.title ||

            exam.name ||

            exam.subject ||

            exam.examName ||

            "Untitled Exam"

        );

    }


    function getExamFaculty(exam) {

        return (

            exam.facultyName ||

            exam.faculty ||

            exam.createdByName ||

            exam.createdBy ||

            exam.postedBy ||

            exam.teacherName ||

            "Faculty"

        );

    }


    function getExamDepartment(exam) {

        return (

            exam.department ||

            exam.dept ||

            "—"

        );

    }


    function getExamDate(exam) {

        return (

            exam.date ||

            exam.examDate ||

            exam.startDate ||

            "—"

        );

    }


    function getExamTime(exam) {

        return (

            exam.time ||

            exam.examTime ||

             exam.startTime 

            // "—"

        );

    }


    function getExamVenue(exam) {

        return (

            exam.venue ||

            exam.room ||

            exam.location ||

            "—"

        );

    }


    /* =========================================================
       CREATE STUDENT + EXAM SECTIONS
       ========================================================= */

    function createAdminSections() {

        const adminShell =
            document.querySelector(
                ".admin-shell"
            );


        if (!adminShell) {

            return;

        }


        /*
        ---------------------------------------------------------
        STUDENT SECTION
        ---------------------------------------------------------
        */

        if (
            !document.getElementById(
                "adminStudentsPanel"
            )
        ) {

            const studentPanel =
                document.createElement(
                    "section"
                );


            studentPanel.id =
                "adminStudentsPanel";


            studentPanel.className =
                "panel admin-extension-panel";


            studentPanel.innerHTML = `

                <div class="panel-heading">

                    <div>

                        <p class="eyebrow">
                            STUDENT MANAGEMENT
                        </p>

                        <h2>
                            Students
                        </h2>

                    </div>


                    <button
                        id="addStudentBtn"
                        class="primary-button small-button"
                        type="button"
                    >
                        + Add Student
                    </button>

                </div>


                <div class="directory-tools">

                    <input
                        id="studentSearch"
                        type="search"
                        placeholder="Search student, ID, email or department..."
                    >


                    <select
                        id="studentDepartmentFilter"
                    >

                        <option value="">
                            All departments
                        </option>

                    </select>

                </div>


                <div class="table-wrap">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Student
                                </th>

                                <th>
                                    Student ID
                                </th>

                                <th>
                                    Email
                                </th>

                                <th>
                                    Department
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody
                            id="studentTableBody"
                        ></tbody>

                    </table>

                </div>

            `;


            const dataNote =
                adminShell.querySelector(
                    ".data-note"
                );


            if (dataNote) {

                adminShell.insertBefore(
                    studentPanel,
                    dataNote
                );

            } else {

                adminShell.appendChild(
                    studentPanel
                );

            }

        }


        /*
        ---------------------------------------------------------
        EXAM SECTION
        ---------------------------------------------------------
        */

        if (
            !document.getElementById(
                "adminExamsPanel"
            )
        ) {

            const examPanel =
                document.createElement(
                    "section"
                );


            examPanel.id =
                "adminExamsPanel";


            examPanel.className =
                "panel admin-extension-panel";


            examPanel.innerHTML = `

                <div class="panel-heading">

                    <div>

                        <p class="eyebrow">
                            EXAM MANAGEMENT
                        </p>

                        <h2>
                            Exams
                        </h2>

                        <p class="inline-message">
                            View exams, add new exams,
                            delete exams and see which
                            faculty posted them.
                        </p>

                    </div>


                    <button
                        id="addExamBtn"
                        class="primary-button small-button"
                        type="button"
                    >
                        + Add Exam
                    </button>

                </div>


                <div class="directory-tools">

                    <input
                        id="examSearch"
                        type="search"
                        placeholder="Search exam, subject or faculty..."
                    >


                    <select
                        id="examDepartmentFilter"
                    >

                        <option value="">
                            All departments
                        </option>

                    </select>

                </div>


                <div class="table-wrap">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Exam
                                </th>

                                <th>
                                    Faculty
                                </th>

                                <th>
                                    Department
                                </th>

                                <th>
                                    Date
                                </th>

                                <th>
                                    Time
                                </th>

                                <th>
                                    Venue
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody
                            id="examTableBody"
                        ></tbody>

                    </table>

                </div>

            `;


            const dataNote =
                adminShell.querySelector(
                    ".data-note"
                );


            if (dataNote) {

                adminShell.insertBefore(
                    examPanel,
                    dataNote
                );

            } else {

                adminShell.appendChild(
                    examPanel
                );

            }

        }


        createStudentModal();

        createExamModal();

        renderStudents();

        renderExams();

    }


    /* =========================================================
       STUDENT MODAL
       ========================================================= */

    function createStudentModal() {

        if (
            document.getElementById(
                "studentModal"
            )
        ) {

            return;

        }


        const modal =
            document.createElement(
                "div"
            );


        modal.id =
            "studentModal";


        modal.className =
            "modal hidden";


        modal.innerHTML = `

            <div class="modal-card">

                <button
                    id="closeStudentModal"
                    class="close"
                    type="button"
                >
                    ×
                </button>


                <p class="eyebrow">
                    STUDENT MANAGEMENT
                </p>


                <h2>
                    Add student.
                </h2>


                <form id="studentForm">


                    <label>

                        Student Name

                        <input
                            id="studentName"
                            type="text"
                            placeholder="e.g. Rahul Sharma"
                            required
                        >

                    </label>


                    <label>

                        Student ID

                        <input
                            id="studentId"
                            type="text"
                            placeholder="e.g. 241099"
                            required
                        >

                    </label>


                    <label>

                        Email

                        <input
                            id="studentEmail"
                            type="email"
                            placeholder="student@example.com"
                            required
                        >

                    </label>


                    <div class="two-column">


                        <label>

                            Department

                            <select
                                id="studentDepartment"
                                required
                            >

                                <option value="">
                                    Select department
                                </option>

                                <option value="CSE">
                                    CSE
                                </option>

                                <option value="ECE">
                                    ECE
                                </option>

                                <option value="Mechanical">
                                    Mechanical
                                </option>

                                <option value="Civil">
                                    Civil
                                </option>

                                <option value="Management">
                                    Management
                                </option>

                            </select>

                        </label>


                        <label>

                            Password

                            <input
                                id="studentPassword"
                                type="password"
                                placeholder="Set login password"
                                required
                            >

                        </label>


                    </div>


                    <p
                        id="studentModalError"
                        class="modal-error"
                    ></p>


                    <button
                        class="primary-button"
                        type="submit"
                    >

                        Add Student

                        <span>
                            →
                        </span>

                    </button>


                </form>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        document
            .getElementById(
                "addStudentBtn"
            )
            .addEventListener(
                "click",
                () => {

                    modal.classList.remove(
                        "hidden"
                    );

                }
            );


        document
            .getElementById(
                "closeStudentModal"
            )
            .addEventListener(
                "click",
                () => {

                    modal.classList.add(
                        "hidden"
                    );

                }
            );


        document
            .getElementById(
                "studentForm"
            )
            .addEventListener(
                "submit",
                addStudent
            );

    }


    /* =========================================================
       ADD STUDENT
       ========================================================= */

    function addStudent(event) {

        event.preventDefault();


        const name =
            document
                .getElementById(
                    "studentName"
                )
                .value
                .trim();


        const studentId =
            document
                .getElementById(
                    "studentId"
                )
                .value
                .trim();


        const email =
            document
                .getElementById(
                    "studentEmail"
                )
                .value
                .trim();


        const department =
            document
                .getElementById(
                    "studentDepartment"
                )
                .value;


        const password =
            document
                .getElementById(
                    "studentPassword"
                )
                .value;


        const error =
            document
                .getElementById(
                    "studentModalError"
                );


        error.textContent = "";


        if (
            !name ||
            !studentId ||
            !email ||
            !department ||
            !password
        ) {

            error.textContent =
                "Please enter all student details.";

            return;

        }


        const users =
            getUsers();


        const duplicate =
            users.some(
                user =>

                    String(
                        user.id || ""
                    ).toLowerCase() ===
                    studentId.toLowerCase()

                    ||

                    String(
                        user.studentId || ""
                    ).toLowerCase() ===
                    studentId.toLowerCase()

                    ||

                    String(
                        user.email || ""
                    ).toLowerCase() ===
                    email.toLowerCase()
            );


        if (duplicate) {

            error.textContent =
                "A student with this ID or email already exists.";

            return;

        }


        const student = {

            id: studentId,

            studentId: studentId,

            name: name,

            email: email,

            department: department,

            role: "student",

            password: password,

            createdAt:
                new Date()
                    .toISOString()

        };


        users.push(
            student
        );


        saveUsers(
            users
        );


        document
            .getElementById(
                "studentForm"
            )
            .reset();


        document
            .getElementById(
                "studentModal"
            )
            .classList.add(
                "hidden"
            );


        renderStudents();

        renderStats();


        showMessage(
            "Student added successfully."
        );

    }


    /* =========================================================
       RENDER STUDENTS
       ========================================================= */

    function renderStudents() {

        const body =
            document.getElementById(
                "studentTableBody"
            );


        if (!body) {

            return;

        }


        const students =
            getStudents();


        const search =
            (
                document
                    .getElementById(
                        "studentSearch"
                    )
                    ?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const department =
            document
                .getElementById(
                    "studentDepartmentFilter"
                )
                ?.value ||
            "";


        const departments = [
            ...new Set(
                students
                    .map(
                        student =>
                            student.department
                    )
                    .filter(Boolean)
            )
        ]
            .sort();


        const filter =
            document.getElementById(
                "studentDepartmentFilter"
            );


        if (filter) {

            const current =
                filter.value;


            filter.innerHTML =
                `<option value="">
                    All departments
                 </option>`;


            departments.forEach(
                departmentName => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        departmentName;

                    option.textContent =
                        departmentName;

                    filter.appendChild(
                        option
                    );

                }
            );


            if (
                departments.includes(
                    current
                )
            ) {

                filter.value =
                    current;

            }

        }


        const filtered =
            students.filter(
                student => {

                    const searchable = [

                        student.name,

                        student.studentId,

                        student.id,

                        student.email,

                        student.department

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return (

                        searchable.includes(
                            search
                        )

                        &&

                        (
                            !department ||

                            student.department ===
                            department
                        )

                    );

                }
            );


        body.innerHTML = "";


        if (
            filtered.length === 0
        ) {

            body.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        class="empty-table"
                    >
                        No students found.
                    </td>

                </tr>

            `;

            return;

        }


        filtered.forEach(
            student => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const id =
                    student.studentId ||
                    student.id ||
                    "—";


                row.innerHTML = `

                    <td>

                        <strong>
                            ${escapeHTML(
                                student.name ||
                                "Unnamed Student"
                            )}
                        </strong>

                        <small>
                            Student
                        </small>

                    </td>


                    <td>
                        ${escapeHTML(id)}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.email ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.department ||
                            "—"
                        )}
                    </td>


                    <td>

                        <button
                            class="danger-button"
                            onclick="deleteStudent('${escapeHTML(
                                String(
                                    student.id ||
                                    id
                                )
                            )}')"
                        >
                            Delete
                        </button>

                    </td>

                `;


                body.appendChild(
                    row
                );

            }
        );

    }


    /* =========================================================
       DELETE STUDENT
       ========================================================= */

    window.deleteStudent =
        function(studentId) {


            const users =
                getUsers();


            const student =
                users.find(
                    user =>
                        String(
                            user.id
                        ) ===
                        String(
                            studentId
                        )
                );


            if (
                !student ||
                student.role !==
                "student"
            ) {

                showMessage(
                    "Student not found.",
                    "error"
                );

                return;

            }


            const activeReservation =
                getReservations()
                    .some(
                        reservation =>

                            String(
                                reservation.userId
                            ) ===
                            String(
                                student.id
                            )

                            &&

                            reservation.status ===
                            "active"
                    );


            if (
                activeReservation
            ) {

                showMessage(
                    "Cannot delete a student with an active reservation.",
                    "error"
                );

                return;

            }


            if (
                !confirm(
                    `Delete student "${student.name}"?`
                )
            ) {

                return;

            }


            const updatedUsers =
                users.filter(
                    user =>
                        String(
                            user.id
                        ) !==
                        String(
                            studentId
                        )
                );


            saveUsers(
                updatedUsers
            );


            renderStudents();

            renderStats();


            showMessage(
                "Student deleted."
            );

        };


    /* =========================================================
       EXAM MODAL
       ========================================================= */

    function createExamModal() {

        if (
            document.getElementById(
                "examModal"
            )
        ) {

            return;

        }


        const modal =
            document.createElement(
                "div"
            );


        modal.id =
            "examModal";


        modal.className =
            "modal hidden";


        modal.innerHTML = `

            <div class="modal-card">

                <button
                    id="closeExamModal"
                    class="close"
                    type="button"
                >
                    ×
                </button>


                <p class="eyebrow">
                    EXAM MANAGEMENT
                </p>


                <h2>
                    Add exam.
                </h2>


                <form id="examForm">


                    <label>

                        Exam / Subject

                        <input
                            id="examName"
                            type="text"
                            placeholder="e.g. Data Structures"
                            required
                        >

                    </label>


                    <div class="two-column">


                        <label>

                            Department

                            <select
                                id="examDepartment"
                                required
                            >

                                <option value="">
                                    Select department
                                </option>

                                <option value="CSE">
                                    CSE
                                </option>

                                <option value="ECE">
                                    ECE
                                </option>

                                <option value="Mechanical">
                                    Mechanical
                                </option>

                                <option value="Civil">
                                    Civil
                                </option>

                                <option value="Management">
                                    Management
                                </option>

                            </select>

                        </label>


                        <label>

                            Venue / Room

                            <input
                                id="examVenue"
                                type="text"
                                placeholder="e.g. LH-2"
                                required
                            >

                        </label>


                    </div>


                    <div class="two-column">


                        <label>

                            Date

                            <input
                                id="examDate"
                                type="date"
                                required
                            >

                        </label>


                        <label>

                            Time

                            <input
                                id="examTime"
                                type="time"
                                required
                            >

                        </label>


                    </div>


                    <label>

                        Faculty

                        <input
                            id="examFaculty"
                            type="text"
                            placeholder="Faculty name"
                        >


                        <small class="form-help">

                            Automatically uses the
                            logged-in faculty name when
                            available.

                        </small>

                    </label>


                    <p
                        id="examModalError"
                        class="modal-error"
                    ></p>


                    <button
                        class="primary-button"
                        type="submit"
                    >

                        Add Exam

                        <span>
                            →
                        </span>

                    </button>


                </form>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        document
            .getElementById(
                "addExamBtn"
            )
            .addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "examFaculty"
                        )
                        .value =
                        getCurrentFaculty();


                    modal
                        .classList
                        .remove(
                            "hidden"
                        );

                }
            );


        document
            .getElementById(
                "closeExamModal"
            )
            .addEventListener(
                "click",
                () => {

                    modal
                        .classList
                        .add(
                            "hidden"
                        );

                }
            );


        document
            .getElementById(
                "examForm"
            )
            .addEventListener(
                "submit",
                addExam
            );

    }


    /* =========================================================
       ADD EXAM
       ========================================================= */

    function addExam(event) {

        event.preventDefault();


        const name =
            document
                .getElementById(
                    "examName"
                )
                .value
                .trim();


        const department =
            document
                .getElementById(
                    "examDepartment"
                )
                .value;


        const venue =
            document
                .getElementById(
                    "examVenue"
                )
                .value
                .trim();


        const date =
            document
                .getElementById(
                    "examDate"
                )
                .value;


        const time =
            document
                .getElementById(
                    "examTime"
                )
                .value;


        const faculty =
            document
                .getElementById(
                    "examFaculty"
                )
                .value
                .trim() ||
            getCurrentFaculty();


        const error =
            document
                .getElementById(
                    "examModalError"
                );


        error.textContent = "";


        if (
            !name ||
            !department ||
            !venue ||
            !date ||
            !time
        ) {

            error.textContent =
                "Please enter all exam details.";

            return;

        }


        const exams =
            getExams();


        const duplicate =
            exams.some(
                exam =>

                    getExamName(
                        exam
                    )
                        .toLowerCase() ===
                    name.toLowerCase()

                    &&

                    getExamDate(
                        exam
                    ) ===
                    date

                    &&

                    getExamDepartment(
                        exam
                    ) ===
                    department
            );


        if (duplicate) {

            error.textContent =
                "This exam already exists for that date and department.";

            return;

        }


        const newExam = {

            id:
                generateId(
                    "EXAM"
                ),

            name:
                name,

            title:
                name,

            subject:
                name,

            department:
                department,

            venue:
                venue,

            room:
                venue,

            date:
                date,

            examDate:
                date,

            time:
                time,

            examTime:
                time,

            facultyName:
                faculty,

            faculty:
                faculty,

            createdByName:
                faculty,

            createdAt:
                new Date()
                    .toISOString()

        };


        exams.push(
            newExam
        );


        saveExams(
            exams
        );


        document
            .getElementById(
                "examForm"
            )
            .reset();


        document
            .getElementById(
                "examModal"
            )
            .classList
            .add(
                "hidden"
            );


        renderExams();


        showMessage(
            "Exam added successfully."
        );

    }


    /* =========================================================
       RENDER EXAMS
       ========================================================= */

    function renderExams() {

        const body =
            document.getElementById(
                "examTableBody"
            );


        if (!body) {

            return;

        }


        const exams =
            getExams();


        const search =
            (
                document
                    .getElementById(
                        "examSearch"
                    )
                    ?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const department =
            document
                .getElementById(
                    "examDepartmentFilter"
                )
                ?.value ||
            "";


        const filter =
            document
                .getElementById(
                    "examDepartmentFilter"
                );


        const departments = [

            ...new Set(

                exams
                    .map(
                        getExamDepartment
                    )
                    .filter(
                        value =>
                            value &&
                            value !== "—"
                    )

            )

        ].sort();


        if (filter) {

            const current =
                filter.value;


            filter.innerHTML =
                `<option value="">
                    All departments
                 </option>`;


            departments.forEach(
                departmentName => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        departmentName;


                    option.textContent =
                        departmentName;


                    filter.appendChild(
                        option
                    );

                }
            );


            if (
                departments.includes(
                    current
                )
            ) {

                filter.value =
                    current;

            }

        }


        const filtered =
            exams.filter(
                exam => {

                    const searchable = [

                        getExamName(
                            exam
                        ),

                        getExamFaculty(
                            exam
                        ),

                        getExamDepartment(
                            exam
                        ),

                        getExamVenue(
                            exam
                        ),

                        getExamDate(
                            exam
                        )

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return (

                        searchable.includes(
                            search
                        )

                        &&

                        (
                            !department ||

                            getExamDepartment(
                                exam
                            ) ===
                            department
                        )

                    );

                }
            );


        body.innerHTML = "";


        if (
            filtered.length === 0
        ) {

            body.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="empty-table"
                    >
                        No exams found.
                    </td>

                </tr>

            `;

            return;

        }


        filtered.forEach(
            exam => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <strong>
                            ${escapeHTML(
                                getExamName(
                                    exam
                                )
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                exam.id ||
                                ""
                            )}
                        </small>

                    </td>


                    <td>

                        <strong>
                            ${escapeHTML(
                                getExamFaculty(
                                    exam
                                )
                            )}
                        </strong>

                    </td>


                    <td>
                        ${escapeHTML(
                            getExamDepartment(
                                exam
                            )
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            formatExamDate(
                                exam.startDate ||
            exam.date ||
            exam.examDate ||
            "—"
                                
                            )
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            formatExamTime(
                                getExamTime(
                                    exam
                                )
                            )
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            getExamVenue(
                                exam
                            )
                        )}
                    </td>


                    <td>

                        <button
                            class="danger-button"
                            onclick="deleteExam('${escapeHTML(
                                String(
                                    exam.id ||
                                    ""
                                )
                            )}')"
                        >
                            Delete
                        </button>

                    </td>

                `;


                body.appendChild(
                    row
                );

            }
        );

    }


    /* =========================================================
       DELETE EXAM
       ========================================================= */

    window.deleteExam =
        function(examId) {


            const exams =
                getExams();


            const exam =
                exams.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            examId
                        )
                );


            if (!exam) {

                showMessage(
                    "Exam not found.",
                    "error"
                );

                return;

            }


            if (
                !confirm(
                    `Delete "${getExamName(
                        exam
                    )}" posted by ${getExamFaculty(
                        exam
                    )}?`
                )
            ) {

                return;

            }


            const updated =
                exams.filter(
                    item =>
                        String(
                            item.id
                        ) !==
                        String(
                            examId
                        )
                );


            saveExams(
                updated
            );


            renderExams();


            showMessage(
                "Exam deleted."
            );

        };


    /* =========================================================
       DATE / TIME FORMATTERS
       ========================================================= */

    function formatExamDate(value) {

        if (
            !value ||
            value === "—"
        ) {

            return "—";

        }


        const date =
            new Date(
                `${value}T00:00:00`
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;

        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    function formatExamTime(value) {

        if (
            !value ||
            value === "—"
        ) {

            return "—";

        }


        const parts =
            String(
                value
            ).split(":");


        if (
            parts.length < 2
        ) {

            return value;

        }


        const hour =
            Number(
                parts[0]
            );


        if (
            Number.isNaN(
                hour
            )
        ) {

            return value;

        }


        const suffix =
            hour >= 12
                ? "PM"
                : "AM";


        const displayHour =
            hour % 12 === 0
                ? 12
                : hour % 12;


        return (
            displayHour +
            ":" +
            parts[1] +
            " " +
            suffix
        );

    }


    /* =========================================================
       SEARCH EVENTS
       ========================================================= */

    function attachExtensionEvents() {


        document
            .getElementById(
                "studentSearch"
            )
            ?.addEventListener(
                "input",
                renderStudents
            );


        document
            .getElementById(
                "studentDepartmentFilter"
            )
            ?.addEventListener(
                "change",
                renderStudents
            );


        document
            .getElementById(
                "examSearch"
            )
            ?.addEventListener(
                "input",
                renderExams
            );


        document
            .getElementById(
                "examDepartmentFilter"
            )
            ?.addEventListener(
                "change",
                renderExams
            );

    }


    /* =========================================================
       START
       ========================================================= */

    createAdminSections();

    attachExtensionEvents();


})();

/* ============================================================
   SMARTLIB ADMIN
   STUDENT + EXAM MANAGEMENT
   FIXED INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    /* =========================================================
       STUDENT STORAGE
       ========================================================= */

    function adminGetStudents() {

        try {

            const users =
                JSON.parse(
                    localStorage.getItem("smartlibUsers") || "[]"
                );

            return users.filter(
                user =>
                    user &&
                    user.role === "student"
            );

        } catch (error) {

            console.error(
                "Unable to load students:",
                error
            );

            return [];

        }

    }


    function adminSaveUsers(users) {

        localStorage.setItem(
            "smartlibUsers",
            JSON.stringify(users)
        );

    }


    /* =========================================================
       EXAM STORAGE
       ========================================================= */

    function adminGetExams() {
<<<<<<< HEAD

        try {

            return JSON.parse(
                localStorage.getItem("smartlibExams") ||   localStorage.getItem("libraryExams") || "[]"
            );

        } catch (error) {

            console.error(
                "Unable to load exams:",
                error
            );

            return [];

        }

=======
    try {
        return JSON.parse(
            localStorage.getItem("smartlibExams") ||
            localStorage.getItem("libraryExams") ||
            "[]"
        );
    } catch (error) {
        console.error(
            "Unable to load exams:",
            error
        );
        return [];
>>>>>>> e696b0923bb4ab54c691d8e125472a454ebddceb
    }
}


    function adminSaveExams(exams) {

        localStorage.setItem(
            "smartlibExams",
            JSON.stringify(exams)
        );

    }


    /* =========================================================
       CURRENT FACULTY
       ========================================================= */

    function adminGetCurrentFaculty() {

        let user = null;

        try {

            user =
                JSON.parse(
                    sessionStorage.getItem(
                        "currentUser"
                    ) || "null"
                );

            if (!user) {

                user =
                    JSON.parse(
                        sessionStorage.getItem(
                            "smartlibCurrentUser"
                        ) || "null"
                    );

            }

        } catch (error) {

            console.error(
                "Unable to read current user:",
                error
            );

        }


        if (!user) {

            return "Faculty";

        }


        return (

            user.name ||

            user.fullName ||

            user.facultyName ||

            user.email ||

            "Faculty"

        );

    }


    /* =========================================================
       CREATE STUDENT MODAL
       ========================================================= */

    function createAdminStudentModal() {

        if (
            document.getElementById(
                "adminStudentModal"
            )
        ) {

            return;

        }


        const modal =
            document.createElement(
                "div"
            );


        modal.id =
            "adminStudentModal";


        modal.className =
            "modal hidden";


        modal.innerHTML = `

            <div class="modal-card">

                <button
                    id="adminCloseStudentModal"
                    class="close"
                    type="button"
                >
                    ×
                </button>


                <p class="eyebrow">
                    STUDENT MANAGEMENT
                </p>


                <h2>
                    Add student.
                </h2>


                <form
                    id="adminStudentForm"
                >

                    <label>

                        Student Name

                        <input
                            id="adminStudentName"
                            type="text"
                            placeholder="e.g. Rahul Sharma"
                            required
                        >

                    </label>


                    <label>

                        Email

                        <input
                            id="adminStudentEmail"
                            type="email"
                            placeholder="student@example.com"
                            required
                        >

                    </label>


                    <div class="two-column">

                        <label>

                            Department

                            <select
                                id="adminStudentDepartment"
                                required
                            >

                            <option value="">
                                Select department
                            </option>

                            <option value="CSE">
                                CSE
                            </option>

                            <option value="ECE">
                                ECE
                            </option>

                            <option value="Mechanical">
                                Mechanical
                            </option>

                            <option value="Civil">
                                Civil
                            </option>

                            <option value="Management">
                                Management
                            </option>

                            </select>

                        </label>

                        <label>

                            Year

                            <select
                                id="adminStudentYear"
                                required
                            >
                                <option value="">Select year</option>
                                <option value="1st Year">1st Year</option>
                                <option value="2nd Year">2nd Year</option>
                                <option value="3rd Year">3rd Year</option>
                                <option value="4th Year">4th Year</option>
                            </select>

                        </label>

                    </div>

                    <label>

                        Temporary Password

                        <input
                            id="adminStudentPassword"
                            type="password"
                            placeholder="Set temporary password"
                            required
                        >

                    </label>


                    <p
                        id="adminStudentError"
                        class="modal-error"
                    ></p>


                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Add Student
                        <span>→</span>
                    </button>

                </form>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        const openButton =
            document.getElementById(
                "addStudentBtn"
            );


        const closeButton =
            document.getElementById(
                "adminCloseStudentModal"
            );


        if (openButton) {

            openButton.onclick =
                function () {

                    modal.classList.remove(
                        "hidden"
                    );

                };

        }


        if (closeButton) {

            closeButton.onclick =
                function () {

                    modal.classList.add(
                        "hidden"
                    );

                };

        }


        document
            .getElementById(
                "adminStudentForm"
            )
            .onsubmit =
            addAdminStudent;

    }


    /* =========================================================
       ADD STUDENT
       ========================================================= */

    function addAdminStudent(event) {

        event.preventDefault();

        const name =
            document.getElementById("adminStudentName").value.trim();

        const email =
            document.getElementById("adminStudentEmail").value.trim().toLowerCase();

        const department =
            document.getElementById("adminStudentDepartment").value;

        const year =
            document.getElementById("adminStudentYear").value;

        const password =
            document.getElementById("adminStudentPassword").value;

        const error =
            document.getElementById("adminStudentError");

        error.textContent = "";

        if (!name || !email || !department || !year || !password) {
            error.textContent = "Please fill all fields.";
            return;
        }

        const users = JSON.parse(
            localStorage.getItem("smartlibUsers") || "[]"
        );

        const exists = users.some(
            user =>
                String(user.email || "").toLowerCase() === email
        );

        if (exists) {
            error.textContent = "An account with this email already exists.";
            return;
        }

        users.push({
            id: Date.now(),
            name,
            email,
            department,
            year,
            role: "student",
            password,
            createdAt: new Date().toISOString()
        });

        adminSaveUsers(users);

        document.getElementById("adminStudentForm").reset();
        document.getElementById("adminStudentModal").classList.add("hidden");

        adminRenderStudents();

        if (typeof renderStats === "function") {
            renderStats();
        }

        if (typeof showMessage === "function") {
            showMessage("Student added successfully.");
        }

    }

    /* =========================================================
       RENDER STUDENTS
       ========================================================= */

    function adminRenderStudents() {

        const table =
            document.getElementById(
                "studentTableBody"
            );


        if (!table) {

            return;

        }


        const students =
            adminGetStudents();


        const search =
            (
                document.getElementById(
                    "studentSearch"
                )?.value ||
                ""
            )
                .toLowerCase()
                .trim();


        const department =
            document.getElementById(
                "studentDepartmentFilter"
            )?.value ||
            "";


        const departments = [
            ...new Set(
                students
                    .map(
                        student =>
                            student.department
                    )
                    .filter(Boolean)
            )
        ];


        const filter =
            document.getElementById(
                "studentDepartmentFilter"
            );


        if (filter) {

            const current =
                filter.value;


            filter.innerHTML =
                `
                <option value="">
                    All departments
                </option>
                `;


            departments.forEach(
                dept => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        dept;


                    option.textContent =
                        dept;


                    filter.appendChild(
                        option
                    );

                }
            );


            filter.value =
                current;

        }


        const filtered =
            students.filter(
                student => {

                    const searchable = [

                        student.name,

                        student.studentId,

                        student.id,

                        student.email,

                        student.department

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return (

                        searchable.includes(
                            search
                        )

                        &&

                        (
                            !department ||
                            student.department ===
                            department
                        )

                    );

                }
            );


        table.innerHTML = "";


        if (
            filtered.length ===
            0
        ) {

            table.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        class="empty-table"
                    >
                        No students found.
                    </td>

                </tr>

            `;

            return;

        }


        filtered.forEach(
            student => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <strong>
                            ${escapeHTML(
                                student.name ||
                                "Unknown"
                            )}
                        </strong>

                        <small>
                            Student
                        </small>

                    </td>


                    <td>
                        ${escapeHTML(
                            student.studentId ||
                            student.id ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.email ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.department ||
                            "—"
                        )}
                    </td>


                    <td>

                        <button
                            class="danger-button"
                            type="button"
                            onclick="adminDeleteStudent('${escapeHTML(
                                String(
                                    student.id
                                )
                            )}')"
                        >
                            Delete
                        </button>

                    </td>

                `;


                table.appendChild(
                    row
                );

            }
        );

    }


    /* =========================================================
       DELETE STUDENT
       ========================================================= */

    window.adminDeleteStudent =
        function(studentId) {


            const users =
                JSON.parse(
                    localStorage.getItem(
                        "smartlibUsers"
                    ) || "[]"
                );


            const student =
                users.find(
                    user =>
                        String(
                            user.id
                        ) ===
                        String(
                            studentId
                        )
                );


            if (!student) {

                return;

            }


            if (
                !confirm(
                    `Delete student "${student.name}"?`
                )
            ) {

                return;

            }


            const updated =
                users.filter(
                    user =>
                        String(
                            user.id
                        ) !==
                        String(
                            studentId
                        )
                );


            adminSaveUsers(
                updated
            );


            adminRenderStudents();


            if (
                typeof renderStats ===
                "function"
            ) {

                renderStats();

            }


            if (
                typeof showMessage ===
                "function"
            ) {

                showMessage(
                    "Student deleted."
                );

            }

        };


    /* =========================================================
       CREATE EXAM MODAL
       ========================================================= */

    function createAdminExamModal() {

        if (document.getElementById("adminExamModal")) {
            return;
        }

        const modal = document.createElement("div");
        modal.id = "adminExamModal";
        modal.className = "modal hidden";

        modal.innerHTML = `
            <div class="modal-card">
                <button id="adminCloseExamModal" class="close" type="button">×</button>
                <p class="eyebrow">ADD EXAMINATION</p>
                <h2>Schedule a department exam.</h2>

                <form id="adminExamForm">
                    <label>
                        Department
                        <select id="adminExamDepartment" required>
                            <option value="">Select department</option>
                            <option>CSE</option>
                            <option>ECE</option>
                            <option>Mechanical</option>
                            <option>Civil</option>
                            <option>Management</option>
                        </select>
                    </label>

                    <label>
                        Year
                        <select id="adminExamYear" required>
                            <option value="">Select year</option>
                            <option>1st Year</option>
                            <option>2nd Year</option>
                            <option>3rd Year</option>
                            <option>4th Year</option>
                        </select>
                    </label>

                    <label>
                        Exam Name
                        <input id="adminExamName" type="text" placeholder="e.g. Internal Assessment" required>
                    </label>

                    <div class="two-column">
                        <label>
                            Start Date
                            <input id="adminExamStart" type="date" required>
                        </label>
                        <label>
                            End Date
                            <input id="adminExamEnd" type="date" required>
                        </label>
                    </div>

                    <p id="adminExamError" class="modal-error"></p>
                    <button type="submit" class="primary-button">Save Examination <span>→</span></button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const openButton = document.getElementById("addExamBtn");
        const closeButton = document.getElementById("adminCloseExamModal");

        if (openButton) {
            openButton.onclick = function () {
                document.getElementById("adminExamForm").reset();
                document.getElementById("adminExamError").textContent = "";
                modal.classList.remove("hidden");
            };
        }

        if (closeButton) {
            closeButton.onclick = function () {
                modal.classList.add("hidden");
            };
        }

        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.classList.add("hidden");
            }
        });

        document.getElementById("adminExamForm").onsubmit = addAdminExam;

    }

    /* =========================================================
       ADD EXAM
       ========================================================= */

    function addAdminExam(event) {

        event.preventDefault();

        const department =
            document.getElementById("adminExamDepartment").value;

        const year =
            document.getElementById("adminExamYear").value;

        const name =
            document.getElementById("adminExamName").value.trim();

        const startDate =
            document.getElementById("adminExamStart").value;

        const endDate =
            document.getElementById("adminExamEnd").value;

        const error =
            document.getElementById("adminExamError");

        error.textContent = "";

        if (!department || !year || !name || !startDate || !endDate) {
            error.textContent = "Please enter all exam details.";
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            error.textContent = "End date cannot be before start date.";
            return;
        }

        const exams = adminGetExams();

        const duplicate = exams.some(
            exam =>
                String(exam.name || exam.title || "").toLowerCase() === name.toLowerCase() &&
                exam.department === department &&
                exam.year === year &&
                exam.startDate === startDate
        );

        if (duplicate) {
            error.textContent = "This exam already exists for that department and year.";
            return;
        }

        exams.push({
            id: "EXAM" + Date.now(),
            name,
            title: name,
            subject: name,
            department,
            year,
            startDate,
            endDate,
            date: startDate,
            examDate: startDate,
            createdByName: "Library Administration",
            facultyName: "Library Administration",
            createdAt: new Date().toISOString()
        });

        adminSaveExams(exams);

        document.getElementById("adminExamForm").reset();
        document.getElementById("adminExamModal").classList.add("hidden");

        adminRenderExams();

        if (typeof showMessage === "function") {
            showMessage("Exam added successfully.");
        }

    }

    /* =========================================================
       RENDER EXAMS
       ========================================================= */

    function adminRenderExams() {

        const table =
            document.getElementById(
                "examTableBody"
            );


        if (!table) {

            return;

        }


        const exams =
            adminGetExams();


        const search =
            (
                document.getElementById(
                    "examSearch"
                )?.value ||
                ""
            )
                .toLowerCase()
                .trim();


        const department =
            document.getElementById(
                "examDepartmentFilter"
            )?.value ||
            "";


        const filtered =
            exams.filter(
                exam => {

                    const searchable = [

                        exam.name,

                        exam.title,

                        exam.subject,

                        exam.faculty,

                        exam.facultyName,

                        exam.department,

                        exam.venue,

                        exam.room

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return (

                        searchable.includes(
                            search
                        )

                        &&

                        (
                            !department ||
                            exam.department ===
                            department
                        )

                    );

                }
            );


        table.innerHTML = "";


        if (
            filtered.length ===
            0
        ) {

            table.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="empty-table"
                    >
                        No exams found.
                    </td>

                </tr>

            `;

            return;

        }


        filtered.forEach(
            exam => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <strong>
                            ${escapeHTML(
                                exam.name ||
                                exam.title ||
                                exam.subject ||
                                "Exam"
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                exam.id ||
                                ""
                            )}
                        </small>

                    </td>


                    <td>

                        <strong>
                            ${escapeHTML(
                                exam.facultyName ||
                                exam.faculty ||
                                exam.createdByName ||
                                "Faculty"
                            )}
                        </strong>

                    </td>


                    <td>
                        ${escapeHTML(
                            exam.department ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            exam.date ||
                            exam.examDate ||
                            exam.startDate ||
                            exam.endDate ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            exam.time ||
                            exam.examTime ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            exam.venue ||
                            exam.room ||
                            "—"
                        )}
                    </td>


                    <td>

                        <button
                            class="danger-button"
                            type="button"
                            onclick="adminDeleteExam('${escapeHTML(
                                String(
                                    exam.id
                                )
                            )}')"
                        >
                            Delete
                        </button>

                    </td>

                `;


                table.appendChild(
                    row
                );

            }
        );

    }


    /* =========================================================
       DELETE EXAM
       ========================================================= */

    window.adminDeleteExam =
        function(examId) {


            const exams =
                adminGetExams();


            const exam =
                exams.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            examId
                        )
                );


            if (!exam) {

                return;

            }


            if (
                !confirm(
                    `Delete "${exam.name || exam.title || exam.subject}"?`
                )
            ) {

                return;

            }


            adminSaveExams(

                exams.filter(
                    item =>
                        String(
                            item.id
                        ) !==
                        String(
                            examId
                        )
                )

            );


            adminRenderExams();


            if (
                typeof showMessage ===
                "function"
            ) {

                showMessage(
                    "Exam deleted."
                );

            }

        };


    /* =========================================================
       SEARCH
       ========================================================= */

    document
        .getElementById(
            "studentSearch"
        )
        ?.addEventListener(
            "input",
            adminRenderStudents
        );


    document
        .getElementById(
            "studentDepartmentFilter"
        )
        ?.addEventListener(
            "change",
            adminRenderStudents
        );


    document
        .getElementById(
            "examSearch"
        )
        ?.addEventListener(
            "input",
            adminRenderExams
        );


    document
        .getElementById(
            "examDepartmentFilter"
        )
        ?.addEventListener(
            "change",
            adminRenderExams
        );


    /* =========================================================
       INITIALIZE
       ========================================================= */

    createAdminStudentModal();

    createAdminExamModal();

    adminRenderStudents();

    adminRenderExams();

});