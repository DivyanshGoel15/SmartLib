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
   BACKEND API CONFIGURATION & DATA SYNC
   ========================================================= */

const API_BASE_URL = (window.SMARTLIB_CONFIG && window.SMARTLIB_CONFIG.API_BASE_URL) ||
    window.SMARTLIB_API_URL ||
    localStorage.getItem("SMARTLIB_API_URL") ||
    "https://smartlib-sjya.onrender.com/api";

let apiReservations = null;
let apiResources = null;
let apiSeats = null;

async function fetchReservationsFromAPI() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_BASE_URL}/reservations?userId=${currentUser.id}`);
        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.data)) {
                apiReservations = data.data;
                saveReservations(apiReservations);
                renderPage();
            }
        } else {
            const errData = await response.json().catch(() => null);
            if (errData && errData.message && response.status === 503) {
                console.warn("[Backend Notice]:", errData.message);
            }
        }
    } catch (err) {
        console.warn("[SmartLib Reservations] Backend API unavailable, continuing with local storage:", err.message);
    }
}

async function fetchResourcesFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/resources`);
        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.data)) {
                apiResources = data.data;
                saveResources(apiResources);
                renderPage();
            }
        }
    } catch (err) {
        console.warn("[SmartLib Reservations] Backend API resources unavailable:", err.message);
    }
}

