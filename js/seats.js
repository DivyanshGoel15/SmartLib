const defaultSeats = [
    {
        id: "S01",
        department: "CSE",
        status: "available",
        occupantId: null
    },
    {
        id: "S02",
        department: "CSE",
        status: "available",
        occupantId: null
    },
    {
        id: "S03",
        department: "CSE",
        status: "occupied",
        occupantId: 102
    },
    {
        id: "S04",
        department: "CSE",
        status: "available",
        occupantId: null
    },
    {
        id: "S05",
        department: "CSE",
        status: "occupied",
        occupantId: 105
    },
    {
        id: "S06",
        department: "CSE",
        status: "available",
        occupantId: null
    },
    {
        id: "S07",
        department: "CSE",
        status: "available",
        occupantId: null
    },
    {
        id: "S08",
        department: "CSE",
        status: "available",
        occupantId: null
    }
];


let seats = getStoredSeats();


if (!seats) {

    seats = defaultSeats;

    saveSeats(seats);

}


let selectedSeatId = null;


/* TEMPORARY CURRENT USER */

const currentUser = {
    id: 101,
    name: "Divyanjali",
    department: "CSE",
    year: 2
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


        if (seat.status === "available") {

            seatCard.classList.add("available");

        } else {

            seatCard.classList.add("occupied");

        }


        if (seat.id === selectedSeatId) {

            seatCard.classList.add("selected");

        }


        seatCard.innerHTML = `
            <h3>${seat.id}</h3>
            <p>${seat.status}</p>
        `;


       

        seatCard.addEventListener(
           "click",
            function () {
                selectSeat(seat.id);
            }
);




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


    if (seat.status === "occupied") {

        alert("This seat is already occupied.");

        return;
    }


    seat.status = "occupied";

    seat.occupantId = currentUser.id;
    saveSeats(seats);


    alert(`Seat ${seat.id} reserved successfully.`);


    selectedSeatId = null;

    document.getElementById("selectedSeat").textContent =
        "No seat selected";


    displaySeats();
}


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


    if (seat.occupantId !== currentUser.id) {

        alert("You can only release your own seat.");

        return;
    }


    seat.status = "available";

    seat.occupantId = null;
    saveSeats(seats);


    alert(`Seat ${seat.id} released successfully.`);


    selectedSeatId = null;

    document.getElementById("selectedSeat").textContent =
        "No seat selected";


    displaySeats();
}


/* UPDATE BUTTONS */
function updateButtons() {

    const reserveButton =
        document.getElementById("reserveButton");

    const releaseButton =
        document.getElementById("releaseButton");

    const queueButton =
        document.getElementById("queueButton");


    reserveButton.disabled = true;

    releaseButton.disabled = true;

    queueButton.disabled = true;


    if (selectedSeatId === null) {

        return;

    }


    const seat = seats.find(function (seat) {

        return seat.id === selectedSeatId;

    });


    if (!seat) {

        return;

    }


    if (seat.status === "available") {

        reserveButton.disabled = false;

    }


    if (
        seat.status === "occupied" &&
        seat.occupantId === currentUser.id
    ) {

        releaseButton.disabled = false;

    }


    if (
        seat.status === "occupied" &&
        seat.occupantId !== currentUser.id
    ) {

        queueButton.disabled = false;

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


        studentCard.innerHTML = `
            <p>
                <strong>Position:</strong> ${index + 1}
                |
                <strong>${student.name}</strong>
                |
                Year ${student.year}
            </p>
        `;


        queueContainer.appendChild(studentCard);

    });
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

        if (selectedSeatId === null) {

            return;

        }


        const seat = seats.find(function (seat) {

            return seat.id === selectedSeatId;

        });


        if (!seat) {

            return;

        }


        const student = {

            id: currentUser.id,

            name: currentUser.name,

            department: currentUser.department,

            year: currentUser.year,

            examStatus: "none"

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

/* INITIAL DISPLAY */

displaySeats();