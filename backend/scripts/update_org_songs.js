const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Song = require('../models/Song');
const SongAuthor = require('../models/SongAuthor');
const SongBook = require('../models/SongBook');
const SongTopic = require('../models/SongTopic');

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to MongoDB.');

  // 1. Create/Ensure SongBook "MKP Nagar Prayercell"
  let songbookDoc = await SongBook.findOne({ name: 'MKP Nagar Prayercell' });
  if (!songbookDoc) {
    songbookDoc = new SongBook({ name: 'MKP Nagar Prayercell' });
    await songbookDoc.save();
    console.log('Created SongBook: MKP Nagar Prayercell');
  } else {
    console.log('SongBook "MKP Nagar Prayercell" already exists');
  }

  // 2. Create/Ensure Topics "Prayercell", "Skit Night"
  let topicPrayercell = await SongTopic.findOne({ name: 'Prayercell' });
  if (!topicPrayercell) {
    topicPrayercell = new SongTopic({ name: 'Prayercell' });
    await topicPrayercell.save();
    console.log('Created Topic: Prayercell');
  } else {
    console.log('Topic "Prayercell" already exists');
  }

  let topicSkitNight = await SongTopic.findOne({ name: 'Skit Night' });
  if (!topicSkitNight) {
    topicSkitNight = new SongTopic({ name: 'Skit Night' });
    await topicSkitNight.save();
    console.log('Created Topic: Skit Night');
  } else {
    console.log('Topic "Skit Night" already exists');
  }

  // 3. Create/Ensure Author "Augustin Rajasekar"
  let authorDoc = await SongAuthor.findOne({ name: 'Augustin Rajasekar' });
  if (!authorDoc) {
    authorDoc = new SongAuthor({ name: 'Augustin Rajasekar' });
    await authorDoc.save();
    console.log('Created Author: Augustin Rajasekar');
  } else {
    console.log('Author "Augustin Rajasekar" already exists');
  }

  // 4. Handle Song 1: "6a4beb9d8be600d1f231fcae" (delete) and update "6a4d5e08f5901b2981cd2518"
  const duplicateId = '6a4beb9d8be600d1f231fcae';
  const targetId = '6a4d5e08f5901b2981cd2518';

  const deletedSong = await Song.findByIdAndDelete(duplicateId);
  if (deletedSong) {
    console.log(`Deleted duplicate song: ${duplicateId} (${deletedSong.titleEnglish})`);
  } else {
    console.log(`Duplicate song: ${duplicateId} was already deleted or not found.`);
  }

  // Update target song
  const songToUpdate = await Song.findById(targetId);
  if (songToUpdate) {
    if (!songToUpdate.songbooks) {
      songToUpdate.songbooks = [];
    }
    if (!songToUpdate.topics) {
      songToUpdate.topics = [];
    }
    // Add "MKP Nagar Prayercell" in songbooks if not already present
    if (!songToUpdate.songbooks.includes(songbookDoc._id)) {
      songToUpdate.songbooks.push(songbookDoc._id);
    }
    // Add "Prayercell" in topics if not already present
    if (!songToUpdate.topics.includes(topicPrayercell._id)) {
      songToUpdate.topics.push(topicPrayercell._id);
    }
    // Set global and organization
    songToUpdate.isGlobal = true;
    songToUpdate.organization = new mongoose.Types.ObjectId('6a4beb458be600d1f2291ffe');

    await songToUpdate.save();
    console.log(`Updated song: ${targetId} (${songToUpdate.titleEnglish}) with songbook and topics.`);
  } else {
    console.log(`Target song to update: ${targetId} was not found!`);
  }

  // 5. Handle Song 2: "6a4beb9d8be600d1f231fcaf"
  const secondSongId = '6a4beb9d8be600d1f231fcaf';
  const secondSong = await Song.findById(secondSongId);
  if (secondSong) {
    if (!secondSong.topics) {
      secondSong.topics = [];
    }
    // Under topic "Skit Night"
    if (!secondSong.topics.includes(topicSkitNight._id)) {
      secondSong.topics.push(topicSkitNight._id);
    }
    // Under author "Augustin Rajasekar"
    secondSong.author = authorDoc._id;
    // Under org and not global
    secondSong.organization = new mongoose.Types.ObjectId('6a4beb458be600d1f2291ffe');
    secondSong.isGlobal = false;

    await secondSong.save();
    console.log(`Updated second song: ${secondSongId} (${secondSong.titleEnglish}) with topic Skit Night and author Augustin Rajasekar.`);
  } else {
    console.log(`Second song: ${secondSongId} was not found!`);
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB. Execution completed successfully.');
}

run().catch(console.error);
