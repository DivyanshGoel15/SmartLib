/**
 * MongoDB Atlas Live Persistence Verification Script
 * Non-destructive write, read, and cleanup test.
 * Runs strictly against the Atlas database specified in backend/.env.
 * Does not delete or modify existing records.
 */
require('dotenv').config();
process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const User = require('../models/User');

const { connectDB } = require('../config/db');

async function verifyAtlasPersistence() {
  console.log('[1/4] Connecting to the explicitly configured isolated test database...');
  try {
    await connectDB();
    console.log('[1/4] CONNECTED: Isolated test database is reachable.');
  } catch (connErr) {
    console.error('\n[DATABASE CONNECTION FAILED]');
    console.error(`Error: ${connErr.name || 'Error'}`);
    console.error('Set TEST_MONGODB_URI to a dedicated database named smartlib_test before running this script.');
    process.exitCode = 1;
    return;
  }

  const testId = Date.now();
  const testEmail = `verify_persistence_${testId}@smartlib.test`;
  let createdId = null;

  try {
    // 2. Safe Write Test
    console.log('[2/4] Performing safe test write to User collection...');
    const createdUser = await User.create({
      name: `Persistence Test User ${testId}`,
      email: testEmail,
      password: 'SafeTestPassword2026!',
      role: 'student',
      department: 'CSE',
      year: '1st Year'
    });
    createdId = createdUser._id;
    console.log(`[2/4] WRITE SUCCESS: Test document created with _id: ${createdId}`);

    // 3. Safe Read Test
    console.log('[3/4] Performing test read to confirm persistence...');
    const fetchedUser = await User.findById(createdId);
    if (!fetchedUser || fetchedUser.email !== testEmail) {
      throw new Error('Read verification failed: Document could not be fetched or email mismatched.');
    }
    console.log(`[3/4] READ SUCCESS: Document persisted and confirmed in database.`);

    // 4. Safe Cleanup
    console.log('[4/4] Cleaning up test document...');
    await User.findByIdAndDelete(createdId);
    createdId = null;
    console.log('[4/4] CLEANUP SUCCESS: Test document safely removed. Existing records untouched.');

    console.log('\n=======================================================');
    console.log('RESULT: MongoDB Atlas Live Persistence is 100% VERIFIED');
    console.log('=======================================================\n');
  } catch (opErr) {
    console.error('\nOPERATION FAILED: Database verification could not be completed.');
    process.exitCode = 1;
  } finally {
    if (createdId) {
      try {
        await User.findByIdAndDelete(createdId);
      } catch (cleanupError) {
        console.error('[CLEANUP FAILED] Could not remove the test record.');
        process.exitCode = 1;
      }
    }
    await mongoose.disconnect();
  }
}

verifyAtlasPersistence();