async function fetchSeatsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/seats`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                apiSeats = data;
                renderPage();
            }
        }
    } catch (err) {
        console.warn("[SmartLib Reservations] Backend API seats unavailable:", err.message);
    }
}


/* =========================================================
   LOCAL STORAGE & CACHED DATA
   ========================================================= */

function getReservations() {

    if (apiReservations && apiReservations.length > 0) {
        return apiReservations;
    }

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

    apiReservations = reservations;

    localStorage.setItem(
        "libraryReservations",
        JSON.stringify(
            reservations
        )
    );

}


function getResources() {

    if (apiResources && apiResources.length > 0) {
        return apiResources;
    }

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

    apiResources = resources;

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

function getUserReservedSeats() {
    const seats = (apiSeats && apiSeats.length > 0)
        ? apiSeats
        : JSON.parse(localStorage.getItem("smartlib_seats") || "[]");

    if (!currentUser || !Array.isArray(seats)) return [];

    const uid = String(currentUser.id || currentUser._id || "");
    const studentId = String(currentUser.studentId || "");
    const userName = (currentUser.name || "").trim().toLowerCase();

    return seats.filter(seat => {
        if (seat.status !== "occupied" && seat.status !== "reserved") return false;
        const occ = seat.currentOccupant || {};
        const occId = String(occ.studentId || seat.occupantId || "");
        const occName = (occ.studentName || seat.occupantName || "").trim().toLowerCase();
        return (uid && occId === uid) || (studentId && occId === studentId) || (userName && occName === userName);
    });
}

function getUserReservedSeat() {
    const list = getUserReservedSeats();
    return list.length > 0 ? list[0] : null;
}

function getUserQueuedSeats() {
    const seats = (apiSeats && apiSeats.length > 0)
        ? apiSeats
        : JSON.parse(localStorage.getItem("smartlib_seats") || "[]");

    if (!currentUser || !Array.isArray(seats)) return [];

    const uid = String(currentUser.id || currentUser._id || "");
    const studentId = String(currentUser.studentId || "");
    const userName = (currentUser.name || "").trim().toLowerCase();

    const queued = [];
    seats.forEach(seat => {
        if (!Array.isArray(seat.waitingQueue)) return;
        const index = seat.waitingQueue.findIndex(q => {
            const qId = String(q.studentId || "");
            const qName = (q.studentName || "").trim().toLowerCase();
            return (uid && qId === uid) || (studentId && qId === studentId) || (userName && qName === userName);
        });
        if (index !== -1) {
            queued.push({
                seat,
                entry: seat.waitingQueue[index],
                position: index + 1,
                total: seat.waitingQueue.length,
                priorityScore: seat.waitingQueue[index].priorityScore
            });
        }
    });
    return queued;
}

window.releaseSeatFromReservations = async function(seatCode) {
    if (!confirm(`Are you sure you want to release seat ${seatCode}?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/seats/${encodeURIComponent(seatCode)}/release`, {
            method: "PUT"
        });
        const data = await response.json().catch(() => null);
        if (response.ok) {
            showMessage(`Seat ${seatCode} released successfully.`, "success");
            await fetchSeatsFromAPI();
            renderPage();
        } else {
            showMessage((data && data.message) || "Failed to release seat.", "error");
        }
    } catch (err) {
        showMessage("Unable to connect to server to release seat.", "error");
    }
};

window.leaveSeatQueueFromReservations = async function(seatCode) {
    if (!confirm(`Are you sure you want to leave the waiting queue for seat ${seatCode}?`)) return;
    try {
        const studentId = currentUser.id || currentUser._id || currentUser.studentId;
        const response = await fetch(`${API_BASE_URL}/seats/${encodeURIComponent(seatCode)}/queue/${encodeURIComponent(studentId)}`, {
            method: "DELETE"
        });
        const data = await response.json().catch(() => null);
        if (response.ok) {
            showMessage(`Removed from waiting queue for ${seatCode}.`, "success");
            await fetchSeatsFromAPI();
            renderPage();
        } else {
            showMessage((data && data.message) || "Failed to leave waiting queue.", "error");
        }
    } catch (err) {
        showMessage("Unable to connect to server to leave queue.", "error");
    }
};


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

    const brandLink = document.getElementById("brandLink");
    const navHome = document.getElementById("navHome");
    const navExams = document.getElementById("navExams");
    const isFaculty = currentUser.role === "faculty";
    if (brandLink) {
        brandLink.href = isFaculty ? "../facultyportal/faculty.html" : "../home/studentportal/home.html";
    }
    if (navHome) {
        navHome.href = isFaculty ? "../facultyportal/faculty.html" : "../home/studentportal/home.html";
    }
    if (navExams) {
        navExams.href = isFaculty ? "../facultyportal/faculty.html#examSection" : "../examination/exam.html";
    }

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

async function returnResource(
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


    /* Attempt API return */
    try {

        const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/return`, {
            method: "POST"
        });

        const result = await response.json().catch(() => null);

        if (response.ok && result && result.success) {

            const resources = getResources();
            const resource = resources.find(function (item) {
                return (
                    String(item.id) === String(reservation.resourceId) ||
                    String(item.customId) === String(reservation.resourceId)
                );
            });

            let promotedStudent = null;
            if (resource && typeof handoffResource === "function") {
                const updatedReservations = getReservations();
                const handoffRes = handoffResource(resource.id, resources, updatedReservations);
                if (handoffRes) {
                    promotedStudent = handoffRes.student;
                }
            }

            await fetchReservationsFromAPI();
            await fetchResourcesFromAPI();
            renderPage();

            if (promotedStudent) {
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

            return;

        } else if (result && result.message) {

            showMessage(result.message, "error");
            return;

        }

    } catch (apiErr) {

        console.warn(
            "[SmartLib Reservations] Backend return API unavailable, falling back to local storage:",
            apiErr.message
        );

    }


    /* Local storage fallback */
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

    const active = getActiveReservations();
    const reservedSeats = getUserReservedSeats();

    activeReservations.innerHTML = "";
    activeCount.textContent = active.length + reservedSeats.length;

    /* -----------------------------------------
       RESERVED SEATS
       ----------------------------------------- */
    reservedSeats.forEach(function (reservedSeat) {
        const seatCard = document.createElement("article");
        seatCard.className = "reservation-card";
        const seatCode = reservedSeat.seatNumber || reservedSeat.id || reservedSeat.seatCode;
        const dept = reservedSeat.department || "General";
        const startTime = (reservedSeat.currentOccupant && reservedSeat.currentOccupant.startTime) || reservedSeat.startTime;

        seatCard.innerHTML = `
            <div class="reservation-type">
                SEAT RESERVATION
            </div>
            <h3>Seat ${seatCode}</h3>
            <div class="reservation-status status-active">
                ACTIVE
            </div>
            <div class="reservation-info">
                <strong>Seat</strong><br>
                ${seatCode}<br><br>
                <strong>Department</strong><br>
                ${dept}<br><br>
                <strong>Reserved Since</strong><br>
                ${formatDateTime(startTime)}<br><br>
                <strong>Status</strong><br>
                Occupied / Reserved
            </div>
            <button
                type="button"
                class="return-btn"
                onclick="releaseSeatFromReservations('${seatCode}')"
            >
                RELEASE SEAT
            </button>
        `;
        activeReservations.appendChild(seatCard);
    });

    /* -----------------------------------------
       RESOURCE RESERVATIONS
       ----------------------------------------- */
    active.forEach(function (reservation) {
        const card = document.createElement("article");
        card.className = "reservation-card";
        card.innerHTML = `
            <div class="reservation-type">
                RESOURCE RESERVATION
            </div>
            <h3>${reservation.resourceName}</h3>
            <div class="reservation-status status-active">
                ACTIVE
            </div>
            <div class="reservation-info">
                <strong>Reserved</strong><br>
                ${formatDateTime(reservation.reservedAt)}<br><br>
                <strong>Reservation ID</strong><br>
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
        activeReservations.appendChild(card);
    });

    if (active.length === 0 && reservedSeats.length === 0) {
        activeReservations.innerHTML = `
            <div class="empty-state">
                <h3>No Active Reservations</h3>
                <p>You currently have no active resource or seat reservations.</p>
            </div>
        `;
    }

}


/* =========================================================
   WAITING QUEUE
   ========================================================= */

function renderQueue() {

    queueReservations.innerHTML = "";

    const userResourceQueueEntries = [];

    if (typeof getQueues === "function") {
        const queues = getQueues();
        const resources = getResources();
        const userId = String(currentUser.id);

        Object.keys(queues).forEach(function (resourceId) {
            const queue = getQueue(resourceId);
            const position = queue.findIndex(function (student) {
                return String(student.userId) === userId;
            });

            if (position !== -1) {
                const resource = resources.find(function (item) {
                    return String(item.id) === String(resourceId);
                });

                if (resource) {
                    userResourceQueueEntries.push({
                        resource: resource,
                        entry: queue[position],
                        position: position + 1,
                        total: queue.length,
                        priority: (typeof calculatePriority === "function") ? calculatePriority(queue[position]) : "Normal"
                    });
                }
            }
        });
    }

    const userSeatQueueEntries = getUserQueuedSeats();

    queueCount.textContent = userResourceQueueEntries.length + userSeatQueueEntries.length;

    if (userResourceQueueEntries.length === 0 && userSeatQueueEntries.length === 0) {
        queueReservations.innerHTML = `
            <div class="empty-state">
                <h3>No Waiting Queues</h3>
                <p>You are not currently waiting for any resource or seat.</p>
            </div>
        `;
        return;
    }

    /* -----------------------------------------
       SEAT QUEUES
       ----------------------------------------- */
    userSeatQueueEntries.forEach(function (item) {
        const card = document.createElement("article");
        card.className = "reservation-card";
        const seatCode = item.seat.seatNumber || item.seat.id || item.seat.seatCode;
        const priorityScore = item.priorityScore !== undefined ? item.priorityScore : (item.entry && item.entry.priorityScore);
        const requestedAt = (item.entry && item.entry.queuedAt) ? item.entry.queuedAt : (item.entry && item.entry.requestedAt);

        card.innerHTML = `
            <div class="reservation-type">
                SEAT QUEUE
            </div>
            <h3>Seat ${seatCode}</h3>
            <div class="reservation-status status-active">
                POSITION #${item.position}
            </div>
            <div class="reservation-info">
                <strong>Queue Position</strong><br>
                ${item.position} of ${item.total}<br><br>
                <strong>Priority Score</strong><br>
                ${priorityScore !== undefined ? priorityScore : "Standard"}<br><br>
                <strong>Department</strong><br>
                ${item.seat.department || "General"}<br><br>
                <strong>Requested</strong><br>
                ${requestedAt ? formatDateTime(requestedAt) : "Recently"}
            </div>
            <button
                type="button"
                class="return-btn"
                onclick="leaveSeatQueueFromReservations('${seatCode}')"
            >
                LEAVE QUEUE
            </button>
        `;
        queueReservations.appendChild(card);
    });

    /* -----------------------------------------
       RESOURCE QUEUES
       ----------------------------------------- */
    userResourceQueueEntries.sort(function (a, b) {
        return (a.entry.requestedAt || 0) - (b.entry.requestedAt || 0);
    });

    userResourceQueueEntries.forEach(function (item) {
        const card = document.createElement("article");
        card.className = "reservation-card";
        const examLabel = item.entry.examStatus === "exam" ? "EXAM PRIORITY" : "REGULAR";

        card.innerHTML = `
            <div class="reservation-type">
                RESOURCE QUEUE
            </div>
            <h3>${item.resource.name}</h3>
            <div class="reservation-status status-active">
                POSITION #${item.position}
            </div>
            <div class="reservation-info">
                <strong>Queue Position</strong><br>
                ${item.position} of ${item.total}<br><br>
                <strong>Priority</strong><br>
                ${item.priority} · ${examLabel}<br><br>
                <strong>Requested</strong><br>
                ${formatDateTime(new Date(item.entry.requestedAt).toISOString())}
            </div>
            <button
                type="button"
                class="return-btn"
                onclick="leaveQueue('${item.resource.id}')"
            >
                LEAVE QUEUE
            </button>
        `;
        queueReservations.appendChild(card);
    });

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

// Fetch live data from backend API
fetchReservationsFromAPI();
fetchResourcesFromAPI();
fetchSeatsFromAPI();


/* =========================================================
   SYNC WITH LIBRARY ADMIN
========================================================= */

function syncReservationsPage() {

    renderPage();
    fetchReservationsFromAPI();
    fetchResourcesFromAPI();
    fetchSeatsFromAPI();
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