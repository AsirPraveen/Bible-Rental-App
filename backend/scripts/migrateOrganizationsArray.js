const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Song = require('../models/Song');

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to MongoDB.');

  const songs = await Song.find({});
  console.log(`Found ${songs.length} songs in database to inspect.`);

  let migratedCount = 0;
  for (const song of songs) {
    const raw = song.toObject({ getters: false, virtuals: false });
    
    // Check if there is a legacy single organization field
    if (raw.organization) {
      // Ensure organizations array contains the organization
      if (!song.organizations) {
        song.organizations = [];
      }
      if (!song.organizations.some(o => o.toString() === raw.organization.toString())) {
        song.organizations.push(raw.organization);
      }
      
      // Unset legacy field
      song.set('organization', undefined);
      await song.save();
      migratedCount++;
      console.log(`Migrated song ID ${song._id} (${song.titleEnglish || song.titleTamil})`);
    }
  }

  console.log(`Migration complete. Successfully converted ${migratedCount} songs.`);
  await mongoose.disconnect();
}

run().catch(console.error);
