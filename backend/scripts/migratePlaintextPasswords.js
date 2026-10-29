/**
 * Migration Script: Hash Legacy Plaintext Passwords
 * Usage: node scripts/migratePlaintextPasswords.js --confirm-smartlib-write
 * In test mode, set TEST_MONGODB_URI to a dedicated smartlib_test database.
 * Scans the MongoDB User collection for any accounts with unhashed passwords
 * (not starting with bcrypt prefix $2a$ or $2b$), hashes them using bcrypt with salt factor 10,
 * and updates the database records safely.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const User = require('../models/User');

const parseDatabaseName = (uri, variableName) => {
  let parsedUri;
  try {
    parsedUri = new URL(uri);
  } catch (error) {
    throw new Error(`${variableName} must be a valid MongoDB connection URI.`);
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsedUri.protocol) ||
      !parsedUri.hostname ||
      parsedUri.hash) {
    throw new Error(`${variableName} must be a valid MongoDB connection URI.`);
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(parsedUri.pathname.replace(/^\/+/, ''));
  } catch (error) {
    throw new Error(`${variableName} must contain a valid database name.`);
  }
  return databaseName;
};

const resolveMigrationConfig = (env = process.env, args = process.argv.slice(2)) => {
  if (env.NODE_ENV === 'test') {
    const uri = env.TEST_MONGODB_URI;
    if (!uri) {
      throw new Error('TEST_MONGODB_URI must be explicitly configured for test-mode migration.');
    }
    if (parseDatabaseName(uri, 'TEST_MONGODB_URI') !== 'smartlib_test') {
      throw new Error('TEST_MONGODB_URI must target the isolated smartlib_test database.');
    }
    return { uri, dbName: 'smartlib_test' };
  }

  const configuredUri = env.MONGODB_URI;
  const alternateUri = env.MONGO_URI;
  if (configuredUri && alternateUri && configuredUri !== alternateUri) {
    throw new Error('MONGODB_URI and MONGO_URI disagree; configure only one database URI.');
  }

  const uri = configuredUri || alternateUri;
  if (!uri) {
    throw new Error('MONGODB_URI or MONGO_URI must be explicitly configured.');
  }
  if (parseDatabaseName(uri, configuredUri ? 'MONGODB_URI' : 'MONGO_URI') !== 'smartlib') {
    throw new Error('The migration URI must explicitly target the smartlib database.');
  }
  if (!args.includes('--confirm-smartlib-write')) {
    throw new Error('Refusing to modify smartlib without --confirm-smartlib-write.');
  }

  return { uri, dbName: 'smartlib' };
};

const connectMigrationDatabase = databaseConfig =>
  connectDB({ databaseConfig, logErrors: false });

async function migrateLegacyPasswords() {
  let connected = false;

  try {
    const databaseConfig = resolveMigrationConfig();
    await connectMigrationDatabase(databaseConfig);
    connected = true;
    console.log(`[Migration] Connected to the ${databaseConfig.dbName} database.`);

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
  } finally {
    if (connected) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  migrateLegacyPasswords().catch(() => {
    console.error('[Migration] Failed. Database details were withheld to protect connection credentials.');
    process.exitCode = 1;
  });
}

module.exports = migrateLegacyPasswords;
module.exports.resolveMigrationConfig = resolveMigrationConfig;
module.exports.connectMigrationDatabase = connectMigrationDatabase;
