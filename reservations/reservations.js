/* =========================================================
   SMARTLIB
   RESERVATIONS JAVASCRIPT
   ========================================================= */


/* =========================================================
   CURRENT USER
   ========================================================= */

const currentUser =
    JSON.parse(
        sessionStorage.getItem("smartlibCurrentUser") ||
        sessionStorage.getItem("currentUser") ||
        "null"
    );


/* =========================================================
   LOGIN CHECK
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
   DOM ELEMENTS
   ========================================================= */

const userInfo =
    document.getElementById("userInfo");

const departmentText =
    document.getElementById("departmentText");

const activeReservations =
    document.getElementById("activeReservations");

const queueReservations =
    document.getElementById("queueReservations");

const reservationHistory =
    document.getElementById("reservationHistory");

const activeCount =
    document.getElementById("activeCount");

const queueCount =
    document.getElementById("queueCount");

const historyCount =
    document.getElementById("historyCount");

const message =
    document.getElementById("message");

const logoutBtn =
    document.getElementById("logoutBtn");


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function getReservations() {

    const storedReservations =
        localStorage.getItem(
            "libraryReservations"
        );


    if (!storedReservations) {

        return [];

    }


    try {

        return JSON.parse(
            storedReservations
        );

    } catch (error) {

        console.error(
            "Error reading reservations:",
            error
        );

        return [];

    }

}


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


function getResources() {

    const storedResources =
        localStorage.getItem(
            "libraryResources"
        );


    if (!storedResources) {

        return [];

    }


    try {

        return JSON.parse(
            storedResources
        );

    } catch (error) {

        console.error(
            "Error reading resources:",
            error
        );

        return [];

    }

}


function saveResources(
    resources
) {

    localStorage.setItem(
        "libraryResources",
        JSON.stringify(
            resources
        )
    );

}

/* =========================================================
   USER RESERVED SEAT
   ========================================================= */

function getUserReservedSeat() {

    const storedSeats =
        localStorage.getItem(
            "smartlib_seats"
        );


    if (!storedSeats) {

        return null;

    }


    let seats = [];


    try {

        seats =
            JSON.parse(
                storedSeats
            );

    } catch (error) {

        console.error(
            "Error reading seats:",
            error
        );

        return null;

    }


    return seats.find(
        function (seat) {

            return (

                seat.status ===
                "occupied"

                &&

                String(
                    seat.occupantId
                )

                ===

                String(
                    currentUser.id
                )

            );

        }
    ) || null;

}


/* =========================================================
   USER INFORMATION
   ========================================================= */

function displayUser() {

    if (!currentUser) {

        return;

    }


    userInfo.textContent =
        currentUser.name ||
        "User";


    departmentText.innerHTML =
        "<strong>" +
        (currentUser.department ||
            "Department") +
        "</strong>" +
        " · Year " +
        (currentUser.year ||
            "N/A");

}


/* =========================================================
   UTILITY
   ========================================================= */

