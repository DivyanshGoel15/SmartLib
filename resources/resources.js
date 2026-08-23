/* =========================================================
   SMARTLIB - RESOURCES
   ========================================================= */


/* =========================================================
   1. GET CURRENT USER
   ========================================================= */

const currentUser =
    JSON.parse(
        sessionStorage.getItem("currentUser")
    );


if (!currentUser) {

    window.location.href =
        "../landingpage/login.html";

}


/* =========================================================
   2. DOM ELEMENTS
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
   3. CURRENT FILTER
   ========================================================= */

let currentFilter = "All";


/* =========================================================
   4. INITIAL RESOURCE DATA
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
   5. INITIALIZE RESOURCES
   ========================================================= */

function initializeResources() {

    const storedResources =
        localStorage.getItem(
            "libraryResources"
        );

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
   6. GET RESOURCES
   ========================================================= */

function getResources() {

    const resources =
        localStorage.getItem(
            "libraryResources"
        );

    if (!resources) {

        return [];

    }

    try {

        return JSON.parse(resources);

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
   7. SAVE RESOURCES
   ========================================================= */

function saveResources(resources) {

    localStorage.setItem(
        "libraryResources",
        JSON.stringify(resources)
    );

}


/* =========================================================
   8. GET RESERVATIONS
   ========================================================= */

function getReservations() {

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
   9. SAVE RESERVATIONS
   ========================================================= */

function saveReservations(
    reservations
) {

    localStorage.setItem(
        "libraryReservations",
        JSON.stringify(
            reservations
        )
    );

}


/* =========================================================
   10. GENERATE UNIQUE ID
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
   11. SHOW MESSAGE
   ========================================================= */

function showMessage(
    text,
    type
) {

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
   12. DISPLAY USER
   ========================================================= */

function displayUser() {

    if (!currentUser) {

        return;

    }


    userInfo.textContent =
        currentUser.name +
        " | " +
        currentUser.department;


    departmentText.textContent =
        "Resources available for the " +
        currentUser.department +
        " department.";

}


/* =========================================================
   13. GET USER RESERVATIONS
   ========================================================= */

function getUserReservations() {

    const reservations =
        getReservations();

    return reservations.filter(
        function (reservation) {

            return (
                reservation.userId ===
                currentUser.id
            );

        }
    );

}


/* =========================================================
   14. CHECK WHETHER RESOURCE IS ALREADY RESERVED
   ========================================================= */

function hasActiveReservation(
    resourceId
) {

    const reservations =
        getReservations();

    return reservations.some(
        function (reservation) {

            return (
                reservation.userId ===
                currentUser.id &&

                reservation.resourceId ===
                resourceId &&

                reservation.status ===
                "active"
            );

        }
    );

}


/* =========================================================
   15. RESERVE RESOURCE
   ========================================================= */

function reserveResource(
    resourceId
) {

    const resources =
        getResources();


    const resource =
        resources.find(
            function (item) {

                return (
                    item.id ===
                    resourceId
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
       Check availability
       ----------------------------------------- */

    if (
        resource.availableQuantity <= 0
    ) {

        showMessage(
            "This resource is currently unavailable.",
            "error"
        );

        return;

    }


    /* -----------------------------------------
       Prevent duplicate reservation
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
       Get reservations
       ----------------------------------------- */

    const reservations =
        getReservations();


    /* -----------------------------------------
       Create reservation
       ----------------------------------------- */

    const reservation = {

        id:
            generateId("RSV"),

        resourceId:
            resource.id,

        resourceName:
            resource.name,

        userId:
            currentUser.id,

        userName:
            currentUser.name,

        department:
            currentUser.department,

        reservedAt:
            new Date().toISOString(),

        returnedAt:
            null,

        status:
            "active"

    };


    /* -----------------------------------------
       Add reservation
       ----------------------------------------- */

    reservations.push(
        reservation
    );


    /* -----------------------------------------
       Reduce availability
       ----------------------------------------- */

    resource.availableQuantity--;


    /* -----------------------------------------
       Save everything
       ----------------------------------------- */

    saveReservations(
        reservations
    );

    saveResources(
        resources
    );


    /* -----------------------------------------
       Refresh UI
       ----------------------------------------- */

    renderResources();


    showMessage(
        resource.name +
        " reserved successfully.",
        "success"
    );

}


/* =========================================================
   16. FILTER RESOURCES
   ========================================================= */

function getFilteredResources() {

    const resources =
        getResources();


    const searchText =
        searchInput.value
            .trim()
            .toLowerCase();


    return resources.filter(
        function (resource) {

            const matchesFilter =
                currentFilter === "All" ||
                resource.type ===
                    currentFilter;


            const matchesSearch =
                !searchText ||

                resource.name
                    .toLowerCase()
                    .includes(
                        searchText
                    ) ||

                resource.department
                    .toLowerCase()
                    .includes(
                        searchText
                    ) ||

                resource.type
                    .toLowerCase()
                    .includes(
                        searchText
                    );


            return (
                matchesFilter &&
                matchesSearch
            );

        }
    );

}


/* =========================================================
   17. RENDER RESOURCES
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

    if (resources.length === 0) {

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
       Create cards
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
               Availability percentage
               --------------------------------- */

            let availabilityPercentage =
                0;


            if (
                resource.totalQuantity > 0
            ) {

                availabilityPercentage =
                    (
                        resource.availableQuantity /
                        resource.totalQuantity
                    ) * 100;

            }


            /* ---------------------------------
               Progress class
               --------------------------------- */

            let progressClass = "";


            if (
                resource.availableQuantity === 0
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
                resource.availableQuantity > 0
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
               Reservation state
               --------------------------------- */

            const alreadyReserved =
                hasActiveReservation(
                    resource.id
                );


            /* ---------------------------------
               Button
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
                resource.availableQuantity > 0
            ) {

                buttonHTML = `

                    <button
                        class="reserve-btn available"
                        onclick="
                            reserveResource(
                                '${resource.id}'
                            )
                        "
                    >
                        Reserve
                    </button>

                `;

            }
            else {

                buttonHTML = `

                    <button
                        class="reserve-btn disabled"
                        disabled
                    >
                        Join Queue
                    </button>

                `;

            }


            /* ---------------------------------
               Card HTML
               --------------------------------- */

            card.innerHTML = `

                <span class="resource-type">
                    ${resource.type}
                </span>


                <h3>
                    ${resource.name}
                </h3>


                <p>
                    Department:
                    ${resource.department}
                </p>


                <div class="availability">

                    <div class="availability-text">

                        <span>
                            Availability
                        </span>

                        <span>
                            ${resource.availableQuantity}
                            /
                            ${resource.totalQuantity}
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
   18. SEARCH
   ========================================================= */

searchInput.addEventListener(
    "input",
    function () {

        renderResources();

    }
);


/* =========================================================
   19. FILTER BUTTONS
   ========================================================= */

filterButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                /* -----------------------------
                   Update active button
                   ----------------------------- */

                filterButtons.forEach(
                    function (btn) {

                        btn.classList.remove(
                            "active"
                        );

                    }
                );


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
   20. LOGOUT
   ========================================================= */

logoutBtn.addEventListener(
    "click",
    function () {

        sessionStorage.removeItem(
            "currentUser"
        );


        window.location.href =
            "../landingpage/login.html";

    }
);


/* =========================================================
   21. INITIALIZE PAGE
   ========================================================= */

initializeResources();

displayUser();

renderResources();