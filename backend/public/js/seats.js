
let seats = [];
let selectedSeatId = null;

const defaultSeats = (function () {
    const depts = ["CSE", "ECE", "Mechanical", "Civil", "Management"];
    const list = [];
    depts.forEach(dept => {
        for (let i = 1; i <= 10; i++) {
            const code = `${dept}-S${String(i).padStart(2, "0")}`;
            list.push({
                seatCode: code,
                id: code,
                department: dept,
                status: "available",
                currentOccupant: {},
                waitingQueue: []
            });
        }
    });
    return list;
})();

function mapSeatFromAPI(seat) {
    return {
        ...seat,
        id: seat.seatCode,
        occupantId: seat.currentOccupant?.studentId ?? null,
        occupantName: seat.currentOccupant?.studentName ?? null
    };
}


async function loadSeats() {
    try {
        const data = await getStoredSeats();

        seats = data.map(mapSeatFromAPI);

        // Find a seat where the logged-in student is waiting.
        const myQueuedSeat = seats.find(seat =>
            (seat.waitingQueue || []).some(
                student =>
                    String(student.studentId) ===
                    String(currentUser.id)
            )
        );

        // Automatically select that seat after login or refresh.
        if (myQueuedSeat && !selectedSeatId) {
            selectedSeatId = myQueuedSeat.id;

            const selectedSeatLabel =
                document.getElementById("selectedSeat");

            if (selectedSeatLabel) {
                selectedSeatLabel.textContent =
                    `Selected Seat: ${selectedSeatId}`;
            }
        }
        displaySeats();

        // Refresh the queue display after seats are reloaded.
        if (selectedSeatId) {
            displayQueue(selectedSeatId);
        } else {
            const queueContainer =
                document.getElementById("queueContainer");

            if (queueContainer) {
                queueContainer.innerHTML =
                    "<p>No students are waiting.</p>";
            }
        }
    } catch (error) {
        console.warn("Unable to load seats from server, falling back to local catalog:", error);
        if (!seats || seats.length === 0) {
            seats = defaultSeats;
            displaySeats();
        }
    }
}




/* TEMPORARY CURRENT USER */
const storedUser =
    sessionStorage.getItem("smartlibCurrentUser");

if (!storedUser) {

    alert("Please login to access SmartLib seats.");

    window.location.href = "landingpage/login.html";

}

const loggedInUser =
    JSON.parse(storedUser);


const currentUser = {

    id: loggedInUser.id,

    name: loggedInUser.name,

    department: loggedInUser.department,

    year: loggedInUser.year,

    role: loggedInUser.role

};

// Update topbar user details and role-based links
if (currentUser) {
    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
        userNameEl.textContent = currentUser.name || "User";
    }
    const homeUrl = currentUser.role === "faculty"
        ? "facultyportal/faculty.html"
        : (currentUser.role === "library_admin" || currentUser.role === "admin"
            ? "adminportal/admin.html"
            : "home/studentportal/home.html");
    const brandLink = document.getElementById("brandLink");
    const navHome = document.getElementById("navHome");
    if (brandLink) brandLink.href = homeUrl;
    if (navHome) navHome.href = homeUrl;
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        sessionStorage.clear();
        window.location.href = "landingpage/landingpage.html";
    });
}

/* DISPLAY SEATS */

function displaySeats() {

    const seatContainer =
        document.getElementById("seatContainer");

    seatContainer.innerHTML = "";


    seats.forEach(function (seat) {

        const seatCard =
            document.createElement("div");

        seatCard.classList.add("seat");
        const accessible =
            canAccessSeat(seat);
        if (!accessible) {

            seatCard.classList.add(
            "restricted"
        );
        }


        if (!accessible) {

          seatCard.classList.add("restricted");

        } else if (seat.status === "occupied") {

          seatCard.classList.add("occupied");

        } else {

           seatCard.classList.add("available");
        }


        if (seat.id === selectedSeatId) {

            seatCard.classList.add("selected");

        }
        seatCard.innerHTML = `
           <h3>${seat.id}</h3>
        `;
        if (currentUser.role === "library_admin" && seat.status === "occupied") {
            const occupantInfo = document.createElement("p");
            occupantInfo.className = "seat-occupant";

            occupantInfo.textContent = seat.occupantName
                ? `Occupied by: ${seat.occupantName} (ID: ${seat.occupantId})`
                : "Occupant details unavailable";

        seatCard.appendChild(occupantInfo);
        }

        if (accessible) {

          seatCard.addEventListener(
            "click",
            function () {
               selectSeat(seat.id);
            }
            );
        }



       

       




        seatContainer.appendChild(seatCard);

    });


    updateSeatStats();
    updateButtons();
}


