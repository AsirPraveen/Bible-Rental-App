const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Song = require('../models/Song');
const SongAuthor = require('../models/SongAuthor');
const SongBook = require('../models/SongBook');
const SongTopic = require('../models/SongTopic');

const SQLITE_DB_PATH = path.join(__dirname, '../../songs.sqlite');
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL not defined in .env');
  process.exit(1);
}

// 1. Regex to check if a song contains formatting tags
const checkIsBilingual = (xml) => {
  return /\{(\w)\}.*?\{\/\1\}/g.test(xml);
};

// 2. Bilingual Lyrics Separator & Parser
const parseBilingualLyrics = (xml) => {
  if (!xml) return { tamil: '', english: '' };
  
  // Extract CDATA blocks from OpenLP XML
  const verses = [];
  const regex = /<verse[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/verse>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    verses.push(match[1]);
  }
  
  if (verses.length === 0) {
    const clean = xml.replace(/<\/?[^>]+(>|$)/g, "").trim();
    return { tamil: '', english: clean };
  }

  const isBilingual = checkIsBilingual(xml);
  const tamilVerses = [];
  const englishVerses = [];

  for (const verse of verses) {
    const lines = verse.split('\n');
    const tamilLines = [];
    const englishLines = [];
    let hasTags = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const tagRegex = /\{(\w)\}(.*?)\{\/\1\}/g;
      if (tagRegex.test(trimmedLine)) {
        hasTags = true;
        const cleanLine = trimmedLine.replace(tagRegex, '$2').trim();
        if (cleanLine) tamilLines.push(cleanLine);
      } else {
        englishLines.push(trimmedLine);
      }
    }

    if (hasTags) {
      if (tamilLines.length > 0) tamilVerses.push(tamilLines.join('\n'));
      if (englishLines.length > 0) englishVerses.push(englishLines.join('\n'));
    } else {
      const cleanVerse = lines.map(l => l.replace(/\{(\w)\}|\{\/\w\}/g, '').trim()).filter(Boolean).join('\n');
      if (cleanVerse) {
        englishVerses.push(cleanVerse);
        if (isBilingual) {
          // Keep structure aligned by copying tagless verses to the Tamil lyrics
          tamilVerses.push(cleanVerse);
        }
      }
    }
  }

  return {
    tamil: isBilingual ? tamilVerses.join('\n\n').trim() : '',
    english: englishVerses.join('\n\n').trim()
  };
};

// 3. Comments Metadata Extractor
const parseComments = (comments) => {
  const metadata = { tamilTitle: '', youtubeLink: '', chord: '' };
  if (!comments) return metadata;

  const lines = comments.split(/[\r\n]+/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const titleMatch = trimmed.match(/i18nTitle\s*=\s*(.*)/i);
    if (titleMatch) {
      metadata.tamilTitle = titleMatch[1].trim();
      continue;
    }

    const urlMatch = trimmed.match(/mediaurl\s*=\s*(.*)/i);
    if (urlMatch) {
      metadata.youtubeLink = urlMatch[1].trim();
      continue;
    }

    const keyMatch = trimmed.match(/originalKey\s*=\s*(.*)/i);
    if (keyMatch) {
      metadata.chord = keyMatch[1].trim();
      continue;
    }
  }
  return metadata;
};

