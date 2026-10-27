/* =========================================================
   SMARTLIB - RESOURCES
   ========================================================= */


/* =========================================================
   1. GET CURRENT USER
   ========================================================= */

const currentUser =
    JSON.parse(
        sessionStorage.getItem("smartlibCurrentUser") ||
        sessionStorage.getItem("currentUser") ||
        "null"
    );


/* =========================================================
   2. CHECK LOGIN
   ========================================================= */

const isLoggedIn =
    sessionStorage.getItem("smartlibLoggedIn") === "true" ||
    sessionStorage.getItem("currentUser") !== null ||
    sessionStorage.getItem("smartlibCurrentUser") !== null;


if (!currentUser || !isLoggedIn) {

    window.location.href =
        "../landingpage/login.html";

}


/* =========================================================
   3. DOM ELEMENTS
   ========================================================= */

const resourcesGrid =
    document.getElementById("resourcesGrid");

const searchInput =
    document.getElementById("searchInput");

const resourceCount =
    document.getElementById("resourceCount");

const departmentText =
    document.getElementById("departmentText");

const userInfo =
    document.getElementById("userInfo");

const logoutBtn =
    document.getElementById("logoutBtn");

const message =
    document.getElementById("message");

const filterButtons =
    document.querySelectorAll(".filter-btn");


/* =========================================================
   4. CURRENT FILTER
   ========================================================= */

let currentFilter = "All";


/* =========================================================
   5. INITIAL RESOURCE DATA
   ========================================================= */

const initialResources = [

    {
        id: "RES001",
        name: "Data Structures & Algorithms",
        type: "Book",
        department: "CSE",
        totalQuantity: 5,
        availableQuantity: 5
    },

    {
        id: "RES002",
        name: "Database Management Systems",
        type: "Book",
        department: "CSE",
        totalQuantity: 4,
        availableQuantity: 4
    },

    {
        id: "RES003",
        name: "Computer Networks",
        type: "Book",
        department: "CSE",
        totalQuantity: 4,
        availableQuantity: 4
    },

    {
        id: "RES004",
        name: "Scientific Calculator",
        type: "Equipment",
        department: "CSE",
        totalQuantity: 5,
        availableQuantity: 5
    },

    {
        id: "RES005",
        name: "Laptop",
        type: "Equipment",
        department: "CSE",
        totalQuantity: 2,
        availableQuantity: 2
    },

    {
        id: "RES006",
        name: "Machine Learning",
        type: "Book",
        department: "AI & ML",
        totalQuantity: 5,
        availableQuantity: 5
    },

    {
        id: "RES007",
        name: "Python Programming",
        type: "Book",
        department: "AI & ML",
        totalQuantity: 5,
        availableQuantity: 5
    },

    {
        id: "RES008",
        name: "GPU Workstation",
        type: "Equipment",
        department: "AI & ML",
        totalQuantity: 2,
        availableQuantity: 2
    },

    {
        id: "RES009",
        name: "Digital Electronics",
        type: "Book",
        department: "ECE",
        totalQuantity: 5,
        availableQuantity: 5
    },

    {
        id: "RES010",
        name: "Arduino Kit",
        type: "Equipment",
        department: "ECE",
        totalQuantity: 3,
        availableQuantity: 3
    }

];


/* =========================================================
   6. INITIALIZE RESOURCES
   ========================================================= */

function initializeResources() {

    const storedResources =
        localStorage.getItem(
            "libraryResources"
        );


    /*
       IMPORTANT:

       Do NOT overwrite existing localStorage data.

       This allows the ADMIN page to add/delete resources
       and this page will use those same resources.
    */

    if (!storedResources) {

        localStorage.setItem(
            "libraryResources",
            JSON.stringify(
                initialResources
            )
        );

    }

}


/* =========================================================
   6.1 BACKEND API CONFIGURATION & DATA SYNC
   ========================================================= */

const API_BASE_URL = (window.SMARTLIB_CONFIG && window.SMARTLIB_CONFIG.API_BASE_URL) ||
    window.SMARTLIB_API_URL ||
    localStorage.getItem("SMARTLIB_API_URL") ||
    "https://smartlib-sjya.onrender.com/api";

