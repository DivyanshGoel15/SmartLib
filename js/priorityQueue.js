const QUEUES_KEY = "smartlib_queues";


function getQueues() {

    const storedQueues =
        localStorage.getItem(QUEUES_KEY);

    if (storedQueues) {
        return JSON.parse(storedQueues);
    }

    return {};
}


function saveQueues(queues) {

    localStorage.setItem(
        QUEUES_KEY,
        JSON.stringify(queues)
    );
}


/* CALCULATE PRIORITY */

function getYearNumber(year) {

    if (typeof year === "number") {

        return year;

    }

    const match =
        String(year).match(/\d+/);

    return match
        ? Number(match[0])
        : 0;
}


function calculatePriority(student) {

    let priority = 0;

    if (isExamActive(student)) {

        priority += 100;

    }

    priority +=
        getYearNumber(student.year) * 10;

    return priority;
}


/* SORT QUEUE */

function sortQueue(queue) {

    queue.sort(function (studentA, studentB) {

        const priorityA =
            calculatePriority(studentA);

        const priorityB =
            calculatePriority(studentB);

        if (priorityA !== priorityB) {

            return priorityB - priorityA;

        }

        return (
            studentA.requestedAt -
            studentB.requestedAt
        );

    });

    return queue;
}


/* CHECK ACTIVE EXAM */

function isExamActive(student) {

    const exams =
        JSON.parse(
            localStorage.getItem("smartlibExams") || "[]"
        );

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return exams.some(function (exam) {

        if (
            exam.department !== student.department ||
            exam.year !== student.year
        ) {

            return false;

        }

        const start =
            new Date(exam.startDate);

        const end =
            new Date(exam.endDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {

            return false;

        }

        start.setHours(0, 0, 0, 0);

        end.setHours(23, 59, 59, 999);

        return (
            today >= start &&
            today <= end
        );

    });
}


/* ADD TO QUEUE */

function addToQueue(seatId, student) {

    const queues = getQueues();

    if (!queues[seatId]) {

        queues[seatId] = [];

    }

    const alreadyInQueue =
        queues[seatId].some(function (person) {

            return (
                String(person.userId) ===
                String(student.id)
            );

        });

    if (alreadyInQueue) {

        return false;

    }

    const queueEntry = {

        userId: student.id,
        name: student.name,
        department: student.department,
        year: student.year,

        examStatus:
            isExamActive(student)
                ? "exam"
                : "regular",

        requestedAt: Date.now()

    };

    queues[seatId].push(queueEntry);

    sortQueue(queues[seatId]);

    saveQueues(queues);

    return true;
}


/* REMOVE FROM QUEUE */

function removeFromQueue(seatId, userId) {

    const queues = getQueues();

    if (!queues[seatId]) {

        return false;

    }

    const oldLength =
        queues[seatId].length;

    queues[seatId] =
        queues[seatId].filter(function (student) {

            return (
                String(student.userId) !==
                String(userId)
            );

        });

    saveQueues(queues);

    return (
        queues[seatId].length <
        oldLength
    );
}


/* REMOVE USER FROM ALL QUEUES */

function removeFromAllQueues(userId) {

    const queues = getQueues();

    let removedCount = 0;

    Object.keys(queues).forEach(function (seatId) {

        const oldLength =
            queues[seatId].length;

        queues[seatId] =
            queues[seatId].filter(function (student) {

                return (
                    String(student.userId) !==
                    String(userId)
                );

            });

        removedCount +=
            oldLength -
            queues[seatId].length;

    });

    saveQueues(queues);

    return removedCount;
}


/* GET SORTED QUEUE */

function getQueue(seatId) {

    const queues = getQueues();

    const queue =
        queues[seatId] || [];

    sortQueue(queue);

    return queue;
}


/* GET HIGHEST PRIORITY STUDENT */

function getNextStudent(seatId) {

    const queue =
        getQueue(seatId);

    if (queue.length === 0) {

        return null;

    }

    return queue[0];
}


/* AUTOMATIC SEAT HANDOFF */

function handoffSeat(seatId, seats) {

    const queue =
        getQueue(seatId);

    if (queue.length === 0) {

        return null;

    }

    const seat =
        seats.find(function (seat) {

            return seat.id === seatId;

        });

    if (!seat) {

        return null;

    }

    /*
     * Find the highest-priority student
     * who does not already have a seat.
     */

    const nextStudent =
        queue.find(function (student) {

            return !seats.some(function (existingSeat) {

                return (
                    existingSeat.status === "occupied" &&
                    String(existingSeat.occupantId) ===
                    String(student.userId)
                );

            });

        });

    if (!nextStudent) {

        return null;

    }

    /* Give the seat to the next eligible student */

    seat.status = "occupied";

    seat.occupantId =
        nextStudent.userId;

    /* Remove from this queue */

    removeFromQueue(
        seatId,
        nextStudent.userId
    );

    /* Remove from every other queue */

    const queues = getQueues();

    Object.keys(queues).forEach(function (otherSeatId) {

        queues[otherSeatId] =
            queues[otherSeatId].filter(function (student) {

                return (
                    String(student.userId) !==
                    String(nextStudent.userId)
                );

            });

    });

    saveQueues(queues);

    return nextStudent;
}