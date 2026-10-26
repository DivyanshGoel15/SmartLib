/**
 * Migration Script: Hash Legacy Plaintext Passwords
 * Usage: node scripts/migratePlaintextPasswords.js
 * Scans the MongoDB User collection for any accounts with unhashed passwords
 * (not starting with bcrypt prefix $2a$ or $2b$), hashes them using bcrypt with salt factor 10,
 * and updates the database records safely.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function migrateLegacyPasswords() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Migration aborted: MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { dbName: 'smartlib', serverSelectionTimeoutMS: 5000 });
    console.log('[Migration] Connected to MongoDB Atlas.');

    // Fetch all users with raw query to inspect stored password field
    const users = await User.find({});
    let migratedCount = 0;

    for (const user of users) {
      const isBcrypt = typeof user.password === 'string' && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'));
      if (!isBcrypt && user.password) {
        console.log(`[Migration] Plaintext password detected for user: ${user.email}. Upgrading to bcrypt hash...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        // Use updateOne to safely store the hash without triggering Mongoose pre-save double-hashing
        await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
        migratedCount++;
      }
    }

    console.log(`[Migration] Migration complete. Total plaintext accounts upgraded: ${migratedCount}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('[Migration] Failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateLegacyPasswords();
}

module.exports = migrateLegacyPasswords;

