require('dotenv').config();
const mongoose = require('mongoose');

// Old Connection String (defaulting to Atlas 'test' database)
const OLD_DB_URL = "mongodb+srv://asir:asir@cluster0.z0qmu.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";
// New Isolated Database URL
const NEW_DB_URL = "mongodb+srv://asir:asir@cluster0.z0qmu.mongodb.net/youth-room-saas?retryWrites=true&w=majority&appName=Cluster0";

async function runMigration() {
  console.log('--- Starting Multi-Tenant SaaS Migration ---');

  // 1. Connect to Old Database & Fetch data
  console.log('Connecting to old database...');
  const oldConn = await mongoose.createConnection(OLD_DB_URL).asPromise();
  console.log('Connected to old database successfully!');

  // Define schemas to fetch old data
  const oldUserSchema = new mongoose.Schema({}, { strict: false, collection: 'UserInfo' });
  const oldBookSchema = new mongoose.Schema({}, { strict: false, collection: 'Bible Books' });
  const oldSongSchema = new mongoose.Schema({}, { strict: false, collection: 'songs' });
  const oldAuthorSchema = new mongoose.Schema({}, { strict: false, collection: 'Authors' });
  const oldBibleSchema = new mongoose.Schema({}, { strict: false, collection: 'biblechapters' });
  const oldMapSchema = new mongoose.Schema({}, { strict: false, collection: 'historicalmaps' });
  const oldLocationSchema = new mongoose.Schema({}, { strict: false, collection: 'historicallocations' });
  const oldCardSchema = new mongoose.Schema({}, { strict: false, collection: 'Cards' });

  const OldUser = oldConn.model('OldUser', oldUserSchema);
  const OldBook = oldConn.model('OldBook', oldBookSchema);
  const OldSong = oldConn.model('OldSong', oldSongSchema);
  const OldAuthor = oldConn.model('OldAuthor', oldAuthorSchema);
  const OldBible = oldConn.model('OldBible', oldBibleSchema);
  const OldMap = oldConn.model('OldMap', oldMapSchema);
  const OldLocation = oldConn.model('OldLocation', oldLocationSchema);
  const OldCard = oldConn.model('OldCard', oldCardSchema);

  console.log('Fetching source documents...');
  const users = await OldUser.find({}).lean();
  const books = await OldBook.find({}).lean();
  const songs = await OldSong.find({}).lean();
  const authors = await OldAuthor.find({}).lean();
  const bibleChapters = await OldBible.find({}).lean();
  const maps = await OldMap.find({}).lean();
  const locations = await OldLocation.find({}).lean();
  const cards = await OldCard.find({}).lean();

  console.log(`Fetched stats:
  - Users: ${users.length}
  - Books: ${books.length}
  - Songs: ${songs.length}
  - Authors: ${authors.length}
  - Bible Chapters: ${bibleChapters.length}
  - Maps: ${maps.length}
  - Locations: ${locations.length}
  - Cards: ${cards.length}
  `);

  await oldConn.close();
  console.log('Closed connection to old database.');

  // 2. Connect to New Database
  console.log('Connecting to new database...');
  const newConn = await mongoose.createConnection(NEW_DB_URL).asPromise();
  console.log('Connected to new database successfully!');

  // Define schemas for importing
  const OrganizationSchema = require('../models/Organization').schema;
  const UserSchema = require('../models/UserDetails').schema;
  const BookSchema = require('../models/Book').schema;
  const SongSchema = require('../models/Song').schema;
  const AuthorSchema = require('../models/author').schema;
  const BibleSchema = require('../models/BibleChapter').schema;
  const MapSchema = require('../models/HistoricalMap').schema;
  const LocationSchema = require('../models/HistoricalLocation').schema;
  const CardSchema = require('../models/Card').schema;

  const NewOrg = newConn.model('Organization', OrganizationSchema);
  const NewUser = newConn.model('UserInfo', UserSchema);
  const NewBook = newConn.model('Book', BookSchema, 'Bible Books');
  const NewSong = newConn.model('Song', SongSchema, 'songs');
  const NewAuthor = newConn.model('Author', AuthorSchema, 'Authors');
  const NewBible = newConn.model('BibleChapter', BibleSchema, 'biblechapters');
  const NewMap = newConn.model('HistoricalMap', MapSchema, 'historicalmaps');
  const NewLocation = newConn.model('HistoricalLocation', LocationSchema, 'historicallocations');
  const NewCard = newConn.model('Card', CardSchema, 'Cards');

  // Clear any existing tables in new database to ensure fresh migration
  console.log('Clearing new database collections for clean seed...');
  
  // Drop accidental collection leftovers if present
  await newConn.db.dropCollection('books').catch(() => {});
  await newConn.db.dropCollection('authors').catch(() => {});

  await NewOrg.deleteMany({});
  await NewUser.deleteMany({});
  await NewBook.deleteMany({});
  await NewSong.deleteMany({});
  await NewAuthor.deleteMany({});
  await NewBible.deleteMany({});
  await NewMap.deleteMany({});
  await NewLocation.deleteMany({});
  await NewCard.deleteMany({});

  // 3. Create Default Organization
  console.log('Creating default organization: "MKP Nagar Youth Room"...');
  const defaultOrg = await NewOrg.create({
    name: 'MKP Nagar Youth Room',
    slug: 'mkp-nagar-youth-room',
    description: 'Default organization created during multi-tenant migration.',
    inviteCode: 'MKP-2026',
    isPublic: true,
    requiresApproval: false
  });
  console.log(`Default organization created with ID: ${defaultOrg._id}`);

  // 4. Migrate Global Data (Bible text, maps, locations, game cards)
  console.log('Migrating global data (unchanged schema)...');
  
  if (bibleChapters.length > 0) {
    await NewBible.insertMany(bibleChapters.map(({ _id, ...c }) => c));
    console.log('Migrated Bible chapters.');
  }
  if (maps.length > 0) {
    await NewMap.insertMany(maps.map(({ _id, ...m }) => m));
    console.log('Migrated Historical maps.');
  }
  if (locations.length > 0) {
    await NewLocation.insertMany(locations.map(({ _id, ...l }) => l));
    console.log('Migrated Historical locations.');
  }
  if (cards.length > 0) {
    await NewCard.insertMany(cards.map(({ _id, ...c }) => c));
    console.log('Migrated Game cards.');
  }

  // 5. Migrate Content & Org-Scoped Data (Books, Songs, Authors)
  console.log('Migrating org-scoped data...');

  if (authors.length > 0) {
    await NewAuthor.insertMany(authors.map(({ _id, ...a }) => ({
      ...a,
      organization: defaultOrg._id
    })));
    console.log('Migrated Authors.');
  }

  if (books.length > 0) {
    await NewBook.insertMany(books.map(({ _id, ...b }) => ({
      ...b,
      organization: defaultOrg._id,
      books_rented: [], // Fresh rentals
      rent_count: 0,
      available: true,
      owned_by: null,
      rent_from: null
    })));
    console.log('Migrated Books.');
  }

  if (songs.length > 0) {
    await NewSong.insertMany(songs.map(({ _id, ...s }) => ({
      ...s,
      organization: defaultOrg._id
    })));
    console.log('Migrated Songs.');
  }

  // 6. Migrate Users (Initialize memberships and reset transactional attributes)
  console.log('Migrating users...');
  
  const migratedUsers = users.map(({ _id, ...u }) => {
    const isAdmin = u.userType === 'Admin';
    return {
      ...u,
      globalRole: u.email?.toLowerCase() === 'superadmin@youthroom.com' ? 'SuperAdmin' : null,
      memberships: [{
        organization: defaultOrg._id,
        role: isAdmin ? 'Admin' : 'User',
        joinedAt: new Date(),
        isActive: true
      }],
      activeOrganizationId: defaultOrg._id,
      books_rented: [], // Fresh rental history
      favouriteBooks: [], // Fresh wishlist
      talents: 0, // Reset points
      cardInventory: [], // Fresh game progress
      activeDeck: [],
      completedLevels: []
    };
  });

  if (migratedUsers.length > 0) {
    await NewUser.insertMany(migratedUsers);
    console.log('Migrated users successfully.');
  }

  await newConn.close();
  console.log('--- SaaS Migration Completed Successfully! ---');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
