/* =========================================================
   SMARTLIB
   PRIORITY QUEUE
   ========================================================= */

const QUEUES_KEY = "smartlib_queues";


/* =========================================================
   GET QUEUES
   ========================================================= */

function getQueues() {

    const storedQueues =
        localStorage.getItem(QUEUES_KEY);

    if (storedQueues) {

        try {

            return JSON.parse(storedQueues);

        } catch (error) {

            console.error(
                "Error reading queues:",
                error
            );

            return {};

        }

    }

    return {};

}


/* =========================================================
   SAVE QUEUES
   ========================================================= */

function saveQueues(queues) {

    localStorage.setItem(
        QUEUES_KEY,
        JSON.stringify(queues)
    );

}


/* =========================================================
   YEAR NUMBER
   ========================================================= */

function getYearNumber(year) {

    if (typeof year === "number") {

        return year;

    }

    const match =
        String(year || "").match(/\d+/);

    return match
        ? Number(match[0])
        : 0;

}


/* =========================================================
   NORMALIZE VALUE
   ========================================================= */

function normalizeValue(value) {

    return String(value || "")
        .trim()
        .toLowerCase();

}


/* =========================================================
   CHECK ACTIVE EXAM
   ========================================================= */

function isExamActive(student) {

    let exams = [];

    try {

        exams =
            JSON.parse(
                localStorage.getItem(
                    "smartlibExams"
                ) || "[]"
            );

    } catch (error) {

        console.error(
            "Error reading exams:",
            error
        );

        return false;

    }


    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    return exams.some(
        function (exam) {

            if (

                normalizeValue(
                    exam.department
                ) !==
                normalizeValue(
                    student.department
                )

                ||

                getYearNumber(
                    exam.year
                ) !==
                getYearNumber(
                    student.year
                )

            ) {

                return false;

            }


            const start =
                new Date(
                    exam.startDate
                );

            const end =
                new Date(
                    exam.endDate
                );


            if (

                Number.isNaN(
                    start.getTime()
                )

                ||

                Number.isNaN(
                    end.getTime()
                )

            ) {

                return false;

            }


            start.setHours(
                0,
                0,
                0,
                0
            );

            end.setHours(
                23,
                59,
                59,
                999
            );


            return (

                today >= start

                &&

                today <= end

            );

        }
    );

}


/* =========================================================
   CALCULATE PRIORITY
   ========================================================= */

function calculatePriority(student) {

    let priority = 0;


    /*
     * Active examination:
     * +100
     */

    if (
        isExamActive(student)
    ) {

        priority += 100;

    }


    /*
     * Higher year:
     * 4th = 40
     * 3rd = 30
     * 2nd = 20
     * 1st = 10
     */

    priority +=
        getYearNumber(
            student.year
        ) * 10;


    return priority;

}


/* =========================================================
   SORT QUEUE
   ========================================================= */

function sortQueue(queue) {

    queue.sort(
        function (
            studentA,
            studentB
        ) {

            const priorityA =
                calculatePriority(
                    studentA
                );

            const priorityB =
                calculatePriority(
                    studentB
                );


            /*
             * Higher priority first
             */

            if (
                priorityA !==
                priorityB
            ) {

                return (
                    priorityB -
                    priorityA
                );

            }


            /*
             * Same priority:
             * first come, first served
             */

            return (

                Number(
                    studentA.requestedAt ||
                    0
                )

                -

                Number(
                    studentB.requestedAt ||
                    0
                )

            );

        }
    );


    return queue;

}


/* =========================================================
   ADD TO QUEUE
   ========================================================= */

function addToQueue(
    resourceId,
    student
) {

    const queues =
        getQueues();


    if (
        !queues[resourceId]
    ) {

        queues[resourceId] = [];

    }


    /*
     * Prevent duplicate queue entry
     */

    const alreadyInQueue =
        queues[resourceId].some(
            function (person) {

                return (

                    String(
                        person.userId
                    )

                    ===

                    String(
                        student.id
                    )

                );

            }
        );


    if (
        alreadyInQueue
    ) {

        return false;

    }


    const queueEntry = {

        userId:
            student.id,

        name:
            student.name ||
            "Student",

        email:
            student.email ||
            "",

        department:
            student.department ||
            "",

        year:
            student.year ||
            "",

        resourceId:
            resourceId,

        examStatus:
            isExamActive(student)
                ? "exam"
                : "regular",

        requestedAt:
            Date.now()

    };


    queues[resourceId].push(
        queueEntry
    );


    sortQueue(
        queues[resourceId]
    );


    saveQueues(
        queues
    );


    return true;

}


/* =========================================================
   REMOVE FROM ONE QUEUE
   ========================================================= */

function removeFromQueue(
    resourceId,
    userId
) {

    const queues =
        getQueues();


    if (
        !queues[resourceId]
    ) {

        return false;

    }


    const oldLength =
        queues[resourceId].length;


    queues[resourceId] =
        queues[resourceId].filter(
            function (student) {

                return (

                    String(
                        student.userId
                    )

                    !==

                    String(
                        userId
                    )

                );

            }
        );


    if (
        queues[resourceId].length ===
        0
    ) {

        delete queues[resourceId];

    }


    saveQueues(
        queues
    );


    return (
        queues[resourceId]
            ? queues[resourceId].length <
              oldLength
            : oldLength > 0
    );

}


/* =========================================================
   REMOVE USER FROM ALL QUEUES
   ========================================================= */

