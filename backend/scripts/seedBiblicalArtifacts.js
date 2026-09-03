require('dotenv').config();
const mongoose = require('mongoose');
const BiblicalArtifact = require('../models/BiblicalArtifact');

/**
 * Seeds the 3D Biblical Museum.
 *
 * The viewer already contains hand-built three.js geometry for each of these
 * ids (see buildProceduralModel in ArtifactViewerScreen). Without this data the
 * collection is empty, so the museum renders an empty list — the models exist
 * but there is nothing to open.
 *
 * Every `id` below MUST match a branch in buildProceduralModel, and every
 * hotspot `position` is in that model's own coordinate space, chosen to sit on
 * the part it describes. Procedural models are not re-scaled by the viewer, so
 * these coordinates are used as-is.
 *
 * Idempotent: re-running updates existing artifacts in place rather than
 * duplicating them.
 *
 * Run with:  node scripts/seedBiblicalArtifacts.js
 *            node scripts/seedBiblicalArtifacts.js --prune   (also removes
 *            artifacts no longer listed here)
 */
const PRUNE = process.argv.includes('--prune');

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
};

const GOLD = '#D4AF37';
const BRONZE = '#B87333';
const WOOD = '#8B5A2B';
const STONE = '#9CA3AF';
const CRIMSON = '#B03A48';

