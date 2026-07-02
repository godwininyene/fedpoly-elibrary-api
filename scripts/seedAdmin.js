/**
 * seedAdmin.js
 *
 * One-time script to create a librarian_admin account in MongoDB.
 * Run with: node server/scripts/seedAdmin.js
 *
 * IMPORTANT: Delete or restrict access to this script after use in production.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve .env from the server root (one level up from /scripts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// ─── Admin Credentials (edit before running) ──────────────────────────────────
const ADMIN = {
  fullName:    'Head Librarian',
  email:       'admin@fedpoly.edu.ng',
  password:    'Admin@FPNO2026',  
  role:        'librarian_admin',
  department:  'Library Services',
};
// ─────────────────────────────────────────────────────────────────────────────

// Inline schema to avoid circular import issues when running as a standalone script
const userSchema = new mongoose.Schema(
  {
    fullName:     { type: String, required: true, trim: true },
    email:        { type: String, unique: true, lowercase: true, trim: true },
    matricNumber: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['student', 'librarian_admin'], default: 'student' },
    department:   { type: String },
    level:        { type: String, default: '' },
    avatar:       { cloudUrl: { type: String, default: '' }, publicId: { type: String, default: '' } },
    isActive:     { type: Boolean, default: true },
    lastLogin:    { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ─── Main Seed Function ───────────────────────────────────────────────────────
const seedAdmin = async () => {
  try {
    // 1. Validate environment
    if (!process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)) {
      throw new Error('MONGO_URI is not defined in your .env file.');
    }

    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD), {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('✅ Connected to MongoDB.\n');

    // 2. Check if an admin with this email already exists
    const existing = await User.findOne({ email: ADMIN.email.toLowerCase() });

    if (existing) {
      if (existing.role === 'librarian_admin') {
        console.log(`⚠️  An admin account already exists for "${ADMIN.email}".`);
        console.log('    No changes were made.\n');
      } else {
        // Upgrade existing student account to admin (edge case)
        existing.role = 'librarian_admin';
        existing.isActive = true;
        await existing.save();
        console.log(`🔄 Existing account "${ADMIN.email}" has been upgraded to librarian_admin.\n`);
      }
      return;
    }

    // 3. Validate password strength before hashing
    if (ADMIN.password.length < 8) {
      throw new Error('Admin password must be at least 8 characters. Update the ADMIN object in this script.');
    }

    // 4. Hash the password
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(ADMIN.password, salt);

    // 5. Create the admin document
    const admin = await User.create({
      fullName:    ADMIN.fullName,
      email:       ADMIN.email.toLowerCase(),
      passwordHash,
      role:        ADMIN.role,
      department:  ADMIN.department,
      isActive:    true,
    });

    // 6. Success output
    console.log('─────────────────────────────────────────');
    console.log('🎉 Librarian Admin created successfully!\n');
    console.log(`   Name       : ${admin.fullName}`);
    console.log(`   Email      : ${admin.email}`);
    console.log(`   Role       : ${admin.role}`);
    console.log(`   MongoDB ID : ${admin._id}`);
    console.log('─────────────────────────────────────────');
    console.log('\n⚠️  SECURITY REMINDER:');
    console.log('   → Change the password in ADMIN.password before your next run.');
    console.log('   → Do not commit this script with real credentials to version control.');
    console.log('   → Consider deleting this script after production seeding.\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);

    // Provide actionable hints for common errors
    if (error.message.includes('MONGO_URI')) {
      console.error('   Hint: Make sure your server/.env file exists and contains MONGO_URI.\n');
    }
    if (error.code === 11000) {
      console.error('   Hint: Duplicate key — an account with this email already exists.\n');
    }

    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.\n');
    process.exit(0);
  }
};

seedAdmin();