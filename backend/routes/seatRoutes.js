const express = require('express');
const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const User = require('../models/User');
const Exam = require('../models/Exam');
const { authenticate, requireRole } = require('../middleware/auth');
const { isAcademicYear, getAcademicYearRank } = require('../utils/academicYears');

const router = express.Router();
const isAdministrator = user => ['library_admin', 'admin'].includes(String(user.role || '').toLowerCase());
const currentStudentId = user => String(user._id);

async function removeStudentFromAllQueues(studentIds) {
    await Seat.updateMany(
        { 'waitingQueue.studentId': { $in: studentIds.map(String) } },
        {
            $pull: { waitingQueue: { studentId: { $in: studentIds.map(String) } } },
            $inc: { __v: 1 }
        }
    );
}

async function resolveQueuedStudent(studentId) {
    let user = mongoose.Types.ObjectId.isValid(studentId)
        ? await User.findById(studentId)
        : null;
    if (!user) {
        user = await User.findOne({ studentId, role: 'student' });
    }
    return user && user.role === 'student' ? user : null;
}

router.get('/', authenticate, async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.department) filter.department = req.query.department;
        const seats = await Seat.find(filter).sort({ seatCode: 1 });
        return res.json(seats);
    } catch (error) {
        return next(error);
    }
});

router.get('/:dept', authenticate, async (req, res, next) => {
    try {
        const seats = await Seat.find({ department: req.params.dept }).sort({ seatCode: 1 });
        return res.json(seats);
    } catch (error) {
        return next(error);
    }
});

router.put('/:seatCode/occupy', authenticate, requireRole('student'), async (req, res, next) => {
    try {
        const studentId = currentStudentId(req.user);
        const department = String(req.user.department || '');
        if (!department) {
            return res.status(403).json({ message: 'A department must be associated with your account to reserve a seat.' });
        }
        const alreadyOccupying = await Seat.exists({
            status: 'occupied',
            'currentOccupant.studentId': studentId
        });
        if (alreadyOccupying) {
            return res.status(409).json({ message: 'You already occupy a seat.' });
        }

        const seat = await Seat.findOneAndUpdate(
            { seatCode: req.params.seatCode, status: 'available', department },
            {
                $set: {
                    status: 'occupied',
                    currentOccupant: {
                        studentId,
                        studentName: req.user.name,
                        startTime: new Date()
                    }
                },
                $inc: { __v: 1 }
            },
            { new: true, runValidators: true }
        );

        if (!seat) {
            return res.status(409).json({ message: 'Seat not found or not available.' });
        }

        await removeStudentFromAllQueues([studentId]);
        return res.json({
            message: 'Seat occupied successfully. Waiting queues updated.',
            seat
        });
    } catch (error) {
        return next(error);
    }
});

