// Static dataset containing some key biblical locations and time periods
// Data inspired by OpenBible.info geocoding dataset

export const biblicalLocations = [
  // --- OLD TESTAMENT (GENESIS TO JUDGES, -2000 to -1000) ---
  {
    id: 'ur_abraham',
    name: 'Ur of the Chaldeans',
    latitude: 30.962222,
    longitude: 46.104444,
    periodStart: -2000, 
    periodEnd: -1900,
    description: 'The birthplace of Abram (Abraham) before he was called by God to journey to Canaan. (Genesis 11)'
  },
  {
    id: 'haran_abraham',
    name: 'Haran',
    latitude: 36.8601,
    longitude: 39.0435,
    periodStart: -1950, 
    periodEnd: -1850,
    description: 'Terah died here, and Abraham received God’s call to leave his native land. (Genesis 12)'
  },
  {
    id: 'hebron_machpelah',
    name: 'Hebron (Cave of Machpelah)',
    latitude: 31.5247,
    longitude: 35.1089,
    periodStart: -1900, 
    periodEnd: -1000, // Important for a very long time
    description: 'The burial place of Abraham, Isaac, Jacob, and their wives. Later, David ruled Judah from Hebron. (Genesis 23)'
  },
  {
    id: 'mount_sinai',
    name: 'Mount Sinai',
    latitude: 28.539145,
    longitude: 33.974921,
    periodStart: -1446,
    periodEnd: -1400,
    description: 'Where God gave Moses the Ten Commandments. (Exodus 19)'
  },
  {
    id: 'kadesh_barnea',
    name: 'Kadesh Barnea',
    latitude: 30.648,
    longitude: 34.425,
    periodStart: -1445,
    periodEnd: -1405,
    description: 'The chief campsite of the Israelites during their 40 years of wandering in the wilderness. (Numbers 13)'
  },
  {
    id: 'mount_nebo',
    name: 'Mount Nebo',
    latitude: 31.7683,
    longitude: 35.7196,
    periodStart: -1405,
    periodEnd: -1400,
    description: 'Where Moses viewed the Promised Land before his death. (Deuteronomy 34)'
  },
  {
    id: 'jericho_joshua',
    name: 'Jericho',
    latitude: 31.870308,
    longitude: 35.443764,
    periodStart: -1400,
    periodEnd: -1350,
    description: 'The first city conquered by the Israelites under Joshua after crossing the Jordan. (Joshua 6)'
  },
  {
    id: 'shiloh',
    name: 'Shiloh',
    latitude: 32.054,
    longitude: 35.289,
    periodStart: -1350,
    periodEnd: -1050,
    description: 'The spiritual center of Israel where the Tabernacle and Ark of the Covenant rested for 300 years. (1 Samuel 1)'
  },

  // --- UNITED AND DIVIDED KINGDOM (-1000 to -586) ---
  {
    id: 'jerusalem_david',
    name: 'Jerusalem (City of David)',
    latitude: 31.771959,
    longitude: 35.200657,
    periodStart: -1000, 
    periodEnd: -586,
    description: 'Conquered by David. Solomon built the First Temple here. Capital of Judah. (2 Samuel 5)'
  },
  {
    id: 'samaria_capital',
    name: 'Samaria',
    latitude: 32.276,
    longitude: 35.19,
    periodStart: -880, 
    periodEnd: -722,
    description: 'Capital of the Northern Kingdom of Israel, built by King Omri. Destroyed by Assyria. (1 Kings 16)'
  },
  {
    id: 'mount_carmel',
    name: 'Mount Carmel',
    latitude: 32.730,
    longitude: 35.044,
    periodStart: -860, 
    periodEnd: -850,
    description: 'Where Elijah confronted the 450 prophets of Baal. (1 Kings 18)'
  },
  {
    id: 'nineveh_jonah',
    name: 'Nineveh',
    latitude: 36.3592,
    longitude: 43.1536,
    periodStart: -770, 
    periodEnd: -612,
    description: 'Capital of the Assyrian Empire. Jonah preached repentance here. (Jonah 3)'
  },
  {
    id: 'babylon_exile',
    name: 'Babylon',
    latitude: 32.542222,
    longitude: 44.421111,
    periodStart: -586,
    periodEnd: -539,
    description: 'Capital of the Babylonian Empire. Jews were exiled here after the destruction of Jerusalem. (2 Kings 25)'
  },
  {
    id: 'susa_esther',
    name: 'Susa',
    latitude: 32.189,
    longitude: 48.257,
    periodStart: -480,
    periodEnd: -470,
    description: 'Capital of the Persian Empire where Nehemiah served and the events of Esther took place. (Esther 1)'
  },

  // --- GOSPELS: MINISTRY OF JESUS (1 to 33 AD) ---
  {
    id: 'bethlehem_jesus',
    name: 'Bethlehem',
    latitude: 31.7057,
    longitude: 35.2006,
    periodStart: -5,
    periodEnd: 5,
    description: 'The birthplace of Jesus Christ. (Matthew 2, Luke 2)'
  },
  {
    id: 'nazareth_jesus',
    name: 'Nazareth',
    latitude: 32.7019,
    longitude: 35.3035,
    periodStart: 1,
    periodEnd: 27,
    description: 'The boyhood home of Jesus, where he grew "in wisdom and stature". (Luke 2)'
  },
  {
    id: 'jordan_river_baptism',
    name: 'Jordan River (Bethany Beyond Jordan)',
    latitude: 31.836,
    longitude: 35.546,
    periodStart: 27,
    periodEnd: 28,
    description: 'Where Jesus was baptized by John the Baptist. (John 1)'
  },
  {
    id: 'sea_of_galilee_jesus',
    name: 'Sea of Galilee (Capernaum)',
    latitude: 32.8804,
    longitude: 35.5756,
    periodStart: 27,
    periodEnd: 33,
    description: 'Jesus calmed the storm, walked on water, and based much of His ministry here in Capernaum. (Matthew 4)'
  },
  {
    id: 'jerusalem_crucifixion',
    name: 'Jerusalem (Golgotha/Temple)',
    latitude: 31.778,
    longitude: 35.229,
    periodStart: 30,
    periodEnd: 33,
    description: 'The site of the Last Supper, Crucifixion, and Resurrection of Jesus Christ. (Matthew 26-28)'
  },

  // --- ACTS AND EPISTLES (33 to 100 AD) ---
  {
    id: 'damascus_paul',
    name: 'Damascus',
    latitude: 33.5138,
    longitude: 36.2765,
    periodStart: 33,
    periodEnd: 36,
    description: 'Saul (Paul) was converted on the road to Damascus. (Acts 9)'
  },
  {
    id: 'antioch_syria',
    name: 'Antioch (Syria)',
    latitude: 36.2021,
    longitude: 36.1606,
    periodStart: 40,
    periodEnd: 60,
    description: 'The launching point for Paul\'s missionary journeys. Disciples were first called "Christians" here. (Acts 11)'
  },
  {
    id: 'philippi_paul',
    name: 'Philippi',
    latitude: 41.012,
    longitude: 24.285,
    periodStart: 49,
    periodEnd: 60,
    description: 'The first church Paul established in Europe; where Paul and Silas were imprisoned and God sent an earthquake. (Acts 16)'
  },
  {
    id: 'corinth_paul',
    name: 'Corinth',
    latitude: 37.906,
    longitude: 22.88,
    periodStart: 50,
    periodEnd: 55,
    description: 'Paul spent 18 months here preaching and later wrote two major epistles to this church. (Acts 18)'
  },
  {
    id: 'ephesus_paul',
    name: 'Ephesus',
    latitude: 37.9423,
    longitude: 27.3433,
    periodStart: 53,
    periodEnd: 60,
    description: 'Paul ministered here for 3 years. Later, John wrote Revelation to Ephesus as one of the seven churches. (Acts 19, Rev 2)'
  },
  {
    id: 'rome_paul',
    name: 'Rome',
    latitude: 41.8902,
    longitude: 12.4922,
    periodStart: 60,
    periodEnd: 68,
    description: 'Paul was imprisoned and martyred here. Peter was also martyred in Rome. (Acts 28)'
  },
  {
    id: 'patmos_john',
    name: 'Isle of Patmos',
    latitude: 37.324,
    longitude: 26.543,
    periodStart: 90,
    periodEnd: 96,
    description: 'The island where the Apostle John was exiled and received the visions recorded in the Book of Revelation. (Rev 1)'
  }
];
