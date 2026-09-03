require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');

/**
 * Backfills total_copies on books written before the field existed, and
 * repairs any book whose numbers drifted while approvals were unguarded.
 *
 * The invariant is:  total_copies === available_count + owned_by.length
 *
 * Two kinds of damage are possible from the old code:
 *   1. total_copies missing entirely.
 *   2. More borrowers in owned_by than the library has copies, because
 *      approve floored available_count at 0 instead of refusing.
 *
 * For (2) the borrower list is treated as the truth — those are real people
 * holding real books — so total_copies is raised to match rather than
 * dropping anyone.
 *
 * Run with:  node scripts/backfillBookCopies.js          (report only)
 *            node scripts/backfillBookCopies.js --apply  (write changes)
 */
const APPLY = process.argv.includes('--apply');

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
};

(async () => {
  await mongoose.connect(requireEnv('MONGO_URL'));
  console.log(APPLY ? '--- APPLYING CHANGES ---' : '--- DRY RUN (pass --apply to write) ---');

  const books = await Book.find({}).lean();
  let ok = 0, backfilled = 0, repaired = 0;

  for (const b of books) {
    const onLoan = (b.owned_by || []).length;
    const shelf = b.available_count || 0;
    const derived = shelf + onLoan;

    if (typeof b.total_copies === 'number' && b.total_copies === derived) { ok++; continue; }

    const label = `[${b.organization}] #${b.book_id} ${b.book_name}`;

    if (typeof b.total_copies !== 'number') {
      backfilled++;
      console.log(`  backfill  ${label}: total_copies = ${derived} (${shelf} on shelf + ${onLoan} on loan)`);
    } else {
      repaired++;
      console.log(`  REPAIR    ${label}: total_copies ${b.total_copies} -> ${derived} (${shelf} on shelf + ${onLoan} on loan)`);
    }

    if (APPLY) {
      await Book.updateOne(
        { _id: b._id },
        { $set: { total_copies: derived, available: shelf > 0 } }
      );
    }
  }

  console.log(`\n${books.length} books · ${ok} already consistent · ${backfilled} backfilled · ${repaired} repaired`);
  if (!APPLY && (backfilled || repaired)) console.log('Nothing was written. Re-run with --apply.');

  await mongoose.disconnect();
})().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
