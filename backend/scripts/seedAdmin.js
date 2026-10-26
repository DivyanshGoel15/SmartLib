/**
 * Safe Admin Provisioning Script for SmartLib
 * Usage: node scripts/seedAdmin.js
 * Reads configuration from local .env without printing secrets.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedInitialAdmin = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('[Admin Provisioning] Error: MONGO_URI is missing from environment.');
    process.exit(1);
  }

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@smartlib.edu').trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminSecurePass2026!';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'SmartLib Administrator';

  try {
    await mongoose.connect(uri, { dbName: 'smartlib', serverSelectionTimeoutMS: 5000 });
    console.log('[Admin Provisioning] Connected to MongoDB.');

    const existingAdmin = await User.findOne({
      $or: [
        { role: 'library_admin' },
        { role: 'admin' },
        { email: adminEmail }
      ]
    });

    if (existingAdmin) {
      console.log(`[Admin Provisioning] An administrator account already exists (${existingAdmin.email}). No new admin created.`);
      await mongoose.disconnect();
      return;
    }

    const newAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'library_admin',
      department: 'Library Administration',
      year: 'Staff'
    });

    console.log(`[Admin Provisioning] Initial administrator account successfully provisioned for: ${newAdmin.email}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('[Admin Provisioning] Failed to provision initial admin:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedInitialAdmin();
}

module.exports = seedInitialAdmin;