/* SELECT SEAT */

function selectSeat(seatId) {
    selectedSeatId = seatId;

    document.getElementById("selectedSeat").textContent =
        `Selected Seat: ${seatId}`;

    displaySeats();
    displayQueue(seatId);
}


/* RESERVE SEAT */


async function reserveSeat() {
    if (!selectedSeatId) {
        alert("Please select a seat first.");
        return;
    }

    const seat = seats.find(s => s.id === selectedSeatId);

    if (!seat) {
        alert("Seat not found.");
        return;
    }

    if (
        currentUser.role !== "library_admin" &&
        seat.department !== currentUser.department
    ) {
        alert(`You can only reserve seats in the ${currentUser.department} library.`);
        return;
    }

    if (seat.status !== "available") {
        alert("This seat is not available.");
        return;
    }

    if (hasReservedSeat()) {
        alert("You already have a seat. Release it before reserving another.");
        return;
    }

    try {
        const response = await fetch(
            `${SEATS_API}/${encodeURIComponent(seat.id)}/occupy`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: String(currentUser.id),
                    studentName: currentUser.name
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to reserve seat.");
        }

        selectedSeatId = null;
        document.getElementById("selectedSeat").textContent =
            "No seat selected";

        await loadSeats();
        alert(`Seat ${seat.id} reserved successfully.`);
    } catch (error) {
        console.error("Seat reservation failed:", error);
        alert(error.message || "Unable to reserve seat.");
    }
}

/* RELEASE SEAT */
/* RELEASE SEAT */


async function releaseSeat() {
    if (!selectedSeatId) {
        alert("Please select your seat first.");
        return;
    }

    const seat = seats.find(s => s.id === selectedSeatId);

    if (!seat) {
        alert("Seat not found.");
        return;
    }

    if (String(seat.occupantId) !== String(currentUser.id)) {
        alert("You can only release your own seat.");
        return;
    }

    try {
        const response = await fetch(
            `${SEATS_API}/${encodeURIComponent(seat.id)}/release`,
            { method: "PUT" }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to release seat.");
        }

        const previouslySelectedSeatId = selectedSeatId;

        selectedSeatId = null;
        document.getElementById("selectedSeat").textContent =
           "No seat selected";

        await loadSeats();

        if (previouslySelectedSeatId) {
            displayQueue(previouslySelectedSeatId);
        }

        alert(`Seat ${seat.id} released successfully.`);
    } catch (error) {
        console.error("Seat release failed:", error);
        alert(error.message || "Unable to release seat.");
    }
}

function hasReservedSeat() {

    return seats.some(function (seat) {

        return (
            seat.status === "occupied" &&
            String(seat.occupantId) === String(currentUser.id)
        );

    });
}

/* UPDATE BUTTONS */
function updateButtons() {

    const reserveButton =
        document.getElementById("reserveButton");

    const releaseButton =
        document.getElementById("releaseButton");

    const queueButton =
        document.getElementById("queueButton");

    const leaveQueueButton =
        document.getElementById("leaveQueueButton");
    const examCheckbox = document.getElementById("hasExamSoon");


    // Disable everything initially
    reserveButton.disabled = true;
    releaseButton.disabled = true;
    queueButton.disabled = true;
    leaveQueueButton.disabled = true;
    const examLock = document.getElementById("examLock");
    if (examCheckbox) {
        examCheckbox.disabled = hasReservedSeat();
        if (examCheckbox.disabled) {
           examCheckbox.checked = false;
        }
    }
    if (examLock) {
       examLock.hidden = !hasReservedSeat();
    }


    // Nothing selected
    if (selectedSeatId === null) {
        return;
    }


    const seat =
        seats.find(function (seat) {

            return seat.id === selectedSeatId;

        });


    if (!seat) {
        return;
    }


    const queue = seat.waitingQueue || [];

    const isInQueue = queue.some(
        student =>
          String(student.studentId) === String(currentUser.id)
    );


    const alreadyHasSeat =
        hasReservedSeat();


    /*
     * =========================================
     * OWN OCCUPIED SEAT
     * =========================================
     */

    if (
        seat.status === "occupied" &&
        String(seat.occupantId) ===
        String(currentUser.id)
    ) {

        // This is MY seat
        releaseButton.disabled = false;

        // I cannot queue while I already have a seat
        queueButton.disabled = true;

        // I cannot reserve another seat
        reserveButton.disabled = true;

        return;
    }


    /*
     * =========================================
     * AVAILABLE SEAT
     * =========================================
     */

    if (seat.status === "available") {

        // Only allow reservation if user
        // doesn't already have another seat
        reserveButton.disabled =
            alreadyHasSeat;

        return;
    }


    /*
     * =========================================
     * SOMEONE ELSE'S OCCUPIED SEAT
     * =========================================
     */

    if (
        seat.status === "occupied" &&
        String(seat.occupantId) !==
        String(currentUser.id)
    ) {

        // Can't queue if already holding a seat
        queueButton.disabled =
            isInQueue || alreadyHasSeat;

    }


    /*
     * =========================================
     * ALREADY IN QUEUE
     * =========================================
     */

    if (isInQueue) {

        leaveQueueButton.disabled = false;

    }

}
/* SEAT STATISTICS */