const ARTIFACTS = [
  // ─────────────────────────── TABERNACLE ───────────────────────────
  {
    id: 'ark_of_the_covenant',
    name: 'Ark of the Covenant',
    reference: 'Exodus 25:10-22',
    category: 'Tabernacle',
    dimensions: '2.5 x 1.5 x 1.5 cubits (approx. 114 x 68 x 68 cm)',
    materials: ['Acacia wood', 'Pure gold overlay'],
    description:
      'The most sacred object of Israel, resting in the Most Holy Place where God promised to meet with His people. A chest of acacia wood overlaid with pure gold inside and out, crowned by the atonement cover and two cherubim of hammered gold facing one another with outstretched wings. It held the tablets of the covenant, and later a jar of manna and Aaron\'s budded staff. Carried only by Levites, on poles that were never to be removed.',
    funFact:
      'God said He would speak "from between the two cherubim" — so the empty space above the lid, not the gold itself, was the meeting place.',
    hotspots: [
      { id: 'mercy_seat', label: 'The Atonement Cover', detail: 'The solid gold lid, called the mercy seat. Once a year on the Day of Atonement the high priest sprinkled sacrificial blood here for the sins of the whole nation.', position: [0, 0.42, 0], color: GOLD },
      { id: 'cherubim', label: 'The Cherubim', detail: 'Two angelic figures hammered from a single piece of gold with the cover itself, wings spread toward each other, faces bowed toward the mercy seat.', position: [-0.8, 0.78, 0], color: GOLD },
      { id: 'chest', label: 'The Acacia Chest', detail: 'Inside lay the two stone tablets of the Ten Commandments, a golden jar of manna, and Aaron\'s staff that budded.', position: [0, -0.25, 0.58], color: WOOD },
      { id: 'poles', label: 'The Carrying Poles', detail: 'Acacia poles overlaid with gold, threaded through four gold rings. They were never to be withdrawn — the Ark was always ready to move.', position: [0, -0.4, 0.65], color: GOLD },
    ],
  },
  {
    id: 'menorah',
    name: 'The Golden Menorah',
    reference: 'Exodus 25:31-40',
    category: 'Tabernacle',
    dimensions: 'One talent of pure gold (approx. 34 kg)',
    materials: ['Pure hammered gold'],
    description:
      'The seven-branched lampstand that lit the Holy Place, hammered from a single talent of pure gold — not cast or joined, but beaten from one piece. Its central shaft carried three branches on each side, every branch decorated with cups shaped like almond blossoms, each with bud and flower. The priests tended it so that light never went out before the Lord.',
    funFact:
      'It was the only light in the Holy Place. There were no windows — the golden walls glowed entirely by lamplight.',
    hotspots: [
      { id: 'central_shaft', label: 'The Central Shaft', detail: 'The trunk from which all six branches grow. The whole lampstand was one piece of hammered gold, never soldered together.', position: [0, 0.05, 0], color: GOLD },
      { id: 'branches', label: 'The Six Branches', detail: 'Three curved branches on each side, so that with the central shaft there were seven lamps in all — the number of completeness.', position: [-0.75, 0.45, 0], color: GOLD },
      { id: 'blossoms', label: 'The Almond Blossoms', detail: 'Each branch bore cups shaped like almond flowers. The almond is the first tree to bloom in Israel — a picture of watchfulness and new life.', position: [0.75, 0.6, 0], color: GOLD },
      { id: 'base', label: 'The Base', detail: 'The heavy footed base steadied the lampstand. Priests trimmed the wicks and refilled the lamps with pure beaten olive oil every morning and evening.', position: [0, -0.95, 0], color: GOLD },
    ],
  },
  {
    id: 'table_of_showbread',
    name: 'Table of Showbread',
    reference: 'Exodus 25:23-30',
    category: 'Tabernacle',
    dimensions: '2 x 1 x 1.5 cubits (approx. 91 x 46 x 68 cm)',
    materials: ['Acacia wood', 'Pure gold overlay'],
    description:
      'A gold-overlaid table standing on the north side of the Holy Place, bearing twelve loaves of bread — one for each tribe of Israel — set out before the Lord continually. Fresh loaves were laid every Sabbath, and the old bread belonged to the priests, to be eaten in a holy place. Its gold dishes, pitchers and bowls were used for the drink offerings.',
    funFact:
      'It was called "the bread of the Presence" — literally the bread of the face of God, kept perpetually in His sight.',
    hotspots: [
      { id: 'loaves', label: 'The Twelve Loaves', detail: 'Twelve loaves in two rows of six, one for every tribe. Replaced every Sabbath so that fresh bread was always before the Lord.', position: [-0.35, 0.15, 0], color: '#E8C27A' },
      { id: 'surface', label: 'The Golden Table', detail: 'Acacia wood overlaid with pure gold, edged with a decorative border and a golden crown moulding.', position: [0, -0.1, 0.4], color: GOLD },
      { id: 'legs', label: 'The Legs and Rings', detail: 'Four gold rings held the carrying poles, so the table could travel with the camp without priestly hands touching it.', position: [0.7, -0.5, 0.35], color: GOLD },
    ],
  },
  {
    id: 'altar_of_burnt_offering',
    name: 'Altar of Burnt Offering',
    reference: 'Exodus 27:1-8',
    category: 'Tabernacle',
    dimensions: '5 x 5 x 3 cubits (approx. 2.3 x 2.3 x 1.4 m)',
    materials: ['Acacia wood', 'Bronze overlay'],
    description:
      'The first thing anyone saw on entering the courtyard: a hollow square altar of acacia overlaid with bronze, where the daily sacrifices were offered morning and evening. A bronze grating held the fire, and horns rose from its four corners. No one approached the Holy Place without first passing the altar — atonement always came before access.',
    funFact:
      'A person seeking mercy could take hold of the horns of the altar and claim sanctuary, as Adonijah and Joab both did.',
    hotspots: [
      { id: 'horns', label: 'The Four Horns', detail: 'Projections at each corner, part of the altar itself. Blood was smeared on them in the sin offering, and fugitives grasped them pleading for mercy.', position: [0.9, 0.3, 0.9], color: BRONZE },
      { id: 'grate', label: 'The Bronze Grating', detail: 'A network of bronze set halfway down, holding the burning wood and the offering above the ash.', position: [0, 0.15, 0], color: BRONZE },
      { id: 'body', label: 'The Hollow Frame', detail: 'Acacia boards overlaid with bronze — bronze because it endures fire. The altar was hollow so it could be carried.', position: [0, -0.3, 1.0], color: BRONZE },
    ],
  },
  {
    id: 'high_priests_breastplate',
    name: "High Priest's Breastplate",
    reference: 'Exodus 28:15-30',
    category: 'Tabernacle',
    dimensions: 'One span square (approx. 23 x 23 cm), doubled',
    materials: ['Gold thread', 'Blue, purple and scarlet yarn', 'Fine linen', 'Twelve gemstones'],
    description:
      'The breastpiece of judgment, worn over the high priest\'s heart. Folded double to form a pouch, it carried twelve precious stones in four rows of three, each engraved with the name of a tribe of Israel. Inside the pouch lay the Urim and Thummim, by which the priest sought God\'s decision for the nation. Aaron bore the names of all Israel over his heart whenever he entered the Holy Place.',
    funFact:
      'Chains of braided gold fastened it to the ephod so that it would "not swing loose" from the priest\'s heart.',
    hotspots: [
      { id: 'stones', label: 'The Twelve Stones', detail: 'Four rows of three: sardius, topaz, emerald; turquoise, sapphire, diamond; jacinth, agate, amethyst; beryl, onyx and jasper — one name engraved on each.', position: [0, 0.25, 0.1], color: '#7FB3D5' },
      { id: 'urim', label: 'Urim and Thummim', detail: 'Kept inside the folded pouch. Through them the high priest enquired of the Lord on behalf of the whole nation.', position: [0, -0.15, 0.1], color: GOLD },
      { id: 'chains', label: 'The Gold Chains', detail: 'Braided cords of pure gold tied the breastpiece to the shoulder pieces of the ephod, holding it firmly over the heart.', position: [-0.7, 0.8, -0.05], color: GOLD },
    ],
  },
  {
    id: 'tabernacle_of_moses',
    name: 'The Tabernacle',
    reference: 'Exodus 26:1-37',
    category: 'Tabernacle',
    dimensions: '30 x 10 cubits (approx. 13.7 x 4.6 m)',
    materials: ['Acacia frames', 'Gold overlay', 'Fine linen', 'Goat hair', 'Ram skins'],
    description:
      'The portable dwelling where God met with Israel through forty years in the wilderness. Gold-overlaid acacia frames formed the walls, covered by four layers of curtains. A veil divided the Holy Place from the Most Holy Place, and the whole structure could be dismantled and carried whenever the cloud lifted. Every measurement was given by God on the mountain — Moses built nothing by his own design.',
    funFact:
      'It faced east, so that everyone entering walked toward the west — deliberately away from the sunrise worship of the surrounding nations.',
    hotspots: [
      { id: 'holy_place', label: 'The Holy Place', detail: 'Here stood the lampstand, the table of showbread and the altar of incense. Only priests entered, and only to serve.', position: [-0.3, 0.0, 0], color: GOLD },
      { id: 'veil', label: 'The Veil', detail: 'Blue, purple and scarlet with cherubim woven in, separating the Most Holy Place. This is the curtain torn from top to bottom at the crucifixion.', position: [-0.3, 0.48, 0], color: '#5B4B8A' },
      { id: 'most_holy', label: 'The Most Holy Place', detail: 'A perfect cube holding only the Ark. The high priest entered once a year, and never without blood.', position: [0.85, 0.0, 0], color: GOLD },
      { id: 'coverings', label: 'The Four Coverings', detail: 'Fine linen inside, then goat hair, then ram skins dyed red, then durable hides outside — beauty within, plainness without.', position: [0, 0.42, 0.6], color: WOOD },
    ],
  },

  // ───────────────────────────── TEMPLE ─────────────────────────────
  {
    id: 'solomons_temple',
    name: "Solomon's Temple",
    reference: '1 Kings 6:1-38',
    category: 'Temple',
    dimensions: '60 x 20 x 30 cubits (approx. 27 x 9 x 13.5 m)',
    materials: ['Cut stone', 'Cedar of Lebanon', 'Gold overlay', 'Bronze'],
    description:
      'The first permanent house of God in Jerusalem, seven years in the building. Its walls were lined with cedar carved with gourds and open flowers, and overlaid with gold so that no stone was visible. Two bronze pillars, Jachin and Boaz, stood at the porch. When it was dedicated, the glory of the Lord filled the house so that the priests could not stand to minister.',
    funFact:
      'The stone was dressed at the quarry, so that "neither hammer nor axe nor any tool of iron was heard in the house while it was being built."',
    hotspots: [
      { id: 'holy_of_holies', label: 'The Most Holy Place', detail: 'A cube of twenty cubits, overlaid with pure gold, housing the Ark beneath two olive-wood cherubim fifteen feet tall.', position: [-1.2, -0.1, 0], color: GOLD },
      { id: 'pillars', label: 'Jachin and Boaz', detail: 'Two hollow bronze pillars at the porch. Jachin means "He will establish"; Boaz means "In Him is strength."', position: [1.2, 0.0, 0.4], color: BRONZE },
      { id: 'holy_place', label: 'The Holy Place', detail: 'Forty cubits long, holding ten golden lampstands, the table of showbread and the golden altar of incense.', position: [-0.2, -0.1, 0], color: GOLD },
      { id: 'porch', label: 'The Porch', detail: 'The entrance hall running the full width of the house, opening eastward toward the rising sun.', position: [0.8, 0.05, 0], color: STONE },
    ],
  },

  // ──────────────────────────── GENESIS ─────────────────────────────
  {
    id: 'noahs_ark',
    name: "Noah's Ark",
    reference: 'Genesis 6:14-16',
    category: 'Genesis',
    dimensions: '300 x 50 x 30 cubits (approx. 137 x 23 x 13.7 m)',
    materials: ['Gopher wood', 'Pitch inside and out'],
    description:
      'A vessel built to God\'s own specification, six times longer than it was wide — proportions that shipwrights still recognise as remarkably seaworthy. It had three decks, a single door in the side, and a window near the roof. Noah preached while he built, and when the appointed day came, God Himself shut the door.',
    funFact:
      'Its length-to-width ratio of 6:1 is close to that used by modern cargo ships, which favour stability over speed.',
    hotspots: [
      { id: 'door', label: 'The Single Door', detail: 'One door in the side — the only way in. "And the Lord shut him in." Every creature that was saved came through this one entrance.', position: [-0.6, -0.1, 0.48], color: WOOD },
      { id: 'decks', label: 'The Three Decks', detail: 'Lower, second and third decks gave roughly 100,000 square feet of floor space — ample for the animals and their provision.', position: [0, 0.15, 0.4], color: WOOD },
      { id: 'window', label: 'The Window', detail: 'A cubit-high opening near the roof, running the length of the vessel for light and air. From here Noah released the raven and the dove.', position: [0, 0.44, 0.4], color: '#C8B48A' },
      { id: 'pitch', label: 'The Pitch', detail: 'Sealed within and without. The Hebrew word for pitch, kaphar, is the same root as "atonement" — that which covers.', position: [1.6, -0.2, 0.45], color: '#3B2F2A' },
    ],
  },

  // ───────────────────────────── EXODUS ─────────────────────────────
  {
    id: 'moses_staff',
    name: "The Staff of Moses",
    reference: 'Exodus 4:1-5, 17:5-6',
    category: 'Exodus',
    dimensions: 'Approx. 1.4 m shepherd\'s rod',
    materials: ['Almond wood'],
    description:
      'An ordinary shepherd\'s staff that became "the staff of God" in Moses\' hand. It became a serpent before Pharaoh, struck the Nile to blood, divided the Red Sea, and drew water from the rock at Horeb. God\'s first question at the burning bush was simply, "What is that in your hand?"',
    funFact:
      'It was already forty years old as a shepherd\'s tool before it ever performed a miracle — God used what Moses already carried.',
    hotspots: [
      { id: 'grip', label: 'The Shepherd\'s Grip', detail: 'Worn smooth by forty years tending Jethro\'s flocks in Midian, long before Moses returned to Egypt.', position: [0.05, 0.9, 0], color: WOOD },
      { id: 'shaft', label: 'The Shaft', detail: 'Stretched over the Red Sea to divide it, and held up over the battle with Amalek while Aaron and Hur supported his arms.', position: [0, 0.1, 0], color: WOOD },
      { id: 'tip', label: 'The Tip', detail: 'This struck the rock at Horeb, and water came out for the whole congregation to drink.', position: [-0.05, -1.05, 0], color: WOOD },
    ],
  },
  {
    id: 'bronze_serpent',
    name: 'The Bronze Serpent',
    reference: 'Numbers 21:4-9',
    category: 'Exodus',
    dimensions: 'Serpent mounted on a standard, approx. 2.4 m',
    materials: ['Bronze', 'Wooden pole'],
    description:
      'When venomous snakes came among a complaining people, God told Moses to make a bronze serpent and set it on a pole. Anyone bitten who looked at it lived. Jesus took this as a picture of Himself: "As Moses lifted up the serpent in the wilderness, so must the Son of Man be lifted up." Healing came not by effort but by looking.',
    funFact:
      'Israel kept it for centuries and began burning incense to it, so King Hezekiah broke it in pieces and called it Nehushtan — "just a piece of bronze."',
    hotspots: [
      { id: 'serpent', label: 'The Serpent of Bronze', detail: 'The image of the very thing that was killing them, lifted up and rendered harmless — judgement borne in their place.', position: [0, 0.9, 0], color: BRONZE },
      { id: 'pole', label: 'The Standard', detail: 'Raised high so that anyone anywhere in the camp could see it. No one had to reach it; they only had to look.', position: [0, 0.1, 0], color: WOOD },
    ],
  },

  // ───────────────────────────── GOSPELS ────────────────────────────
  {
    id: 'last_supper_table',
    name: 'The Last Supper Table',
    reference: 'Luke 22:14-20',
    category: 'Gospels',
    dimensions: 'Low triclinium table, approx. 2.5 m',
    materials: ['Olive wood', 'Clay vessels'],
    description:
      'In an upper room prepared for the Passover, Jesus took bread and the cup and gave them a new meaning: "This is my body, given for you. This cup is the new covenant in my blood." Here He washed the disciples\' feet, named the one who would betray Him, and gave the command to love one another as He had loved them.',
    funFact:
      'They would have reclined on cushions around a low U-shaped table, leaning on the left elbow — which is how John could lean back "on Jesus\' breast" to ask a question.',
    hotspots: [
      { id: 'bread', label: 'The Bread', detail: 'Unleavened Passover bread, broken and given with the words, "This is my body, which is given for you. Do this in remembrance of me."', position: [-0.5, 0.05, 0.1], color: '#E8C27A' },
      { id: 'cup', label: 'The Cup', detail: 'The cup after supper: "This cup is the new covenant in my blood, which is poured out for you."', position: [0.2, 0.05, 0.08], color: CRIMSON },
      { id: 'table', label: 'The Upper Room Table', detail: 'A borrowed room, furnished and ready. The same room where the disciples later gathered to pray before Pentecost.', position: [0, -0.15, 0.45], color: WOOD },
    ],
  },
  {
    id: 'galilee_boat',
    name: 'Fishing Boat of Galilee',
    reference: 'Mark 4:35-41',
    category: 'Gospels',
    dimensions: 'Approx. 8.2 m long, 2.3 m wide',
    materials: ['Cedar planking', 'Oak frames', 'Linen sail'],
    description:
      'The working boat of first-century Galilee, crewed by five and rigged with a single square sail. From a boat like this Jesus taught the crowds on the shore, calmed the storm with a word, and called fishermen to become fishers of men. The Sea of Galilee sits 200 metres below sea level, and cold air falling from the Golan can raise a violent squall within minutes.',
    funFact:
      'In 1986 a drought exposed a boat of exactly this type in the mud near Ginosar. Carbon dating placed it in the first century — it is now known as the Jesus Boat.',
    hotspots: [
      { id: 'stern', label: 'The Stern', detail: 'Jesus was asleep on a cushion in the stern when the storm broke. The disciples woke Him: "Teacher, do you not care that we are perishing?"', position: [1.3, -0.35, 0], color: WOOD },
      { id: 'mast', label: 'The Mast and Sail', detail: 'A single square sail for the open water, with oars for close work along the shore and for rowing into the wind.', position: [-0.2, 0.5, 0], color: '#D8CBB0' },
      { id: 'hull', label: 'The Hull', detail: 'Cedar planks on oak frames, shallow enough to be beached and worked from the shore.', position: [0, -0.6, 0.45], color: WOOD },
      { id: 'nets', label: 'The Nets', detail: 'Cast by hand from the boat or the shallows. Peter, Andrew, James and John left these nets to follow Him.', position: [0, -0.4, 0.45], color: '#9AA9A0' },
    ],
  },
  {
    id: 'wedding_jars',
    name: 'The Water Jars of Cana',
    reference: 'John 2:1-11',
    category: 'Gospels',
    dimensions: 'Six stone jars, 20-30 gallons each',
    materials: ['Carved limestone'],
    description:
      'Six stone jars stood at the wedding in Cana for the Jewish rites of purification. When the wine ran out, Jesus told the servants to fill them with water, and what was drawn out was wine — better than what had been served first. This was the first of His signs, and His disciples believed in Him.',
    funFact:
      'Stone was used rather than clay because stone could not become ceremonially unclean. Between them the six jars held perhaps 600 litres.',
    hotspots: [
      { id: 'jar_mouth', label: 'Filled to the Brim', detail: '"Fill the jars with water." And they filled them to the brim — the servants left no room for anything to be added.', position: [0, 0.3, 0.1], color: STONE },
      { id: 'stone', label: 'Carved from Stone', detail: 'Used for purification because stone vessels could not contract ritual impurity, unlike pottery which had to be broken.', position: [-0.6, -0.3, 0.3], color: STONE },
      { id: 'wine', label: 'The Good Wine', detail: 'The master of the feast tasted it and told the bridegroom, "You have kept the good wine until now."', position: [0.6, -0.3, 0.3], color: CRIMSON },
    ],
  },
  {
    id: 'loaves_and_fish',
    name: 'Five Loaves and Two Fish',
    reference: 'John 6:1-14',
    category: 'Gospels',
    dimensions: 'A boy\'s lunch — five small barley loaves',
    materials: ['Barley bread', 'Dried fish', 'Woven basket'],
    description:
      'A boy\'s meal in a crowd of five thousand men, besides women and children. Jesus gave thanks, broke the loaves, and everyone ate as much as they wanted. Twelve baskets of fragments were gathered afterwards — one for each disciple who had said it could not be done.',
    funFact:
      'Barley was the cheapest grain, the bread of the poor. The smallest offering in the crowd was the one that fed it.',
    hotspots: [
      { id: 'loaves', label: 'Five Barley Loaves', detail: 'Small flat loaves, closer to rolls than to modern bread. Andrew asked, "What are they among so many?"', position: [0, -0.75, 0], color: '#E8C27A' },
      { id: 'fish', label: 'Two Small Fish', detail: 'Most likely salted or dried sardines from the lake — the ordinary relish eaten with bread.', position: [0.35, -0.78, 0.15], color: '#8FA8B8' },
      { id: 'basket', label: 'The Basket', detail: 'Twelve baskets of leftovers were collected — more remained at the end than they had started with.', position: [0, -0.85, 0.5], color: '#B08D57' },
    ],
  },
  {
    id: 'peters_net',
    name: "Peter's Fishing Net",
    reference: 'Luke 5:1-11, John 21:1-11',
    category: 'Gospels',
    dimensions: 'Circular cast net, approx. 5 m across',
    materials: ['Woven flax cord', 'Stone weights'],
    description:
      'A weighted cast net, thrown by hand and drawn closed as it sank. Peter had worked all night and caught nothing when Jesus told him to let the nets down again — and the catch nearly tore them. After the resurrection the scene was repeated on the same shore, and this time the net held.',
    funFact:
      'John records the exact number of fish in that final catch: 153 — and notes with a fisherman\'s pride that even so, the net was not torn.',
    hotspots: [
      { id: 'mesh', label: 'The Mesh', detail: 'Hand-knotted flax, mended constantly. James and John were mending theirs when Jesus called them.', position: [0, -0.35, 0.5], color: '#9AA9A0' },
      { id: 'weights', label: 'The Stone Weights', detail: 'Weights around the rim carried the net down and closed it beneath the shoal as it was drawn in.', position: [-0.1, -0.75, 0.4], color: STONE },
    ],
  },

  // ───────────────────────────── PASSION ────────────────────────────
  {
    id: 'jesus_cross',
    name: 'The Cross',
    reference: 'John 19:17-30',
    category: 'Passion',
    dimensions: 'Upright approx. 3 m, crossbeam approx. 2 m',
    materials: ['Rough-hewn timber', 'Iron nails'],
    description:
      'The instrument of the most shameful death Rome could inflict, and the place where the Son of God gave His life for the world. Above His head Pilate fixed a notice in Hebrew, Latin and Greek: Jesus of Nazareth, the King of the Jews. He carried the crossbeam Himself until Simon of Cyrene was compelled to help. There He said, "It is finished."',
    funFact:
      'The condemned normally carried only the crossbeam, not the whole cross — the upright stayed permanently fixed at the place of execution.',
    hotspots: [
      { id: 'titulus', label: 'The Inscription', detail: 'Written in three languages so that everyone could read it. When the chief priests objected, Pilate answered, "What I have written, I have written."', position: [0, 1.4, 0.12], color: '#C8B48A' },
      { id: 'crossbeam', label: 'The Crossbeam', detail: 'The patibulum, carried by the condemned to the place of execution and then raised onto the standing upright.', position: [0, 0.8, 0], color: WOOD },
      { id: 'upright', label: 'The Upright', detail: 'At its foot the soldiers cast lots for His clothing, and there He entrusted His mother to the disciple He loved.', position: [0, -0.6, 0], color: WOOD },
    ],
  },
  {
    id: 'crown_of_thorns',
    name: 'Crown of Thorns',
    reference: 'Matthew 27:27-31',
    category: 'Passion',
    dimensions: 'Approx. 20 cm across',
    materials: ['Thorn branches'],
    description:
      'Twisted together by soldiers and pressed onto His head in mockery, with a scarlet robe and a reed for a sceptre. They knelt before Him and jeered, "Hail, King of the Jews!" The mockery was truer than they knew — and thorns had been the sign of the ground\'s curse since Eden.',
    funFact:
      'Thorns first appear in Genesis as part of the curse on the ground. The King wore that curse on His own head.',
    hotspots: [
      { id: 'thorns', label: 'The Thorns', detail: 'Probably from a local shrub with spines an inch or more long — plaited into a circle by hands that meant it as a joke.', position: [0, 0.72, 0], color: '#5A4632' },
      { id: 'crown', label: 'A King\'s Crown', detail: 'Soldiers meant it as ridicule. Scripture reads it as coronation: crowned with the curse He came to lift.', position: [0.72, 0, 0], color: '#5A4632' },
    ],
  },
  {
    id: 'empty_tomb',
    name: 'The Empty Tomb',
    reference: 'Matthew 28:1-10, John 20:1-18',
    category: 'Passion',
    dimensions: 'Rock-cut chamber with a rolling stone approx. 1.5 m across',
    materials: ['Hewn limestone', 'Rolling stone'],
    description:
      'A new tomb cut into rock, belonging to Joseph of Arimathea, sealed with a great stone and guarded by soldiers. On the first day of the week the stone was found rolled away and the tomb empty, the linen wrappings lying there and the face cloth folded in a place by itself. "He is not here; He has risen, as He said."',
    funFact:
      'John notes that the cloth from Jesus\' head was folded up separately — not the disorder you would expect if the body had been stolen in haste.',
    hotspots: [
      { id: 'stone', label: 'The Rolling Stone', detail: 'A great disc set in a channel, taking several men to move. The women asked on the way, "Who will roll away the stone for us?"', position: [-0.85, -0.3, 0.85], color: STONE },
      { id: 'entrance', label: 'The Entrance', detail: 'Low enough that Peter and John had to stoop to look in. They found the tomb empty and the wrappings lying there.', position: [0.2, -0.25, 0.72], color: '#2B2B2B' },
      { id: 'chamber', label: 'The Burial Chamber', detail: 'A shelf cut into the rock held the body. Two angels sat where He had lain, one at the head and one at the feet.', position: [0, -0.1, 0], color: STONE },
    ],
  },

  // ──────────────────────────── APOSTLES ────────────────────────────
  {
    id: 'romans_armor',
    name: 'The Armour of God',
    reference: 'Ephesians 6:10-18',
    category: 'Apostles',
    dimensions: 'Roman legionary equipment, first century',
    materials: ['Iron', 'Bronze', 'Leather', 'Wood'],
    description:
      'Paul wrote of the whole armour of God while chained to a Roman soldier, and used the equipment in front of him as the picture. The belt of truth, the breastplate of righteousness, feet fitted with the gospel of peace, the shield of faith, the helmet of salvation, and the sword of the Spirit — every piece defensive but one.',
    funFact:
      'The Roman shield was covered in leather and soaked before battle, so that flaming arrows striking it were put out on impact.',
    hotspots: [
      { id: 'helmet', label: 'The Helmet of Salvation', detail: 'Guarding the head — the assurance of salvation protecting the mind from doubt and despair.', position: [0, 0.65, 0], color: BRONZE },
      { id: 'breastplate', label: 'The Breastplate of Righteousness', detail: 'Covering the heart and vital organs. Not our own righteousness, but Christ\'s, worn over the heart.', position: [0, 0.1, 0.3], color: BRONZE },
      { id: 'shield', label: 'The Shield of Faith', detail: 'The large scutum, not a small buckler. Held together in formation, shields locked into an unbroken wall.', position: [-0.62, -0.3, 0.42], color: '#8B3A3A' },
      { id: 'sword', label: 'The Sword of the Spirit', detail: 'The gladius — short, for close combat. The only offensive piece in the list, and it is the word of God.', position: [0.5, -0.2, 0.2], color: '#C0C0C0' },
    ],
  },
  {
    id: 'pauls_chains',
    name: "Paul's Chains",
    reference: 'Acts 28:20, Philippians 1:12-14',
    category: 'Apostles',
    dimensions: 'Iron wrist fetter and chain',
    materials: ['Forged iron'],
    description:
      'Paul spent years in Roman custody, often chained by the wrist to a guard around the clock. He called himself "an ambassador in chains" and wrote Ephesians, Philippians, Colossians and Philemon from confinement. Far from silencing him, the chains carried the gospel into the praetorian guard and into Caesar\'s own household.',
    funFact:
      'He told the Philippians his imprisonment had "really served to advance the gospel" — the whole palace guard had heard why he was there.',
    hotspots: [
      { id: 'cuff', label: 'The Wrist Fetter', detail: 'Locked onto the prisoner and joined by a short chain to a soldier, changed with every watch.', position: [-0.6, -0.3, 0], color: '#6B6B6B' },
      { id: 'chain', label: 'The Chain', detail: '"I am an ambassador in chains." Every guard chained to Paul became a captive audience for the gospel.', position: [-0.05, -0.5, 0.1], color: '#6B6B6B' },
    ],
  },
];

