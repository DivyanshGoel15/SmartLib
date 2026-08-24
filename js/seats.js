const departments = [
    "CSE",
    "ECE",
    "Mechanical",
    "Civil",
    "Management"
];
const seatNumbers = [
    3, 7, 12, 16, 21,
    26, 31, 37, 43, 48,

    1, 6, 11, 18, 23,
    28, 34, 39, 45, 50,

    2, 9, 14, 19, 25,
    30, 35, 41, 46, 49,

    4, 8, 13, 20, 24,
    29, 36, 40, 44, 47,

    5, 10, 15, 17, 22,
    27, 32, 33, 38, 42
];
const testOccupants = {
    CSE: [9001, 9002, 9003],
    ECE: [9011, 9012, 9013],
    Mechanical: [9021, 9022, 9023],
    Civil: [9031, 9032, 9033],
    Management: [9041, 9042, 9043]
};


const defaultSeats = [];

departments.forEach(function (department, departmentIndex) {

    const start = departmentIndex * 10;

    const departmentSeats =
        seatNumbers.slice(start, start + 10);

    departmentSeats.forEach(function (number, index) {

        const isOccupied = index < 3;

        defaultSeats.push({

            id:
                `${department}-S${String(number).padStart(2, "0")}`,

            department:
                department,

            status:
                isOccupied
                    ? "occupied"
                    : "available",

            occupantId:
                isOccupied
                    ? testOccupants[department][index]
                    : null

        });

    });

});



let seats = getStoredSeats();


if (!seats) {

    seats = defaultSeats;

    saveSeats(seats);

}


let selectedSeatId = null;


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
            <p>${seat.status}</p>
        `;
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
}


/* RESERVE SEAT */

function reserveSeat() {

    if (selectedSeatId === null) {
        alert("Please select a seat first.");
        return;
    }

    const seat = seats.find(function (seat) {
        return seat.id === selectedSeatId;
    });

    if (!seat) {
        alert("Seat not found.");
        return;
    }

    // Students can only reserve one seat
    const alreadyReserved = seats.some(function (existingSeat) {

        return (
            existingSeat.status === "occupied" &&
            String(existingSeat.occupantId) === String(currentUser.id)
        );

    });

    if (alreadyReserved) {
        alert(
            "You already have a reserved seat. Release it before reserving another seat."
        );
        return;
    }

    // Department access
    if (
        currentUser.role !== "library_admin" &&
        seat.department !== currentUser.department
    ) {

        alert(
            `You can only reserve seats in the ${currentUser.department} library.`
        );

        return;
    }

    // Seat already occupied
    if (seat.status === "occupied") {
        alert("This seat is already occupied.");
        return;
    }

    // Reserve
    seat.status = "occupied";
    seat.occupantId = currentUser.id;

    // Remove user from EVERY queue after getting a seat.
    // This also returns how many queue entries were removed.
    const removedCount = removeFromAllQueues(currentUser.id);

    // Save seat data
    saveSeats(seats);

    // Clear selection
    selectedSeatId = null;

    document.getElementById("selectedSeat").textContent =
        "No seat selected";

    // Refresh everything
    displaySeats();

    // Clear queue display
    const queueContainer =
        document.getElementById("queueContainer");

    if (queueContainer) {
        queueContainer.innerHTML =
            "<p>No students are waiting.</p>";
    }

   if (removedCount > 0) {
        alert(
           `Seat ${seat.id} reserved successfully. You have been removed from all queues.`
        );
    } else {
        alert(
           `Seat ${seat.id} reserved successfully.`
        );
    }
}

/* RELEASE SEAT */
/* RELEASE SEAT */

function releaseSeat() {

    if (selectedSeatId === null) {

        alert("Please select your seat first.");

        return;

    }


    const seat = seats.find(function (seat) {

        return seat.id === selectedSeatId;

    });


    if (!seat) {

        alert("Seat not found.");

        return;

    }


    if (String(seat.occupantId) !== String(currentUser.id)) {

        alert("You can only release your own seat.");

        return;

    }


    // Release the current seat

    seat.status = "available";

    seat.occupantId = null;


    // Automatically hand the seat to the
    // highest-priority student in the queue

    const handedOffStudent =
        handoffSeat(seat.id, seats);


    saveSeats(seats);


    // Show what happened

    if (handedOffStudent) {

        alert(
            `Seat ${seat.id} was automatically handed to ${handedOffStudent.name}.`
        );

    } else {

        alert(
            `Seat ${seat.id} released successfully.`
        );

    }


    selectedSeatId = null;


    document.getElementById("selectedSeat").textContent =
        "No seat selected";


    displaySeats();

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


    // Disable everything initially
    reserveButton.disabled = true;
    releaseButton.disabled = true;
    queueButton.disabled = true;
    leaveQueueButton.disabled = true;


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


    const queue =
        getQueue(selectedSeatId);


    const isInQueue =
        queue.some(function (student) {

            return String(student.userId) ===
                   String(currentUser.id);

        });


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

    const queueContainer =
        document.getElementById("queueContainer");


    const queue = getQueue(seatId);


    if (queue.length === 0) {

        queueContainer.innerHTML =
            "<p>No students are waiting.</p>";

        return;

    }


    queueContainer.innerHTML = "";


    queue.forEach(function (student, index) {

        const studentCard =
            document.createElement("div");


        const examText =
            isExamActive(student)
               ? "Exam Priority"
               : "Regular";

        const priority =
            calculatePriority(student);


        studentCard.innerHTML = `
            <p>
                <strong>#${index + 1}</strong>
                |
                ${student.name}
                |
                Year ${student.year}
                |
                ${examText}
                |
                Priority: ${priority}
            </p>
        `;


        queueContainer.appendChild(studentCard);

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
document
    .getElementById("queueButton")
    .addEventListener("click", function () {
        if (hasReservedSeat()) {

            alert(
              "You already have a reserved seat. Release it before joining a queue."
            );

            return;
}

        if (selectedSeatId === null) {
            return;
        }


        const seat = seats.find(function (seat) {

            return seat.id === selectedSeatId;

        });


        if (!seat) {
            return;
        }

        if (seat.status !== "occupied") {
            alert("You can only join the queue for an occupied seat.");
            return;
        }

        if (
            String(seat.occupantId) ===
            String(currentUser.id)
        ) {
            alert("This is your seat. You cannot join its queue.");
            return;
        }


        const student = {

            id: currentUser.id,
            name: currentUser.name,
            department: currentUser.department,
            year: currentUser.year,

            // Temporary until Anvi's exam system
            // is connected.
            examStatus: currentUser.examStatus

        };


        const added =
            addToQueue(selectedSeatId, student);


        if (added) {

            alert(
                `You joined the queue for ${selectedSeatId}.`
            );

            displayQueue(selectedSeatId);

        } else {

            alert(
                "You are already in this queue."
            );

        }

    });
document
    .getElementById("leaveQueueButton")
    .addEventListener("click", function () {

        if (selectedSeatId === null) {

            return;

        }


        const removed =
            removeFromQueue(
                selectedSeatId,
                currentUser.id
            );


        if (removed) {

            alert(
                `You left the queue for ${selectedSeatId}.`
            );

        } else {

            alert(
                "You are not in this queue."
            );

        }


        displayQueue(
            selectedSeatId
        );


        updateButtons();

    });


/* INITIAL DISPLAY */

displaySeats();