function updateSeatStats() {

    const availableSeats =
        seats.filter(function (seat) {

            return seat.status === "available";

        });


    const occupiedSeats =
        seats.filter(function (seat) {

            return seat.status === "occupied";

        });


    document.getElementById("availableCount").textContent =
        availableSeats.length;


    document.getElementById("occupiedCount").textContent =
        occupiedSeats.length;
}

function displayQueue(seatId) {
    const queueContainer = document.getElementById("queueContainer");
    const seat = seats.find(s => s.id === seatId);
    const queue = seat?.waitingQueue || [];

    if (!queue.length) {
        queueContainer.innerHTML = "<p>No students are waiting.</p>";
        return;
    }

    queueContainer.innerHTML = "";

    queue.forEach((student, index) => {
        const card = document.createElement("div");
        card.className = "queue-student";

        const examText = student.hasExamSoon
            ? "Exam Priority"
            : "Regular";

        card.textContent =
            `#${index + 1} | ${student.studentName} | ` +
            `Year ${student.year} | ${examText} | ` +
            `Priority: ${student.priorityScore}`;

        queueContainer.appendChild(card);
    });
}

function canAccessSeat(seat) {

    if (currentUser.role === "library_admin") {

        return true;

    }


    return (
        seat.department ===
        currentUser.department
    );

}

/* BUTTON EVENTS */

document
    .getElementById("reserveButton")
    .addEventListener("click", reserveSeat);


document
    .getElementById("releaseButton")
    .addEventListener("click", releaseSeat);

document.getElementById("queueButton").addEventListener("click", async function () {
    if (selectedSeatId === null) {
        alert("Please select a seat first.");
        return;
    }

    if (hasReservedSeat()) {
        alert("Release your current seat before joining a queue.");
        return;
    }

    const seat = seats.find(s => s.id === selectedSeatId);

    if (!seat || seat.status !== "occupied") {
        alert("You can only join the queue for an occupied seat.");
        return;
    }

    if (String(seat.occupantId) === String(currentUser.id)) {
        alert("You cannot join the queue for your own seat.");
        return;
    }

    try {
        const response = await fetch(
            `${SEATS_API}/${encodeURIComponent(seat.id)}/queue`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: String(currentUser.id),
                    studentName: currentUser.name,
                    year: String(currentUser.year || "1"),
                    hasExamSoon: document.getElementById("hasExamSoon").checked
                })
            }
        );
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to join queue.");
        }

        await loadSeats();
        displayQueue(seat.id);
        alert(`You joined the queue for ${seat.id}.`);
    } catch (error) {
        console.error("Join queue failed:", error);
        alert(error.message || "Unable to join queue.");
    }
});


document.getElementById("leaveQueueButton").addEventListener("click", async function () {
    if (!selectedSeatId) {
        alert("Please select a seat first.");
        return;
    }

    try {
        const response = await fetch(
            `${SEATS_API}/${encodeURIComponent(selectedSeatId)}/queue/${encodeURIComponent(currentUser.id)}`,
            { method: "DELETE" }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to leave queue.");
        }

        await loadSeats();
        displayQueue(selectedSeatId);
        alert("You left the queue successfully.");
    } catch (error) {
        console.error("Leave queue failed:", error);
        alert(error.message || "Unable to leave queue.");
    }
});


/* INITIAL DISPLAY */

loadSeats();