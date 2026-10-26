
const mongoose = require("mongoose");

const waitingQueueSchema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            required: true
        },
        studentName: {
            type: String,
            required: true
        },
        year: {
            type: String,
            required: true
        },
        hasExamSoon: {
            type: Boolean,
            default: false
        },
        priorityScore: {
            type: Number,
            default: 0
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const seatSchema = new mongoose.Schema(
    {
        seatCode: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        department: {
            type: String,
            required: true,
            enum: [
                "CSE",
                "ECE",
                "Mechanical",
                "Civil",
                "Management"
            ]
        },
        status: {
            type: String,
            enum: ["available", "occupied", "reserved"],
            default: "available"
        },
        currentOccupant: {
            studentId: String,
            studentName: String,
            startTime: Date
        },
        waitingQueue: {
            type: [waitingQueueSchema],
            default: []
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Seat", seatSchema);
