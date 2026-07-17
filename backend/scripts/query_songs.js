const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Song = require('../models/Song');
const SongAuthor = require('../models/SongAuthor');
const SongBook = require('../models/SongBook');
const SongTopic = require('../models/SongTopic');

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to MongoDB successfully.');

  const ids = ['6a4d5e08f5901b2981cd2518', '6a4beb9d8be600d1f231fcaf'];
  for (const id of ids) {
    const rawSong = await Song.findById(id);
    console.log(`\n--- Raw Song ID: ${id} ---`);
    if (!rawSong) {
      console.log('Not found!');
      continue;
    }
    console.log('Raw Doc:', JSON.stringify(rawSong, null, 2));

    const song = await Song.findById(id)
      .populate('author')
      .populate('topics')
      .populate('songbooks');
    
    console.log('\n--- Populated ---');
    console.log('Title (Tamil):', song.titleTamil);
    console.log('Title (English):', song.titleEnglish);
    console.log('Organization:', song.organization);
    console.log('Author Name:', song.author ? song.author.name : 'None');
    console.log('Topics:', song.topics ? song.topics.map(t => t.name) : 'None');
    console.log('Songbooks:', song.songbooks ? song.songbooks.map(sb => sb.name) : 'None');
  }
  await mongoose.disconnect();
}

run().catch(console.error);
