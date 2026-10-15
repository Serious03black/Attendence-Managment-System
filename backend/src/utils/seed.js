import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/index.js';
import { logger } from './logger.js';

// ─── Admin credentials (change here if you want different values) ─────────────
const ADMIN_EMAIL    = 'admin@sti.local';
const ADMIN_PASSWORD = 'Admin@12345';
const ADMIN_NAME     = 'Institute Administrator';
const ADMIN_PHONE    = '9999999999';
// ─────────────────────────────────────────────────────────────────────────────

const seed = async () => {
  try {
    logger.info('Starting seed...');
    await connectDB();

    // ── 1. Wipe every collection ──────────────────────────────────────────────
    logger.info('Dropping all collections...');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    await Promise.all(
      collections.map(({ name }) => db.collection(name).deleteMany({}))
    );
    logger.info(`Cleared ${collections.length} collection(s).`);

    // ── 2. Create the single admin user ──────────────────────────────────────
    logger.info('Creating admin user...');
    const admin = await User.create({
      fullName: ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,   // auto-hashed by pre-save hook in User.model.js
      role:     'admin',
      phone:    ADMIN_PHONE,
    });

    logger.info('✅ Seed complete!');
    logger.info(`   Email    : ${admin.email}`);
    logger.info(`   Password : ${ADMIN_PASSWORD}`);
    logger.info(`   Role     : ${admin.role}`);
  } catch (err) {
    logger.error(`❌ Seed failed: ${err.message}`);
    console.error(err);
  } finally {
    await disconnectDB();
  }
};

seed();