router.put('/:seatCode/release', authenticate, async (req, res, next) => {
    try {
        const existingSeat = await Seat.findOne({
            seatCode: req.params.seatCode,
            status: 'occupied'
        });
        if (!existingSeat) {
            return res.status(404).json({ message: 'Occupied seat not found.' });
        }

        const admin = isAdministrator(req.user);
        if (!admin) {
            const ownsSeat = req.user.role === 'student' &&
                existingSeat.currentOccupant &&
                String(existingSeat.currentOccupant.studentId || '') === currentStudentId(req.user);
            if (!ownsSeat) {
                return res.status(403).json({ message: 'You may only release a seat you occupy.' });
            }
        }

        const sortedQueue = [...existingSeat.waitingQueue].sort(
            (a, b) =>
                b.priorityScore - a.priorityScore ||
                new Date(a.joinedAt) - new Date(b.joinedAt)
        );

        let nextStudent = null;
        for (const queuedStudent of sortedQueue) {
            const user = await resolveQueuedStudent(String(queuedStudent.studentId));
            if (!user) continue;

            const studentId = String(user._id);
            const alreadyOccupying = await Seat.exists({
                seatCode: { $ne: existingSeat.seatCode },
                status: 'occupied',
                'currentOccupant.studentId': studentId
            });
            if (alreadyOccupying) continue;

            nextStudent = { queuedStudent, user };
            break;
        }

        const seatFilter = {
            _id: existingSeat._id,
            __v: existingSeat.__v,
            status: 'occupied',
            'currentOccupant.studentId': existingSeat.currentOccupant?.studentId
        };
        const update = nextStudent
            ? {
                $set: {
                    status: 'occupied',
                    currentOccupant: {
                        studentId: String(nextStudent.user._id),
                        studentName: nextStudent.user.name,
                        startTime: new Date()
                    }
                },
                $pull: { waitingQueue: { studentId: String(nextStudent.queuedStudent.studentId) } },
                $inc: { __v: 1 }
            }
            : {
                $set: { status: 'available', currentOccupant: {}, waitingQueue: [] },
                $inc: { __v: 1 }
            };

        const releasedSeat = await Seat.findOneAndUpdate(
            seatFilter,
            update,
            { new: true, runValidators: true }
        );
        if (!releasedSeat) {
            return res.status(409).json({
                message: 'Seat changed during release. Refresh and try again.'
            });
        }

        if (nextStudent) {
            await removeStudentFromAllQueues([
                String(nextStudent.queuedStudent.studentId),
                String(nextStudent.user._id)
            ]);
            return res.json({
                message: `Seat assigned to ${nextStudent.user.name} from the waiting queue.`,
                assignedStudent: {
                    studentId: String(nextStudent.user._id),
                    studentName: nextStudent.user.name
                },
                seat: releasedSeat
            });
        }

        return res.json({
            message: 'Seat released successfully. No eligible students were waiting.',
            seat: releasedSeat
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/:seatCode/queue', authenticate, requireRole('student'), async (req, res, next) => {
    try {
        const studentId = currentStudentId(req.user);
        const year = String(req.user.year || '');
        const department = String(req.user.department || '');
        if (!department) {
            return res.status(403).json({ message: 'A department must be associated with your account to join a queue.' });
        }
        if (!isAcademicYear(year)) {
            return res.status(400).json({ message: 'A valid academic year is required for queue priority.' });
        }

        const alreadyOccupying = await Seat.exists({
            status: 'occupied',
            'currentOccupant.studentId': studentId
        });
        if (alreadyOccupying) {
            return res.status(409).json({ message: 'Release your occupied seat before joining a queue.' });
        }

        const hasExamSoon = Boolean(await Exam.exists({
            department,
            year: { $in: [year, 'All Years'] },
            endDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }));
        const priorityScore =
            (hasExamSoon ? 100 : 0) +
            getAcademicYearRank(year) * 10;

        const seat = await Seat.findOneAndUpdate(
            {
                seatCode: req.params.seatCode,
                department,
                status: 'occupied',
                'currentOccupant.studentId': { $ne: studentId },
                'waitingQueue.studentId': { $ne: studentId }
            },
            {
                $push: {
                    waitingQueue: {
                        $each: [{
                            studentId,
                            studentName: req.user.name,
                            year,
                            hasExamSoon,
                            priorityScore,
                            joinedAt: new Date()
                        }],
                        $sort: { priorityScore: -1, joinedAt: 1 }
                    }
                },
                $inc: { __v: 1 }
            },
            { new: true, runValidators: true }
        );

        if (!seat) {
            const existingSeat = await Seat.findOne({ seatCode: req.params.seatCode });
            if (!existingSeat) {
                return res.status(404).json({ message: 'Seat not found.' });
            }
            if (existingSeat.status !== 'occupied') {
                return res.status(409).json({ message: 'Queue is only available for occupied seats.' });
            }
            return res.status(409).json({
                message: 'Student is already in this queue or occupies this seat.'
            });
        }

        return res.status(201).json({ message: 'Added to waiting queue.', seat });
    } catch (error) {
        return next(error);
    }
});

router.delete('/:seatCode/queue/:studentId', authenticate, async (req, res, next) => {
    try {
        const targetId = String(req.params.studentId);
        if (!isAdministrator(req.user) &&
            (req.user.role !== 'student' || targetId !== currentStudentId(req.user))) {
            return res.status(403).json({ message: 'You may only remove yourself from a waiting queue.' });
        }

        const seat = await Seat.findOneAndUpdate(
            {
                seatCode: req.params.seatCode,
                'waitingQueue.studentId': targetId
            },
            {
                $pull: { waitingQueue: { studentId: targetId } },
                $inc: { __v: 1 }
            },
            { new: true }
        );
        if (!seat) {
            const existingSeat = await Seat.exists({ seatCode: req.params.seatCode });
            return res.status(404).json({
                message: existingSeat ? 'Student not found in this queue.' : 'Seat not found.'
            });
        }

        return res.json({ message: 'Removed from waiting queue.', seat });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
