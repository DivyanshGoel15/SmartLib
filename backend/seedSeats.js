
require("dotenv").config();

const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const Seat = require("./models/Seat");

const departments = [
    "CSE",
    "ECE",
    "Mechanical",
    "Civil",
    "Management"
];

const assertWriteConfirmation = (args = process.argv.slice(2)) => {
    if (!args.includes("--confirm-smartlib-write")) {
        throw new Error("Refusing to seed smartlib without --confirm-smartlib-write.");
    }
};

async function seedSeats(args = process.argv.slice(2)) {
    try {
        assertWriteConfirmation(args);
        await connectDB();

        const operations = [];

        for (const department of departments) {
            for (let number = 1; number <= 10; number++) {
                const seatCode =
                    `${department}-S${String(number).padStart(2, "0")}`;

                operations.push({
                    updateOne: {
                        filter: { seatCode },
                        update: {
                            $setOnInsert: {
                                seatCode,
                                department,
                                status: "available",
                                currentOccupant: {},
                                waitingQueue: []
                            }
                        },
                        upsert: true
                    }
                });
            }
        }

        const result = await Seat.bulkWrite(operations);

        console.log("Seat seeding completed!");
        console.log(`New seats created: ${result.upsertedCount}`);
        console.log(`Existing seats matched: ${result.matchedCount}`);
        console.log(`Total seats processed: ${operations.length}`);

    } catch (error) {
        console.error("Seat seeding failed. Check database configuration and availability.");
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    seedSeats();
}

module.exports = seedSeats;
module.exports.assertWriteConfirmation = assertWriteConfirmation;