function formatDateTime(
    dateString
) {

    if (!dateString) {

        return "Not available";

    }


    const date =
        new Date(dateString);


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "Not available";

    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function showMessage(
    text,
    type
) {

    message.textContent =
        text;

    message.className =
        "message " +
        type;

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
   USER RESERVATIONS
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


function getActiveReservations() {

    return getUserReservations()
        .filter(
            function (reservation) {

                return (
                    reservation.status ===
                    "active"
                );

            }
        );

}


function getReservationHistory() {

    return getUserReservations()
        .filter(
            function (reservation) {

                return (
                    reservation.status ===
                    "returned"
                );

            }
        );

}


/* =========================================================
   RETURN RESOURCE
   ========================================================= */

function returnResource(
    reservationId
) {

    const reservations =
        getReservations();


    const reservation =
        reservations.find(
            function (item) {

                return (

                    String(
                        item.id
                    )

                    ===

                    String(
                        reservationId
                    )

                );

            }
        );


    if (!reservation) {

        showMessage(
            "Reservation not found.",
            "error"
        );

        return;

    }


    if (
        String(
            reservation.userId
        )

        !==

        String(
            currentUser.id
        )
    ) {

        showMessage(
            "You cannot modify this reservation.",
            "error"
        );

        return;

    }


    if (
        reservation.status !==
        "active"
    ) {

        showMessage(
            "This reservation is already returned.",
            "error"
        );

        return;

    }


    const resources =
        getResources();


    const resource =
        resources.find(
            function (item) {

                return (

                    String(
                        item.id
                    )

                    ===

                    String(
                        reservation.resourceId
                    )

                );

            }
        );


    reservation.status =
        "returned";


    reservation.returnedAt =
        new Date().toISOString();


    /*
     * Return resource.
     */

    if (resource) {

        if (
            typeof resource.availableQuantity ===
            "number"
        ) {

            if (
                resource.availableQuantity <
                resource.totalQuantity
            ) {

                resource.availableQuantity++;

            }

        }

    }


    saveReservations(
        reservations
    );


    saveResources(
        resources
    );


    /*
     * AUTOMATIC PRIORITY HANDOFF
     */

    let promotedStudent =
        null;


    if (
        resource &&

        typeof handoffResource ===
        "function"
    ) {

        const updatedReservations =
            getReservations();


        const result =
            handoffResource(
                resource.id,
                resources,
                updatedReservations
            );


        if (result) {

            promotedStudent =
                result.student;


            saveResources(
                resources
            );


            saveReservations(
                updatedReservations
            );

        }

    }


    renderPage();


    if (
        promotedStudent
    ) {

        showMessage(
            reservation.resourceName +
            " returned. The next priority student has been assigned the resource.",
            "success"
        );

    } else {

        showMessage(
            reservation.resourceName +
            " returned successfully.",
            "success"
        );

    }

}


/* =========================================================
   ACTIVE RESERVATIONS
   ========================================================= */

function renderActiveReservations() {

    const active =
        getActiveReservations();

    const reservedSeat =
        getUserReservedSeat();


    activeReservations.innerHTML =
        "";


    activeCount.textContent =
        active.length +
        (reservedSeat ? 1 : 0);

    /* -----------------------------------------
   RESERVED SEAT
   ----------------------------------------- */

if (reservedSeat) {

    const seatCard =
        document.createElement(
            "article"
        );


    seatCard.className =
        "reservation-card";


    seatCard.innerHTML = `

        <div class="reservation-type">
            SEAT RESERVATION
        </div>


        <h3>
            ${reservedSeat.id}
        </h3>


        <div
            class="reservation-status status-active"
        >
            ACTIVE
        </div>


        <div class="reservation-info">

            <strong>
                Seat
            </strong>

            <br>

            ${reservedSeat.id}

            <br><br>

            <strong>
                Department
            </strong>

            <br>

            ${reservedSeat.department}

            <br><br>

            <strong>
                Status
            </strong>

            <br>

            Occupied

        </div>

    `;


    activeReservations.prepend(
        seatCard
    );

}


    if (
        active.length ===
        0
    ) {

        activeReservations.innerHTML = `

            <div class="empty-state">

                <h3>
                    No Active Reservations
                </h3>

                <p>
                    You currently have no
                    active resource reservations.
                </p>

            </div>

        `;

        return;

    }


    active.forEach(
        function (reservation) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "reservation-card";


            card.innerHTML = `

                <div class="reservation-type">
                    RESOURCE
                </div>

                <h3>
                    ${reservation.resourceName}
                </h3>

                <div
                    class="reservation-status status-active"
                >
                    ACTIVE
                </div>

                <div class="reservation-info">

                    <strong>
                        Reserved
                    </strong>

                    <br>

                    ${formatDateTime(
                        reservation.reservedAt
                    )}

                    <br><br>

                    <strong>
                        Reservation ID
                    </strong>

                    <br>

                    ${reservation.id}

                </div>

                <button
                    type="button"
                    class="return-btn"
                    onclick="returnResource('${reservation.id}')"
                >
                    RETURN RESOURCE
                </button>

            `;


            activeReservations.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   WAITING QUEUE
   ========================================================= */

function renderQueue() {

    queueReservations.innerHTML =
        "";


    if (
        typeof getQueues !==
        "function"
    ) {

        queueCount.textContent =
            "0";


        queueReservations.innerHTML = `

            <div class="queue-card">

                <div class="queue-placeholder">

                    <strong>
                        Priority Queue Unavailable
                    </strong>

                    <br>

                    priorityQueue.js is not loaded.

                </div>

            </div>

        `;

        return;

    }


    const queues =
        getQueues();


    const resources =
        getResources();


    const userId =
        String(
            currentUser.id
        );


    const userQueueEntries =
        [];


    Object.keys(
        queues
    ).forEach(
        function (resourceId) {

            const queue =
                getQueue(
                    resourceId
                );


            const position =
                queue.findIndex(
                    function (student) {

                        return (

                            String(
                                student.userId
                            )

                            ===

                            userId

                        );

                    }
                );


            if (
                position !== -1
            ) {

                const resource =
                    resources.find(
                        function (item) {

                            return (

                                String(
                                    item.id
                                )

                                ===

                                String(
                                    resourceId
                                )

                            );

                        }
                    );


                if (resource) {

                    userQueueEntries.push({

                        resource:
                            resource,

                        entry:
                            queue[position],

                        position:
                            position + 1,

                        total:
                            queue.length,

                        priority:
                            calculatePriority(
                                queue[position]
                            )

                    });

                }

            }

        }
    );


    queueCount.textContent =
        userQueueEntries.length;


    if (
        userQueueEntries.length ===
        0
    ) {

        queueReservations.innerHTML = `

            <div class="empty-state">

                <h3>
                    No Waiting Queues
                </h3>

                <p>
                    You are not currently waiting for any resource.
                </p>

            </div>

        `;

        return;

    }


    userQueueEntries.sort(
        function (a, b) {

            return (

                a.entry.requestedAt -
                b.entry.requestedAt

            );

        }
    );


    userQueueEntries.forEach(
        function (item) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "reservation-card";


            const examLabel =
                item.entry.examStatus ===
                "exam"

                    ? "EXAM PRIORITY"

                    : "REGULAR";


            card.innerHTML = `

                <div class="reservation-type">
                    RESOURCE QUEUE
                </div>


                <h3>
                    ${item.resource.name}
                </h3>


                <div
                    class="reservation-status status-active"
                >
                    POSITION #${item.position}
                </div>


                <div class="reservation-info">

                    <strong>
                        Queue Position
                    </strong>

                    <br>

                    ${item.position}
                    of
                    ${item.total}


                    <br><br>


                    <strong>
                        Priority
                    </strong>

                    <br>

                    ${item.priority}
                    ·
                    ${examLabel}


                    <br><br>


                    <strong>
                        Requested
                    </strong>

                    <br>

                    ${formatDateTime(
                        new Date(
                            item.entry.requestedAt
                        ).toISOString()
                    )}

                </div>


                <button
                    type="button"
                    class="return-btn"
                    onclick="leaveQueue('${item.resource.id}')"
                >
                    LEAVE QUEUE
                </button>

            `;


            queueReservations.appendChild(
                card
            );

        }
    );

}

function renderQueue() {

    queueReservations.innerHTML =
        "";


    if (
        typeof getQueues !==
        "function"
    ) {

        queueCount.textContent =
            "0";


        queueReservations.innerHTML = `

            <div class="queue-card">

                <div class="queue-placeholder">

                    <strong>
                        Priority Queue Unavailable
                    </strong>

                    <br>

                    priorityQueue.js is not loaded.

                </div>

            </div>

        `;

        return;

    }


    const queues =
        getQueues();


    const resources =
        getResources();


    const userId =
        String(
            currentUser.id
        );


    const userQueueEntries =
        [];


    Object.keys(
        queues
    ).forEach(
        function (resourceId) {

            const queue =
                getQueue(
                    resourceId
                );


            const position =
                queue.findIndex(
                    function (student) {

                        return (

                            String(
                                student.userId
                            )

                            ===

                            userId

                        );

                    }
                );


            if (
                position !== -1
            ) {

                const resource =
                    resources.find(
                        function (item) {

                            return (

                                String(
                                    item.id
                                )

                                ===

                                String(
                                    resourceId
                                )

                            );

                        }
                    );


                if (resource) {

                    userQueueEntries.push({

                        resource:
                            resource,

                        entry:
                            queue[position],

                        position:
                            position + 1,

                        total:
                            queue.length,

                        priority:
                            calculatePriority(
                                queue[position]
                            )

                    });

                }

            }

        }
    );


    queueCount.textContent =
        userQueueEntries.length;


    if (
        userQueueEntries.length ===
        0
    ) {

        queueReservations.innerHTML = `

            <div class="empty-state">

                <h3>
                    No Waiting Queues
                </h3>

                <p>
                    You are not currently waiting for any resource.
                </p>

            </div>

        `;

        return;

    }


    userQueueEntries.sort(
        function (a, b) {

            return (

                a.entry.requestedAt -
                b.entry.requestedAt

            );

        }
    );


    userQueueEntries.forEach(
        function (item) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "reservation-card";


            const examLabel =
                item.entry.examStatus ===
                "exam"

                    ? "EXAM PRIORITY"

                    : "REGULAR";


            card.innerHTML = `

                <div class="reservation-type">
                    RESOURCE QUEUE
                </div>


                <h3>
                    ${item.resource.name}
                </h3>


                <div
                    class="reservation-status status-active"
                >
                    POSITION #${item.position}
                </div>


                <div class="reservation-info">

                    <strong>
                        Queue Position
                    </strong>

                    <br>

                    ${item.position}
                    of
                    ${item.total}


                    <br><br>


                    <strong>
                        Priority
                    </strong>

                    <br>

                    ${item.priority}
                    ·
                    ${examLabel}


                    <br><br>


                    <strong>
                        Requested
                    </strong>

                    <br>

                    ${formatDateTime(
                        new Date(
                            item.entry.requestedAt
                        ).toISOString()
                    )}

                </div>


                <button
                    type="button"
                    class="return-btn"
                    onclick="leaveQueue('${item.resource.id}')"
                >
                    LEAVE QUEUE
                </button>

            `;


            queueReservations.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   HISTORY
   ========================================================= */

function renderHistory() {

    const history =
        getReservationHistory();


    reservationHistory.innerHTML =
        "";


    historyCount.textContent =
        history.length;


    if (
        history.length ===
        0
    ) {

        reservationHistory.innerHTML = `

            <div class="empty-state">

                <h3>
                    No Reservation History
                </h3>

                <p>
                    Completed reservations
                    will appear here.
                </p>

            </div>

        `;

        return;

    }


    history.sort(
        function (a, b) {

            return (
                new Date(
                    b.returnedAt
                ) -
                new Date(
                    a.returnedAt
                )
            );

        }
    );


    history.forEach(
        function (reservation) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "reservation-card";


            card.innerHTML = `

                <div class="reservation-type">
                    RESOURCE
                </div>

                <h3>
                    ${reservation.resourceName}
                </h3>

                <div
                    class="reservation-status status-returned"
                >
                    RETURNED
                </div>

                <div class="reservation-info">

                    <strong>
                        Reserved
                    </strong>

                    <br>

                    ${formatDateTime(
                        reservation.reservedAt
                    )}

                    <br><br>

                    <strong>
                        Returned
                    </strong>

                    <br>

                    ${formatDateTime(
                        reservation.returnedAt
                    )}

                    <br><br>

                    <strong>
                        Reservation ID
                    </strong>

                    <br>

                    ${reservation.id}

                </div>

            `;


            reservationHistory.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   RENDER PAGE
   ========================================================= */

function renderPage() {

    renderActiveReservations();

    renderQueue();

    renderHistory();

}


/* =========================================================
   LOGOUT
   ========================================================= */

logoutBtn.addEventListener(
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


/* =========================================================
   INITIALIZE
   ========================================================= */

/* =========================================================
   INITIALIZE
========================================================= */

displayUser();


if (
    typeof refreshAllQueues ===
    "function"
) {

    refreshAllQueues();

}


if (
    typeof processAllQueueHandoffs ===
    "function"
) {

    processAllQueueHandoffs();

}


renderPage();


/* =========================================================
   SYNC WITH LIBRARY ADMIN
========================================================= */

function syncReservationsPage() {

    renderPage();

}


/*
   Another SmartLib page changed localStorage
*/

window.addEventListener(
    "storage",
    function (event) {

        if (
            event.key === "libraryResources" ||
            event.key === "libraryReservations" ||
            event.key === "smartlib_queues" ||
            event.key === "smartlibExams" ||
            event.key === "smartlib_seats"
        ) {

            syncReservationsPage();

        }

    }
);


/*
   User returned to this page
*/

window.addEventListener(
    "pageshow",
    function () {

        syncReservationsPage();

    }
);


/*
   Browser tab became visible again
*/

document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.visibilityState === "visible"
        ) {

            syncReservationsPage();

        }

    }
);