let apiResources = null;
let apiReservations = null;

async function fetchResourcesFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/resources`);
        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.data)) {
                apiResources = data.data;
                saveResources(apiResources);
                renderResources();
            }
        } else {
            const errData = await response.json().catch(() => null);
            if (errData && errData.message && response.status === 503) {
                console.warn("[Backend Notice]:", errData.message);
            }
        }
    } catch (err) {
        console.warn("[SmartLib Resources] Backend API unavailable, continuing with local storage:", err.message);
    }
}

async function fetchReservationsFromAPI() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_BASE_URL}/reservations?userId=${currentUser.id}`);
        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.data)) {
                apiReservations = data.data;
                saveReservations(apiReservations);
                renderResources();
            }
        }
    } catch (err) {
        console.warn("[SmartLib Resources] Backend API reservations fetch unavailable:", err.message);
    }
}


/* =========================================================
   7. GET RESOURCES
   ========================================================= */

function getResources() {

    if (apiResources && apiResources.length > 0) {
        return apiResources;
    }

    const resources =
        localStorage.getItem(
            "libraryResources"
        );


    if (!resources) {
        return [];
    }


    try {

        return JSON.parse(
            resources
        );

    }

    catch (error) {

        console.error(
            "Invalid resource data:",
            error
        );

        return [];

    }

}


/* =========================================================
   8. SAVE RESOURCES
   ========================================================= */

function saveResources(resources) {

    apiResources = resources;

    localStorage.setItem(
        "libraryResources",
        JSON.stringify(resources)
    );

}


/* =========================================================
   9. GET RESERVATIONS
   ========================================================= */

function getReservations() {

    if (apiReservations && apiReservations.length > 0) {
        return apiReservations;
    }

    const reservations =
        localStorage.getItem(
            "libraryReservations"
        );


    if (!reservations) {
        return [];
    }


    try {

        return JSON.parse(
            reservations
        );

    }

    catch (error) {

        console.error(
            "Invalid reservation data:",
            error
        );

        return [];

    }

}


/* =========================================================
   10. SAVE RESERVATIONS
   ========================================================= */

function saveReservations(reservations) {

    apiReservations = reservations;

    localStorage.setItem(
        "libraryReservations",
        JSON.stringify(
            reservations
        )
    );

}


/* =========================================================
   11. GENERATE UNIQUE ID
   ========================================================= */

function generateId(prefix) {

    return (
        prefix +
        Date.now() +
        Math.floor(
            Math.random() * 1000
        )
    );

}


/* =========================================================
   12. SHOW MESSAGE
   ========================================================= */

function showMessage(
    text,
    type
) {

    if (!message) {
        return;
    }


    message.textContent =
        text;

    message.className =
        "message " + type;

    message.style.display =
        "block";


    setTimeout(
        function () {

            message.style.display =
                "none";

        },
        3000
    );

}


/* =========================================================
   13. DISPLAY USER
   ========================================================= */

function displayUser() {

    if (!currentUser) {
        return;
    }


    userInfo.textContent =
        currentUser.name || "User";

    const homeUrl = currentUser.role === "faculty"
        ? "../facultyportal/faculty.html"
        : (currentUser.role === "library_admin" || currentUser.role === "admin"
            ? "../adminportal/admin.html"
            : "../home/studentportal/home.html");

    const brandLink = document.getElementById("brandLink");
    const navHome = document.getElementById("navHome");
    if (brandLink) brandLink.href = homeUrl;
    if (navHome) navHome.href = homeUrl;

    departmentText.textContent =
        "Browse resources available across the library.";

}


/* =========================================================
   14. GET USER RESERVATIONS
   ========================================================= */

function getUserReservations() {

    const reservations =
        getReservations();


    return reservations.filter(
        function (reservation) {

            return (
                String(reservation.userId) ===
                String(currentUser.id)
            );

        }
    );

}


/* =========================================================
   15. GET ACTIVE RESERVATIONS FOR USER
   ========================================================= */

