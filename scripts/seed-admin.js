/**
 * Seed script — creates the admin user if it doesn't already exist.
 * Usage: node scripts/seed-admin.js
 * Reads MONGODB_URI from .env.development (or NODE_ENV env file).
 */

const { execSync } = require('child_process');
const path = require('path');

// Load env vars from the right file before requiring mongoose
const env = process.env.NODE_ENV || 'development';
const envFile = path.resolve(__dirname, `../.env.${env}`);
const fallbackFile = path.resolve(__dirname, '../.env');

require('dotenv').config({ path: envFile });
require('dotenv').config({ path: fallbackFile }); // fallback — only fills missing vars

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'admin@taraa.in';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_NAME = 'Taraa Admin';

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, lowercase: true, trim: true },
    password: String,
    role: { type: String, default: 'customer' },
    phone: String,
    address: String,
    isActive: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    profileImage: String,
    googleId: String,
  },
  { timestamps: true },
);

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI is not set. Check your .env.development file.');
    process.exit(1);
  }

  console.log(`Connecting to: ${uri.replace(/:([^@]+)@/, ':****@')}`);
  await mongoose.connect(uri);

  const User = mongoose.model('User', UserSchema);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin user already exists (role: ${existing.role}). Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: hashed,
    role: 'admin',
    isActive: true,
    emailVerified: true,
  });

  console.log('Admin user created:');
  console.log(`  Email   : ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Role    : admin`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