function removeFromAllQueues(
    userId
) {

    const queues =
        getQueues();


    let removedCount = 0;


    Object.keys(
        queues
    ).forEach(
        function (resourceId) {

            const oldLength =
                queues[resourceId].length;


            queues[resourceId] =
                queues[resourceId].filter(
                    function (student) {

                        return (

                            String(
                                student.userId
                            )

                            !==

                            String(
                                userId
                            )

                        );

                    }
                );


            removedCount +=
                oldLength -
                queues[resourceId].length;


            if (
                queues[resourceId].length ===
                0
            ) {

                delete queues[
                    resourceId
                ];

            }

        }
    );


    saveQueues(
        queues
    );


    return removedCount;

}


/* =========================================================
   GET QUEUE
   ========================================================= */

function getQueue(
    resourceId
) {

    const queues =
        getQueues();


    const queue =
        queues[resourceId] ||
        [];


    sortQueue(
        queue
    );


    return queue;

}


/* =========================================================
   CHECK USER IN QUEUE
   ========================================================= */

function isUserInQueue(
    resourceId,
    userId
) {

    const queue =
        getQueue(
            resourceId
        );


    return queue.some(
        function (student) {

            return (

                String(
                    student.userId
                )

                ===

                String(
                    userId
                )

            );

        }
    );

}


/* =========================================================
   GET QUEUE POSITION
   ========================================================= */

function getQueuePosition(
    resourceId,
    userId
) {

    const queue =
        getQueue(
            resourceId
        );


    const index =
        queue.findIndex(
            function (student) {

                return (

                    String(
                        student.userId
                    )

                    ===

                    String(
                        userId
                    )

                );

            }
        );


    if (
        index === -1
    ) {

        return 0;

    }


    return index + 1;

}


/* =========================================================
   GET NEXT STUDENT
   ========================================================= */

function getNextStudent(
    resourceId
) {

    const queue =
        getQueue(
            resourceId
        );


    if (
        queue.length === 0
    ) {

        return null;

    }


    return queue[0];

}


/* =========================================================
   HANDOFF RESOURCE
   ========================================================= */

function handoffResource(
    resourceId,
    resources,
    reservations
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


    if (!resource) {

        return null;

    }


    /*
     * No available copy
     */

    if (
        Number(
            resource.availableQuantity
        ) <= 0
    ) {

        return null;

    }


    const queue =
        getQueue(
            resourceId
        );


    if (
        queue.length === 0
    ) {

        return null;

    }


    /*
     * Find first eligible student.
     */

    const activeReservations =
        reservations.filter(
            function (reservation) {

                return (
                    reservation.status ===
                    "active"
                );

            }
        );


    const nextStudent =
        queue.find(
            function (student) {

                const alreadyHasResource =
                    activeReservations.some(
                        function (
                            reservation
                        ) {

                            return (

                                String(
                                    reservation.userId
                                )

                                ===

                                String(
                                    student.userId
                                )

                                &&

                                String(
                                    reservation.resourceId
                                )

                                ===

                                String(
                                    resourceId
                                )

                            );

                        }
                    );


                const activeCount =
                    activeReservations.filter(
                        function (
                            reservation
                        ) {

                            return (

                                String(
                                    reservation.userId
                                )

                                ===

                                String(
                                    student.userId
                                )

                            );

                        }
                    ).length;


                return (

                    !alreadyHasResource

                    &&

                    activeCount < 2

                );

            }
        );


    if (!nextStudent) {

        return null;

    }


    /*
     * Create actual reservation.
     */

    const reservation = {

        id:
            "RSV" +
            Date.now() +
            Math.floor(
                Math.random() * 1000
            ),

        resourceId:
            resource.id,

        resourceName:
            resource.name,

        userId:
            nextStudent.userId,

        userName:
            nextStudent.name,

        userEmail:
            nextStudent.email ||
            "",

        department:
            nextStudent.department ||
            "",

        year:
            nextStudent.year ||
            "",

        userRole:
            "student",

        reservedAt:
            new Date().toISOString(),

        returnedAt:
            null,

        status:
            "active",

        promotedFromQueue:
            true,

        queueRequestedAt:
            nextStudent.requestedAt

    };


    reservations.push(
        reservation
    );


    /*
     * Consume one available copy.
     */

    resource.availableQuantity =
        Math.max(
            0,
            Number(
                resource.availableQuantity
            ) - 1
        );


    /*
     * Remove student from this queue.
     */

    removeFromQueue(
        resourceId,
        nextStudent.userId
    );


    /*
     * Remove student from all other queues.
     */

    removeFromAllQueues(
        nextStudent.userId
    );


    return {

        reservation:
            reservation,

        resource:
            resource,

        student:
            nextStudent

    };

}


/* =========================================================
   PROCESS ALL AVAILABLE RESOURCES
   ========================================================= */

function processAllQueueHandoffs() {

    if (

        typeof getResources !==
        "function"

        ||

        typeof getReservations !==
        "function"

        ||

        typeof saveResources !==
        "function"

        ||

        typeof saveReservations !==
        "function"

    ) {

        return 0;

    }


    const resources =
        getResources();


    const reservations =
        getReservations();


    let promotedCount = 0;


    resources.forEach(
        function (resource) {

            while (

                Number(
                    resource.availableQuantity
                ) > 0

                &&

                getQueue(
                    resource.id
                ).length > 0

            ) {

                const result =
                    handoffResource(
                        resource.id,
                        resources,
                        reservations
                    );


                if (!result) {

                    break;

                }


                promotedCount++;

            }

        }
    );


    if (
        promotedCount > 0
    ) {

        saveResources(
            resources
        );

        saveReservations(
            reservations
        );

    }


    return promotedCount;

}


/* =========================================================
   REFRESH QUEUE PRIORITIES
   ========================================================= */

function refreshAllQueues() {

    const queues =
        getQueues();


    Object.keys(
        queues
    ).forEach(
        function (resourceId) {

            sortQueue(
                queues[resourceId]
            );

        }
    );


    saveQueues(
        queues
    );

}