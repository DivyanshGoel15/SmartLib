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

function calculatePriority(student) {

    let priority = 0;


    /* EXAM STATUS */

    if (student.examStatus === true) {

        priority += 100;

    }


    /* ACADEMIC YEAR */

    priority += student.year * 10;


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


/* ADD TO QUEUE */

function addToQueue(seatId, student) {

    const queues = getQueues();


    if (!queues[seatId]) {

        queues[seatId] = [];

    }


    const alreadyInQueue =
        queues[seatId].some(function (person) {

            return person.userId === student.id;

        });


    if (alreadyInQueue) {

        return false;

    }


    const queueEntry = {

        userId: student.id,
        name: student.name,
        department: student.department,
        year: student.year,
        examStatus: student.examStatus,
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


    const index =
        queues[seatId].findIndex(function (person) {

            return person.userId === userId;

        });


    if (index === -1) {

        return false;

    }


    queues[seatId].splice(index, 1);


    saveQueues(queues);


    return true;
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

    const queue = getQueue(seatId);

    if (queue.length === 0) {

        return null;

    }

    return queue[0];

}