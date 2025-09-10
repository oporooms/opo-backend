/**
 * Seed script: Inserts 10,000 fake User documents for API testing.
 *
 * Usage (with real MongoDB):
 *   PowerShell:
 *     $env:MONGO_URI="mongodb://127.0.0.1:27017/opo_dev"; npx ts-node src/tests/seedUsers.ts
 *
 * Usage (fallback in-memory Mongo if MONGO_URI not set):
 *     npx ts-node src/tests/seedUsers.ts
 *
 * Optional env flags:
 *   CLEAR_USERS=1   -> Drops existing User collection before seeding.
 *   COUNT=5000      -> Change number of users (default 10000).
 */
import 'tsconfig-paths/register';
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../schemas/User';
// Using relative import instead of path alias to avoid needing tsconfig-paths at runtime
import { UserRole, UserStatus } from '../types/user';
import { MongoMemoryServer } from 'mongodb-memory-server';

interface SeedOptions {
  count: number;
  clear: boolean;
}

const DEFAULT_COUNT = parseInt(process.env.COUNT || '10000', 10);
const CLEAR = process.env.CLEAR_USERS === '1';

async function connect(): Promise<{ usingMemory: boolean; mem?: MongoMemoryServer }> {
  const uri = process.env.MONGO_URI;
  if (uri) {
    await mongoose.connect(uri);
    console.log('[seedUsers] Connected to MongoDB:', uri);
    return { usingMemory: false };
  }
  console.log('[seedUsers] MONGO_URI not set -> using in-memory MongoDB for temporary data');
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  return { usingMemory: true, mem };
}

function generatePhone(i: number): string {
  // Indian mobile numbers start with 6/7/8/9 and have 10 digits.
  const first = 6 + (i % 4); // cycles through 6,7,8,9
  const rest = (100000000 + i).toString().slice(-9); // ensures deterministic uniqueness for range
  return `${first}${rest}`; // total 10 digits
}

function buildUserDoc(i: number) {
  const username = `user${i}`;
  return {
    username,
    userRole: UserRole.USER,
    email: `${username}@example.com`,
    fullname: `Test User ${i}`,
    phone: generatePhone(i),
    status: UserStatus.APPROVED,
    wallet: 0,
    address: '',
    gender: i % 2 === 0 ? 'male' : 'female',
    gstDetails: {
      gstNo: '',
      gstName: '',
      gstAddress: { address: '', state: '', pincode: '' }
    },
    passportDetails: {
      passportNo: '',
      passportExpiry: '',
      passportIssue: ''
    },
    panNo: ''
  };
}

async function seed({ count, clear }: SeedOptions) {
  const existing = await User.estimatedDocumentCount().catch(() => 0);
  if (clear && existing > 0) {
    console.log(`[seedUsers] CLEAR_USERS=1 -> dropping existing User collection (had ${existing})`);
    await mongoose.connection.db?.dropCollection('User').catch(() => {});
  } else if (existing > 0) {
    console.log(`[seedUsers] User collection already has ${existing} docs. No action (set CLEAR_USERS=1 to force).`);
    return;
  }

  console.log(`[seedUsers] Seeding ${count} users...`);
  const BATCH = 1000; // Insert in batches to manage memory & plugin overhead.
  const start = Date.now();

  for (let offset = 0; offset < count; offset += BATCH) {
    const slice = Math.min(BATCH, count - offset);
    const docs = Array.from({ length: slice }, (_, k) => buildUserDoc(offset + k));
    await User.insertMany(docs, { ordered: false });
    const done = offset + slice;
    const pct = ((done / count) * 100).toFixed(1);
    process.stdout.write(`\r[seedUsers] Inserted ${done}/${count} (${pct}%)`);
  }
  const ms = Date.now() - start;
  const finalCount = await User.estimatedDocumentCount();
  console.log(`\n[seedUsers] Done. Final user count: ${finalCount}. Took ${(ms / 1000).toFixed(2)}s.`);
}

async function main() {
  const { usingMemory, mem } = await connect();
  try {
    await seed({ count: DEFAULT_COUNT, clear: CLEAR });
  } finally {
    await mongoose.disconnect();
    if (usingMemory && mem) await mem.stop();
  }
}

main().catch(err => {
  console.error('\n[seedUsers] Fatal error:', err);
  process.exit(1);
});