(async () => {
  await mongoose.connect(requireEnv('MONGO_URL'));

  // Guard against a typo silently creating an artifact with no 3D model.
  const ids = ARTIFACTS.map(a => a.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) {
    console.error('Duplicate ids in seed data:', dupes);
    process.exit(1);
  }

  let created = 0, updated = 0;
  for (const a of ARTIFACTS) {
    const existing = await BiblicalArtifact.findOne({ id: a.id });
    await BiblicalArtifact.findOneAndUpdate({ id: a.id }, { $set: a }, { upsert: true, new: true });
    existing ? updated++ : created++;
    console.log(`  ${existing ? 'updated' : 'created'}  ${a.id.padEnd(26)} ${a.hotspots.length} hotspots`);
  }

  if (PRUNE) {
    const res = await BiblicalArtifact.deleteMany({ id: { $nin: ids } });
    if (res.deletedCount) console.log(`\n  pruned ${res.deletedCount} artifact(s) not in this list`);
  }

  const total = await BiblicalArtifact.countDocuments();
  const byCategory = await BiblicalArtifact.aggregate([
    { $group: { _id: '$category', n: { $sum: 1 } } }, { $sort: { _id: 1 } }
  ]);

  console.log(`\n${created} created · ${updated} updated · ${total} artifacts in the museum`);
  console.log('Categories: ' + byCategory.map(c => `${c._id} (${c.n})`).join(' · '));

  await mongoose.disconnect();
})().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
