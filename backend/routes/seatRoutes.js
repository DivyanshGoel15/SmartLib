
const express = require("express");
const Seat = require("../models/Seat");

const router = express.Router();

// Helper: Remove a student from every seat's waiting queue.
async function removeStudentFromAllQueues(studentId) {
    await Seat.updateMany(
        {},
        {
            $pull: {
                waitingQueue: {
                    studentId: String(studentId)
                }
            }
        }
    );
}

// GET /api/seats - Get all seats, optionally filtered by department
router.get("/", async (req, res) => {
    try {
        const filter = {};

        if (req.query.department) {
            filter.department = req.query.department;
        }

        const seats = await Seat.find(filter).sort({ seatCode: 1 });
        res.json(seats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/seats/:dept - Get seats for a department
router.get("/:dept", async (req, res) => {
    try {
        const seats = await Seat.find({
            department: req.params.dept
        }).sort({ seatCode: 1 });

        res.json(seats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/seats/:seatCode/occupy
// Occupy an available seat and remove the student from all waiting queues.
router.put("/:seatCode/occupy", async (req, res) => {
    try {
        const { studentId, studentName } = req.body;

        if (!studentId || !studentName) {
            return res.status(400).json({
                message: "studentId and studentName are required"
            });
        }

        const seat = await Seat.findOneAndUpdate(
            {
                seatCode: req.params.seatCode,
                status: "available"
            },
            {
                $set: {
                    status: "occupied",
                    currentOccupant: {
                        studentId: String(studentId),
                        studentName,
                        startTime: new Date()
                    }
                }
            },
            { new: true, runValidators: true }
        );

        if (!seat) {
            return res.status(409).json({
                message: "Seat not found or not available"
            });
        }

        // A student who gets a seat must no longer wait for another seat.
        await removeStudentFromAllQueues(studentId);

        res.json({
            message: "Seat occupied successfully. Waiting queues updated.",
            seat
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/seats/:seatCode/release
// Hand the seat to the highest-priority student, if one is waiting.
router.put("/:seatCode/release", async (req, res) => {
    try {
        const existingSeat = await Seat.findOne({
            seatCode: req.params.seatCode,
            status: "occupied"
        });

        if (!existingSeat) {
            return res.status(404).json({
                message: "Occupied seat not found"
            });
        }

        // Highest priority first; earliest queue entry wins ties.
        const sortedQueue = [...existingSeat.waitingQueue].sort(
            (a, b) =>
                b.priorityScore - a.priorityScore ||
                new Date(a.joinedAt) - new Date(b.joinedAt)
        );

        const nextStudent = sortedQueue[0];

        const update = nextStudent
            ? {
                $set: {
                    status: "occupied",
                    currentOccupant: {
                        studentId: nextStudent.studentId,
                        studentName: nextStudent.studentName,
                        startTime: new Date()
                    }
                },
                $pull: {
                    waitingQueue: {
                        studentId: nextStudent.studentId
                    }
                }
            }
            : {
                $set: {
                    status: "available",
                    currentOccupant: {}
                }
            };

        // Match the current occupant as well, so a concurrent release
        // cannot overwrite a handoff that has already happened.
        const releasedSeat = await Seat.findOneAndUpdate(
            {
                seatCode: req.params.seatCode,
                status: "occupied",
                "currentOccupant.studentId":
                    existingSeat.currentOccupant?.studentId
            },
            update,
            { new: true, runValidators: true }
        );

        if (!releasedSeat) {
            return res.status(409).json({
                message: "Seat changed during release. Refresh and try again."
            });
        }

        if (nextStudent) {
            // The assigned student must not remain in any other queue.
            await removeStudentFromAllQueues(nextStudent.studentId);

            return res.json({
                message: `Seat assigned to ${nextStudent.studentName} from the waiting queue.`,
                assignedStudent: {
                    studentId: nextStudent.studentId,
                    studentName: nextStudent.studentName
                },
                seat: releasedSeat
            });
        }

        res.json({
            message: "Seat released successfully. No students were waiting.",
            seat: releasedSeat
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/seats/:seatCode/queue - Join the waiting queue
router.post("/:seatCode/queue", async (req, res) => {
    try {
        const { studentId, studentName, year, hasExamSoon } = req.body;

        if (!studentId || !studentName || !year) {
            return res.status(400).json({
                message: "studentId, studentName and year are required"
            });
        }

        const seat = await Seat.findOne({
            seatCode: req.params.seatCode
        });

        if (!seat) {
            return res.status(404).json({
                message: "Seat not found"
            });
        }

        if (seat.status !== "occupied") {
            return res.status(409).json({
                message: "Queue is only available for occupied seats"
            });
        }

        const normalizedStudentId = String(studentId);

        if (
            seat.currentOccupant?.studentId === normalizedStudentId
        ) {
            return res.status(409).json({
                message: "The current occupant cannot join this seat's queue"
            });
        }

        const alreadyQueued = seat.waitingQueue.some(
            student => student.studentId === normalizedStudentId
        );

        if (alreadyQueued) {
            return res.status(409).json({
                message: "Student is already in this queue"
            });
        }

        const priorityScore =
            (hasExamSoon === true ? 100 : 0) +
            (Number(String(year).match(/\d+/)?.[0]) || 0) * 10;

        seat.waitingQueue.push({
            studentId: normalizedStudentId,
            studentName,
            year: String(year),
            hasExamSoon: hasExamSoon === true,
            priorityScore,
            joinedAt: new Date()
        });

        seat.waitingQueue.sort(
            (a, b) =>
                b.priorityScore - a.priorityScore ||
                new Date(a.joinedAt) - new Date(b.joinedAt)
        );

        await seat.save();

        res.status(201).json({
            message: "Added to waiting queue",
            seat
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/seats/:seatCode/queue/:studentId - Leave a queue
router.delete("/:seatCode/queue/:studentId", async (req, res) => {
    try {
        const seat = await Seat.findOne({
            seatCode: req.params.seatCode
        });

        if (!seat) {
            return res.status(404).json({
                message: "Seat not found"
            });
        }

        const originalLength = seat.waitingQueue.length;

        seat.waitingQueue = seat.waitingQueue.filter(
            student => student.studentId !== req.params.studentId
        );

        if (seat.waitingQueue.length === originalLength) {
            return res.status(404).json({
                message: "Student not found in this queue"
            });
        }

        await seat.save();

        res.json({
            message: "Removed from waiting queue",
            seat
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