function getActiveReservationsForUser() {

    const reservations =
        getReservations();


    return reservations.filter(
        function (reservation) {

            return (
                String(reservation.userId) ===
                String(currentUser.id) &&

                reservation.status ===
                "active"
            );

        }
    );

}


/* =========================================================
   16. CHECK WHETHER RESOURCE IS ALREADY RESERVED
   ========================================================= */

function hasActiveReservation(
    resourceId
) {

    const reservations =
        getReservations();


    return reservations.some(
        function (reservation) {

            return (

                String(reservation.userId) ===
                String(currentUser.id)

                &&

                String(reservation.resourceId) ===
                String(resourceId)

                &&

                reservation.status ===
                "active"

            );

        }
    );

}


/* =========================================================
   17. RESERVE RESOURCE
   ========================================================= */

async function reserveResource(resourceId) {

    const resources =
        getResources();


    const resource =
        resources.find(
            function (item) {

                return (
                    String(item.id) === String(resourceId) ||
                    String(item.customId) === String(resourceId) ||
                    String(item._id) === String(resourceId)
                );

            }
        );


    if (!resource) {

        showMessage(
            "Resource not found.",
            "error"
        );

        return;

    }


    /* -----------------------------------------
       PREVENT DUPLICATE RESERVATION
       ----------------------------------------- */

    if (
        hasActiveReservation(
            resourceId
        )
    ) {

        showMessage(
            "You already have this resource reserved.",
            "error"
        );

        return;

    }


    /* -----------------------------------------
       MAXIMUM 2 ACTIVE RESERVATIONS
       ----------------------------------------- */

    const activeReservations =
        getActiveReservationsForUser();


    if (
        activeReservations.length >= 2
    ) {

        showMessage(
            "Maximum 2 active resource reservations allowed.",
            "error"
        );

        return;

    }


    /* -----------------------------------------
       RESOURCE AVAILABLE
       ----------------------------------------- */

    if (
        Number(
            resource.availableQuantity
        ) > 0
    ) {

        /* Try reserving via backend API */
        try {

            const response = await fetch(`${API_BASE_URL}/reservations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    resourceId: resource.customId || resource.id || resource._id,
                    resourceName: resource.name,
                    userId: String(currentUser.id),
                    userName: currentUser.name,
                    userEmail: currentUser.email || "",
                    department: currentUser.department || "",
                    year: currentUser.year || "",
                    userRole: currentUser.role || "student"
                })
            });

            const result = await response.json().catch(() => null);

            if (response.ok && result && result.success) {

                if (
                    typeof removeFromAllQueues ===
                    "function"
                ) {

                    removeFromAllQueues(
                        currentUser.id
                    );

                }

                showMessage(
                    resource.name +
                    " reserved successfully.",
                    "success"
                );

                await fetchResourcesFromAPI();
                await fetchReservationsFromAPI();

                return;

            } else if (result && result.message) {

                showMessage(
                    result.message,
                    "error"
                );

                return;

            }

        } catch (apiErr) {

            console.warn(
                "[SmartLib Resources] Backend API unavailable, falling back to local storage:",
                apiErr.message
            );

        }

        /* Local storage fallback */
        const reservations =
            getReservations();


        const reservation = {

            id:
                generateId("RSV"),

            resourceId:
                resource.id || resource.customId,

            resourceName:
                resource.name,

            userId:
                currentUser.id,

            userName:
                currentUser.name,

            userEmail:
                currentUser.email ||
                "",

            department:
                currentUser.department ||
                "",

            year:
                currentUser.year ||
                "",

            userRole:
                currentUser.role ||
                "student",

            reservedAt:
                new Date().toISOString(),

            returnedAt:
                null,

            status:
                "active",

            promotedFromQueue:
                false

        };


        reservations.push(
            reservation
        );


        resource.availableQuantity =
            Number(
                resource.availableQuantity
            ) - 1;


        saveReservations(
            reservations
        );


        saveResources(
            resources
        );


        if (
            typeof removeFromAllQueues ===
            "function"
        ) {

            removeFromAllQueues(
                currentUser.id
            );

        }


        renderResources();


        showMessage(
            resource.name +
            " reserved successfully.",
            "success"
        );


        return;

    }


    /* -----------------------------------------
       RESOURCE UNAVAILABLE
       JOIN PRIORITY QUEUE
       ----------------------------------------- */

    if (
        typeof addToQueue !==
        "function"
    ) {

        showMessage(
            "Priority queue is not loaded.",
            "error"
        );

        return;

    }


    const added =
        addToQueue(
            resource.id,
            currentUser
        );


    if (!added) {

        showMessage(
            "You are already in this resource queue.",
            "error"
        );

        return;

    }


    renderResources();


    showMessage(
        "Resource unavailable. You have been added to the priority queue.",
        "success"
    );

}


/* =========================================================
   18. FILTER RESOURCES
   ========================================================= */

function getFilteredResources() {

    /*
       IMPORTANT:

       We intentionally DO NOT filter by
       currentUser.department.

       Admin-created resources should be visible
       across the library.
    */

    const resources =
        getResources();


    let filteredResources =
        [...resources];


    /* -----------------------------------------
       Type filter
       ----------------------------------------- */

    if (
        currentFilter !== "All"
    ) {

        filteredResources =
            filteredResources.filter(
                function (resource) {

                    return (
                        resource.type ===
                        currentFilter
                    );

                }
            );

    }


    /* -----------------------------------------
       Search filter
       ----------------------------------------- */

    const searchText =
        searchInput.value
            .trim()
            .toLowerCase();


    if (
        searchText !== ""
    ) {

        filteredResources =
            filteredResources.filter(
                function (resource) {

                    const name =
                        String(
                            resource.name || ""
                        ).toLowerCase();


                    const department =
                        String(
                            resource.department || ""
                        ).toLowerCase();


                    const type =
                        String(
                            resource.type || ""
                        ).toLowerCase();


                    return (

                        name.includes(
                            searchText
                        )

                        ||

                        department.includes(
                            searchText
                        )

                        ||

                        type.includes(
                            searchText
                        )

                    );

                }
            );

    }


    return filteredResources;

}


/* =========================================================
   19. ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   20. RENDER RESOURCES
   ========================================================= */

function renderResources() {

    const resources =
        getFilteredResources();


    /* -----------------------------------------
       Resource count
       ----------------------------------------- */

    resourceCount.textContent =
        resources.length +
        " resource type(s) available";


    /* -----------------------------------------
       Clear old cards
       ----------------------------------------- */

    resourcesGrid.innerHTML =
        "";


    /* -----------------------------------------
       Empty state
       ----------------------------------------- */

    if (
        resources.length === 0
    ) {

        resourcesGrid.innerHTML = `

            <div class="empty-state">

                <h3>
                    No resources found
                </h3>

                <p>
                    Try another search or category.
                </p>

            </div>

        `;

        return;

    }


    /* -----------------------------------------
       Create resource cards
       ----------------------------------------- */

    resources.forEach(
        function (resource) {


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "resource-card";


            /* ---------------------------------
               Quantities
               --------------------------------- */

            const totalQuantity =
                Number(
                    resource.totalQuantity || 0
                );


            const availableQuantity =
                Number(
                    resource.availableQuantity || 0
                );


            /* ---------------------------------
               Availability percentage
               --------------------------------- */

            let availabilityPercentage =
                0;


            if (
                totalQuantity > 0
            ) {

                availabilityPercentage =
                    (
                        availableQuantity /
                        totalQuantity
                    ) * 100;

            }


            /* ---------------------------------
               Progress class
               --------------------------------- */

            let progressClass =
                "";


            if (
                availableQuantity === 0
            ) {

                progressClass =
                    "empty";

            }

            else if (
                availabilityPercentage <= 40
            ) {

                progressClass =
                    "low";

            }


            /* ---------------------------------
               Status
               --------------------------------- */

            let statusText;
            let statusClass;


            if (
                availableQuantity > 0
            ) {

                statusText =
                    "Available";

                statusClass =
                    "available";

            }

            else {

                statusText =
                    "Currently Unavailable";

                statusClass =
                    "unavailable";

            }


            /* ---------------------------------
               Existing reservation
               --------------------------------- */

            const alreadyReserved =
                hasActiveReservation(
                    resource.id
                );


            /* ---------------------------------
               Reservation button
               --------------------------------- */

            let buttonHTML;


            if (
                alreadyReserved
            ) {

                buttonHTML = `

                    <button
                        class="reserve-btn disabled"
                        disabled
                    >
                        Already Reserved
                    </button>

                `;

            }

            else if (
                availableQuantity > 0
            ) {

                buttonHTML = `

                    <button
                        class="reserve-btn available"
                        onclick="reserveResource('${escapeHTML(resource.id)}')"
                    >
                        Reserve
                    </button>

                `;

            }

            else {

    const alreadyInQueue =
        typeof isUserInQueue ===
        "function" &&
        isUserInQueue(
            resource.id,
            currentUser.id
        );


    const queuePosition =
        alreadyInQueue &&
        typeof getQueuePosition ===
        "function"

            ? getQueuePosition(
                resource.id,
                currentUser.id
            )

            : 0;


    buttonHTML = `

        <button
            class="reserve-btn ${
                alreadyInQueue
                    ? "disabled"
                    : "available"
            }"
            onclick="${
                alreadyInQueue
                    ? "return false;"
                    : `reserveResource('${escapeHTML(resource.id)}')`
            }"
            ${
                alreadyInQueue
                    ? "disabled"
                    : ""
            }
        >

            ${
                alreadyInQueue
                    ? `In Queue · #${queuePosition}`
                    : "Join Priority Queue"
            }

        </button>

    `;

    }


            /* ---------------------------------
               Card HTML
               --------------------------------- */

            card.innerHTML = `

                <span class="resource-type">
                    ${escapeHTML(resource.type)}
                </span>


                <h3>
                    ${escapeHTML(resource.name)}
                </h3>


                <p>
                    Department:
                    ${escapeHTML(resource.department)}
                </p>


                <div class="availability">

                    <div class="availability-text">

                        <span>
                            Availability
                        </span>

                        <span>

                            ${availableQuantity}
                            /
                            ${totalQuantity}

                        </span>

                    </div>


                    <div class="progress-bar">

                        <div
                            class="progress ${progressClass}"
                            style="
                                width:
                                ${availabilityPercentage}%
                            "
                        >
                        </div>

                    </div>

                </div>


                <div
                    class="status ${statusClass}"
                >
                    ${statusText}
                </div>


                ${buttonHTML}

            `;


            resourcesGrid.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   21. SEARCH
   ========================================================= */

searchInput.addEventListener(
    "input",
    function () {

        renderResources();

    }
);


/* =========================================================
   22. FILTER BUTTONS
   ========================================================= */

filterButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {


                /* -----------------------------
                   Remove active state
                   ----------------------------- */

                filterButtons.forEach(
                    function (btn) {

                        btn.classList.remove(
                            "active"
                        );

                    }
                );


                /* -----------------------------
                   Add active state
                   ----------------------------- */

                button.classList.add(
                    "active"
                );


                /* -----------------------------
                   Update filter
                   ----------------------------- */

                currentFilter =
                    button.dataset.type;


                /* -----------------------------
                   Render
                   ----------------------------- */

                renderResources();

            }
        );

    }
);


/* =========================================================
   23. LOGOUT
   ========================================================= */

logoutBtn.addEventListener(
    "click",
    function () {

        sessionStorage.removeItem(
            "smartlibCurrentUser"
        );

        sessionStorage.removeItem(
            "currentUser"
        );

        sessionStorage.removeItem(
            "smartlibLoggedIn"
        );


        window.location.href =
            "../landingpage/login.html";

    }
);


/* =========================================================
   24. INITIALIZE PAGE
   ========================================================= */

initializeResources();

displayUser();

renderResources();

// Fetch live data from backend API
fetchResourcesFromAPI();
fetchReservationsFromAPI();