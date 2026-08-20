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


    saveQueues(queues);


    return true;
}


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


function getQueue(seatId) {

    const queues = getQueues();


    return queues[seatId] || [];

}