// 4. Topic / Songbook Localization Normalizer
const parseTopic = (topicName) => {
  if (!topicName) return '';
  const tamilMatch = topicName.match(/\{(.*)\}/);
  if (tamilMatch) {
    const tamil = tamilMatch[1].trim();
    const english = topicName.replace(/\{.*\}/, '').trim();
    return `${english} (${tamil})`;
  }
  return topicName.trim();
};

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URL);
  console.log('Connected successfully.');

  console.log('Querying SQLite database...');
  // Standardize backslashes for Windows shell execution safety
  const dbFile = `"${SQLITE_DB_PATH.replace(/\\/g, '/')}"`;
  
  // Format each record to a single JSON line on a single SQL string line to avoid Windows shell newline bugs
  const query = "SELECT json_object('id', id, 'title', title, 'lyrics', lyrics, 'comments', comments, 'author_names', (SELECT group_concat(display_name, ', ') FROM authors JOIN authors_songs ON authors.id = authors_songs.author_id WHERE authors_songs.song_id = songs.id), 'topic_names', (SELECT group_concat(name, ', ') FROM topics JOIN songs_topics ON topics.id = songs_topics.topic_id WHERE songs_topics.song_id = songs.id), 'songbook_names', (SELECT group_concat(name, ', ') FROM song_books JOIN songs_songbooks ON song_books.id = songs_songbooks.songbook_id WHERE songs_songbooks.song_id = songs.id)) FROM songs;";
  
  const stdout = execSync(`sqlite3 ${dbFile} "${query.trim()}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
  const lines = stdout.split('\n').filter(line => line.trim().length > 0);
  console.log(`Found ${lines.length} songs to import.`);

  console.log('Resolving distinct topics, songbooks, and authors in SQLite...');
  // Gather all unique authors, topics, songbooks
  const allAuthors = new Set();
  const allTopics = new Set();
  const allSongbooks = new Set();

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      if (data.author_names) {
        data.author_names.split(',').map(s => s.trim()).filter(Boolean).forEach(a => allAuthors.add(a));
      }
      if (data.topic_names) {
        data.topic_names.split(',').map(s => parseTopic(s)).filter(Boolean).forEach(t => allTopics.add(t));
      }
      if (data.songbook_names) {
        data.songbook_names.split(',').map(s => parseTopic(s)).filter(Boolean).forEach(sb => allSongbooks.add(sb));
      }
    } catch (e) {}
  }
  // Make sure 'General' is in topics
  allTopics.add('General');

  console.log(`Unique Author count: ${allAuthors.size}`);
  console.log(`Unique Topic count: ${allTopics.size}`);
  console.log(`Unique SongBook count: ${allSongbooks.size}`);

  // Upsert all unique items into MongoDB
  const authorMap = {};
  for (const name of allAuthors) {
    const doc = await SongAuthor.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
    authorMap[name] = doc._id;
  }

  const topicMap = {};
  for (const name of allTopics) {
    const doc = await SongTopic.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
    topicMap[name] = doc._id;
  }

  const songbookMap = {};
  for (const name of allSongbooks) {
    const doc = await SongBook.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
    songbookMap[name] = doc._id;
  }

  const bulkOps = [];
  let successCount = 0;

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      const parsedLyrics = parseBilingualLyrics(data.lyrics);
      const parsedComments = parseComments(data.comments);

      // Clean up topics & songbooks separately
      const topics = [];
      const songbooks = [];

      const addTopic = (t) => {
        const parsed = parseTopic(t);
        if (parsed && !topics.includes(parsed)) {
          topics.push(parsed);
        }
      };

      const addSongbook = (s) => {
        const parsed = parseTopic(s);
        if (parsed && !songbooks.includes(parsed)) {
          songbooks.push(parsed);
        }
      };

      if (data.topic_names) {
        data.topic_names.split(',').forEach(addTopic);
      }
      if (data.songbook_names) {
        data.songbook_names.split(',').forEach(addSongbook);
      }

      // If no topics are found, add 'General'
      if (topics.length === 0) {
        topics.push('General');
      }

      const topicIds = topics.map(t => topicMap[t]).filter(Boolean);
      const songbookIds = songbooks.map(sb => songbookMap[sb]).filter(Boolean);
      const authorId = data.author_names ? authorMap[data.author_names.trim()] : null;

      const songData = {
        titleEnglish: data.title,
        titleTamil: parsedComments.tamilTitle || '',
        lyricsEnglish: parsedLyrics.english,
        lyricsTamil: parsedLyrics.tamil,
        author: authorId || null,
        topics: topicIds,
        songbooks: songbookIds,
        youtubeLink: parsedComments.youtubeLink || '',
        isGlobal: true,
        sqliteId: data.id
      };

      bulkOps.push({
        updateOne: {
          filter: { sqliteId: data.id, isGlobal: true },
          update: { $set: songData },
          upsert: true
        }
      });

      successCount++;
    } catch (e) {
      console.error(`Failed parsing line: ${line.substring(0, 100)}...`, e);
    }
  }

  if (bulkOps.length > 0) {
    console.log('Executing bulk upserts to MongoDB...');
    const result = await Song.bulkWrite(bulkOps);
    console.log(`Bulk write complete:
      - Upserted: ${result.upsertedCount}
      - Modified: ${result.modifiedCount}
    `);
  }

  // 5. Post-seeding Migration for Existing Org Songs
  console.log('Migrating existing organization-scoped songs to normalized references...');
  const orgSongs = await Song.find({
    $or: [
      { isGlobal: false },
      { isGlobal: { $exists: false } }
    ]
  });

  console.log(`Found ${orgSongs.length} organization-scoped songs to sync.`);
  for (const song of orgSongs) {
    let updated = false;

    // 1. If author is a string (e.g. not a valid ObjectId)
    if (song.author && typeof song.author === 'string') {
      const name = song.author.trim();
      if (name) {
        let doc = await SongAuthor.findOne({ name });
        if (!doc) {
          doc = new SongAuthor({ name });
          await doc.save();
        }
        song.author = doc._id;
        updated = true;
      }
    }

    // 2. If topics contains strings
    if (song.topics && song.topics.length > 0) {
      const topicIds = [];
      let topicsChanged = false;
      for (const t of song.topics) {
        if (typeof t === 'string' || mongoose.isValidObjectId(t) === false) {
          topicsChanged = true;
          const name = String(t).trim();
          if (name) {
            let doc = await SongTopic.findOne({ name });
            if (!doc) {
              doc = new SongTopic({ name });
              await doc.save();
            }
            topicIds.push(doc._id);
          }
        } else {
          topicIds.push(t);
        }
      }
      if (topicsChanged) {
        song.topics = topicIds;
        updated = true;
      }
    }

    // 3. If songbooks contains strings
    if (song.songbooks && song.songbooks.length > 0) {
      const songbookIds = [];
      let songbooksChanged = false;
      for (const sb of song.songbooks) {
        if (typeof sb === 'string' || mongoose.isValidObjectId(sb) === false) {
          songbooksChanged = true;
          const name = String(sb).trim();
          if (name) {
            let doc = await SongBook.findOne({ name });
            if (!doc) {
              doc = new SongBook({ name });
              await doc.save();
            }
            songbookIds.push(doc._id);
          }
        } else {
          songbookIds.push(sb);
        }
      }
      if (songbooksChanged) {
        song.songbooks = songbookIds;
        updated = true;
      }
    }

    if (updated) {
      await song.save();
      console.log(`Successfully synced references for organization song: ${song._id} (${song.titleEnglish})`);
    }
  }

  await mongoose.disconnect();
  console.log(`Migration script finished: processed ${successCount} songs.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
