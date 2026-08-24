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