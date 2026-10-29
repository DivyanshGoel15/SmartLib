/**
 * Safe Admin Provisioning Script for SmartLib
 * Usage: node scripts/seedAdmin.js --confirm-smartlib-write
 * Reads configuration from local .env without printing secrets.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');

const resolveAdminConfig = (env = process.env, args = process.argv.slice(2)) => {
  const adminEmail = (env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = env.INITIAL_ADMIN_PASSWORD || '';
  const adminName = (env.INITIAL_ADMIN_NAME || 'SmartLib Administrator').trim();

  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error('INITIAL_ADMIN_EMAIL must be explicitly configured with a valid email address.');
  }
  if (adminPassword.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be explicitly configured with at least 12 characters.');
  }
  if (!args.includes('--confirm-smartlib-write')) {
    throw new Error('Refusing to provision an administrator without --confirm-smartlib-write.');
  }

  return { adminEmail, adminPassword, adminName };
};

const seedInitialAdmin = async () => {
  let connected = false;
  try {
    const { adminEmail, adminPassword, adminName } = resolveAdminConfig();
    await connectDB({ logErrors: false });
    connected = true;

    const existingAdmin = await User.findOne({
      $or: [
        { role: 'library_admin' },
        { role: 'admin' },
        { email: adminEmail }
      ]
    });
    if (existingAdmin) {
      console.log('[Admin Provisioning] An administrator account already exists. No new admin created.');
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

    console.log('[Admin Provisioning] Initial administrator account successfully provisioned.');
  } catch (error) {
    console.error('[Admin Provisioning] Failed. Check required configuration and database availability.');
    process.exitCode = 1;
  } finally {
    if (connected) await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedInitialAdmin();
}

module.exports = seedInitialAdmin;
module.exports.resolveAdminConfig = resolveAdminConfig;
