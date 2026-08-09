export const WORLD = {
  width: 512,
  height: 512,
  tileSize: 16
};

export const TILE_TYPES = {
  GRASS: "Grass",
  FOREST: "Forest",
  DEEP_FOREST: "Deep Forest",
  UNDERBRUSH: "Underbrush",
  ROCK: "Rock",

  PARK: "Pet Park",
  STARTER_PARK: "Starter Park",

  SIDEWALK: "Sidewalk",
  MAIN_STREET: "Main Street",
  ACCESS_ROAD: "Access Road",
  PLAZA: "Town Plaza",

  PET_SHOP: "Pet Shop",
  VET: "Veterinary Clinic",
  GROOMER: "Groomer",
  BREEDER: "Breeder",
  TRAINER: "Trainer",
  PET_HOTEL: "Pet Hotel",
  DOG_WALKER: "Dog Walker",
  PHOTOGRAPHY: "Pet Photography Studio",

  COMPETITION_ARENA: "Competition Arena",
  ANIMAL_HOSPITAL: "Animal Hospital",
  SPECIALIST_TRAINER: "Specialist Trainer",
  FUTURE_FACILITY: "Future Facility",

  PLAYER_HOME: "Player Home",
  HOUSE: "House",
  APARTMENTS: "Apartments",
  RESIDENTIAL_GRASS: "Residential Grass"
};

export const TILE_COLORS = {
  [TILE_TYPES.GRASS]: 0x78a95f,
  [TILE_TYPES.FOREST]: 0x416f3e,
  [TILE_TYPES.DEEP_FOREST]: 0x294c2d,
  [TILE_TYPES.UNDERBRUSH]: 0x527b43,
  [TILE_TYPES.ROCK]: 0x777777,

  [TILE_TYPES.PARK]: 0x6f9f59,
  [TILE_TYPES.STARTER_PARK]: 0x9bc77c,

  [TILE_TYPES.SIDEWALK]: 0xb9b4a8,
  [TILE_TYPES.MAIN_STREET]: 0x55585c,
  [TILE_TYPES.ACCESS_ROAD]: 0x666a6e,
  [TILE_TYPES.PLAZA]: 0xc7b88c,

  [TILE_TYPES.PET_SHOP]: 0xd7a35d,
  [TILE_TYPES.VET]: 0xe2d2b7,
  [TILE_TYPES.GROOMER]: 0xd59bb1,
  [TILE_TYPES.BREEDER]: 0xb78a62,
  [TILE_TYPES.TRAINER]: 0x87a76d,
  [TILE_TYPES.PET_HOTEL]: 0xc99b72,
  [TILE_TYPES.DOG_WALKER]: 0x8cafb7,
  [TILE_TYPES.PHOTOGRAPHY]: 0xa89fc7,

  [TILE_TYPES.COMPETITION_ARENA]: 0xc27755,
  [TILE_TYPES.ANIMAL_HOSPITAL]: 0xe4ded2,
  [TILE_TYPES.SPECIALIST_TRAINER]: 0x6e8c5a,
  [TILE_TYPES.FUTURE_FACILITY]: 0x766d78,

  [TILE_TYPES.PLAYER_HOME]: 0xe6c181,
  [TILE_TYPES.HOUSE]: 0xc6976d,
  [TILE_TYPES.APARTMENTS]: 0xa98f7b,
  [TILE_TYPES.RESIDENTIAL_GRASS]: 0x86ad69
};

/*
==================================================
WORLD MAP
==================================================
*/

export const worldMap = Array.from(
  { length: WORLD.height },
  () =>
    Array.from(
      { length: WORLD.width },
      () => TILE_TYPES.GRASS
    )
);

/*
==================================================
MAP HELPERS
==================================================
*/

function paintRect(
  x,
  y,
  width,
  height,
  tileType
) {
  const startX = Math.max(0, x);
  const startY = Math.max(0, y);

  const endX = Math.min(
    WORLD.width,
    x + width
  );

  const endY = Math.min(
    WORLD.height,
    y + height
  );

  for (
    let tileY = startY;
    tileY < endY;
    tileY++
  ) {
    for (
      let tileX = startX;
      tileX < endX;
      tileX++
    ) {
      worldMap[tileY][tileX] =
        tileType;
    }
  }
}

function scatterTiles(
  x,
  y,
  width,
  height,
  tileType,
  density,
  seed = 1
) {
  let value = seed;

  function random() {
    value =
      (
        value * 1664525 +
        1013904223
      ) %
      4294967296;

    return value / 4294967296;
  }

  for (
    let tileY = y;
    tileY < y + height;
    tileY++
  ) {
    for (
      let tileX = x;
      tileX < x + width;
      tileX++
    ) {
      if (
        tileX < 0 ||
        tileY < 0 ||
        tileX >= WORLD.width ||
        tileY >= WORLD.height
      ) {
        continue;
      }

      if (random() < density) {
        worldMap[tileY][tileX] =
          tileType;
      }
    }
  }
}

/*
==================================================
OUTER FOREST
==================================================
*/

paintRect(
  0,
  0,
  512,
  92,
  TILE_TYPES.DEEP_FOREST
);

scatterTiles(
  0,
  0,
  512,
  92,
  TILE_TYPES.ROCK,
  0.035,
  11
);

scatterTiles(
  0,
  0,
  512,
  92,
  TILE_TYPES.UNDERBRUSH,
  0.10,
  22
);

/*
==================================================
NORTHERN FUTURE FACILITIES
==================================================
*/

paintRect(
  40,
  92,
  432,
  58,
  TILE_TYPES.GRASS
);

paintRect(
  0,
  145,
  512,
  10,
  TILE_TYPES.ACCESS_ROAD
);

paintRect(
  0,
  142,
  512,
  3,
  TILE_TYPES.SIDEWALK
);

paintRect(
  0,
  155,
  512,
  3,
  TILE_TYPES.SIDEWALK
);

paintRect(
  65,
  103,
  74,
  32,
  TILE_TYPES.COMPETITION_ARENA
);

paintRect(
  160,
  103,
  66,
  32,
  TILE_TYPES.ANIMAL_HOSPITAL
);

paintRect(
  247,
  103,
  66,
  32,
  TILE_TYPES.SPECIALIST_TRAINER
);

paintRect(
  334,
  103,
  55,
  32,
  TILE_TYPES.FUTURE_FACILITY
);

paintRect(
  410,
  103,
  45,
  32,
  TILE_TYPES.FUTURE_FACILITY
);

/*
==================================================
MAIN PARK / FOREST
==================================================
*/

paintRect(
  38,
  158,
  436,
  210,
  TILE_TYPES.FOREST
);

scatterTiles(
  38,
  158,
  436,
  210,
  TILE_TYPES.UNDERBRUSH,
  0.12,
  33
);

scatterTiles(
  38,
  158,
  436,
  210,
  TILE_TYPES.ROCK,
  0.025,
  44
);

/*
==================================================
STARTER PARK
==================================================
*/

paintRect(
  190,
  300,
  132,
  55,
  TILE_TYPES.STARTER_PARK
);

paintRect(
  248,
  350,
  16,
  26,
  TILE_TYPES.PARK
);

paintRect(
  0,
  368,
  512,
  16,
  TILE_TYPES.GRASS
);

/*
==================================================
TOWN BUILDING STRIP
==================================================
*/

paintRect(
  0,
  384,
  512,
  4,
  TILE_TYPES.SIDEWALK
);

paintRect(
  0,
  388,
  512,
  38,
  TILE_TYPES.GRASS
);

paintRect(
  32,
  392,
  42,
  28,
  TILE_TYPES.PET_SHOP
);

paintRect(
  88,
  392,
  42,
  28,
  TILE_TYPES.VET
);

paintRect(
  144,
  392,
  42,
  28,
  TILE_TYPES.GROOMER
);

paintRect(
  200,
  392,
  42,
  28,
  TILE_TYPES.BREEDER
);

paintRect(
  252,
  390,
  56,
  32,
  TILE_TYPES.PLAZA
);

paintRect(
  320,
  392,
  42,
  28,
  TILE_TYPES.TRAINER
);

paintRect(
  376,
  392,
  42,
  28,
  TILE_TYPES.PET_HOTEL
);

paintRect(
  432,
  392,
  36,
  28,
  TILE_TYPES.DOG_WALKER
);

paintRect(
  476,
  392,
  30,
  28,
  TILE_TYPES.PHOTOGRAPHY
);

/*
==================================================
MAIN STREET
==================================================
*/

paintRect(
  0,
  426,
  512,
  6,
  TILE_TYPES.SIDEWALK
);

paintRect(
  0,
  432,
  512,
  24,
  TILE_TYPES.MAIN_STREET
);

paintRect(
  0,
  456,
  512,
  6,
  TILE_TYPES.SIDEWALK
);

/*
==================================================
RESIDENTIAL DISTRICT
==================================================
*/

paintRect(
  0,
  462,
  512,
  50,
  TILE_TYPES.RESIDENTIAL_GRASS
);

paintRect(
  34,
  474,
  34,
  26,
  TILE_TYPES.PLAYER_HOME
);

paintRect(
  88,
  474,
  28,
  24,
  TILE_TYPES.HOUSE
);

paintRect(
  130,
  474,
  28,
  24,
  TILE_TYPES.HOUSE
);

paintRect(
  172,
  474,
  28,
  24,
  TILE_TYPES.HOUSE
);

paintRect(
  214,
  474,
  28,
  24,
  TILE_TYPES.HOUSE
);

paintRect(
  278,
  470,
  58,
  32,
  TILE_TYPES.APARTMENTS
);

paintRect(
  352,
  470,
  58,
  32,
  TILE_TYPES.APARTMENTS
);

paintRect(
  430,
  474,
  28,
  24,
  TILE_TYPES.HOUSE
);

paintRect(
  470,
  474,
  28,
  24,
  TILE_TYPES.HOUSE
);

/*
==================================================
MAP LABELS
==================================================
*/

export const MAP_LABELS = [
  {
    text: "OUTER FOREST",
    x: 256,
    y: 44
  },

  {
    text: "FUTURE FACILITIES",
    x: 256,
    y: 97
  },

  {
    text: "COMPETITION ARENA",
    x: 102,
    y: 119
  },

  {
    text: "ANIMAL HOSPITAL",
    x: 193,
    y: 119
  },

  {
    text: "SPECIALIST TRAINER",
    x: 280,
    y: 119
  },

  {
    text: "PET PARK",
    x: 256,
    y: 235
  },

  {
    text: "STARTER PARK",
    x: 256,
    y: 326
  },

  {
    text: "PET SHOP",
    x: 53,
    y: 406
  },

  {
    text: "VET",
    x: 109,
    y: 406
  },

  {
    text: "GROOMER",
    x: 165,
    y: 406
  },

  {
    text: "BREEDER",
    x: 221,
    y: 406
  },

  {
    text: "TOWN PLAZA",
    x: 280,
    y: 406
  },

  {
    text: "TRAINER",
    x: 341,
    y: 406
  },

  {
    text: "PET HOTEL",
    x: 397,
    y: 406
  },

  {
    text: "DOG WALKER",
    x: 450,
    y: 406
  },

  {
    text: "MAIN STREET",
    x: 256,
    y: 444
  },

  {
    text: "RESIDENTIAL DISTRICT",
    x: 256,
    y: 486
  },

  {
    text: "PLAYER HOME",
    x: 51,
    y: 487
  }
];

/*
==================================================
TILE LOOKUP
==================================================
*/

export function getTileType(
  tileX,
  tileY
) {
  if (
    tileX < 0 ||
    tileY < 0 ||
    tileX >= WORLD.width ||
    tileY >= WORLD.height
  ) {
    return null;
  }

  return worldMap[tileY][tileX];
}

/*
==================================================
DOG SPRITE FORMAT
==================================================

All dog sprites are 32×32 ASCII pixel maps.

. = transparent
O = outline / black internal detail
B = base coat
C = cream / secondary coat

Unlike the previous version, the outline is
AUTHORED directly into the sprite.

game.js should NOT generate an outline anymore.

This gives us precise control over:
- silhouette
- ears
- muzzle
- eyes
- mouth
- legs
- tail
- internal separation lines

==================================================
*/

/*
==================================================
SHIBA INU
==================================================
*/

export const SHIBA = {
  breed: "Shiba Inu",

  spriteSize: 32,

  colors: {
    base: "#d98732",
    cream: "#f6dfac",
    outline: "#2b1b12"
  },

  traits: {
    size: "medium",
    build: "compact",
    coatLength: "short",
    earShape: "upright",
    tailShape: "curled"
  },

  walkFrameDuration: 120
};

/*
==================================================
SHIBA SIDE WALK

Faces LEFT.

The reference art naturally reads best facing
left, so these authored frames also face left.

game.js can mirror them with setFlipX(true)
when the dog walks right.

==================================================
*/

export const SHIBA_SIDE_WALK = [

  /*
  FRAME 1
  Standing/contact pose
  */

  [
    "................................",
    "................................",
    ".....OO....OO...................",
    "....OBBO..OBBO..................",
    "....OBBO..OCBO..................",
    "...OBBBBBBBBBBO.................",
    "..OBBBBBBBBBBBBO................",
    ".OBBCCCBOBBBBBBBO.....OOOO......",
    "OBBCCCCOBBBBBBBBBBO..OCCCCO.....",
    "OBCCCCCCBBBBBBBBBBBOOCBBBBCO....",
    "OBOCCCCBBBBBBBBBBBBBBBOOOBCO....",
    ".OCCCCCCBBBBBBBBBBBBBBBBBBBO....",
    "..OCCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBCCCCCCBBBBBBBBBBBBBO...",
    "...OBBBBCCCCCCCCBBBBBBBBBBBBO...",
    "..OBBBBBOOCCCCOOOBBBBBOOBBBBO...",
    "..OBBBO...OCCO...OBBBO..OBBBO...",
    ".OBBBO....OCCO...OBBBO..OBBBO...",
    ".OBBO.....OCCO...OBBO...OBBO....",
    "OBBO......OCCO...OBBO...OBBO....",
    "OOO........OO.....OO.....OOO.....",
    "................................",
    "................................",
    "................................"
  ],

  /*
  FRAME 2
  Front stride
  */

  [
    "................................",
    "................................",
    ".....OO....OO...................",
    "....OBBO..OBBO..................",
    "....OBBO..OCBO..................",
    "...OBBBBBBBBBBO.................",
    "..OBBBBBBBBBBBBO................",
    ".OBBCCCBOBBBBBBBO.....OOOO......",
    "OBBCCCCOBBBBBBBBBBO..OCCCCO.....",
    "OBCCCCCCBBBBBBBBBBBOOCBBBBCO....",
    "OBOCCCCBBBBBBBBBBBBBBBOOOBCO....",
    ".OCCCCCCBBBBBBBBBBBBBBBBBBBO....",
    "..OCCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBCCCCCCBBBBBBBBBBBBBO...",
    "...OBBBBCCCCCCCCBBBBBBBBBBBBO...",
    "..OBBBOOOCCCCCCOOOBBBBOOBBBBO...",
    ".OBBBO...OCCCCO...OBBBO..OBBBO..",
    "OBBBO.....OCCO.....OBBO..OBBBO..",
    "OBBO......OCCO......OBO...OBBO..",
    "OOO........OO........OO....OOO...",
    "................................",
    "................................",
    "................................",
    "................................"
  ],

  /*
  FRAME 3
  Passing pose
  */

  [
    "................................",
    "................................",
    ".....OO....OO...................",
    "....OBBO..OBBO..................",
    "....OBBO..OCBO..................",
    "...OBBBBBBBBBBO.................",
    "..OBBBBBBBBBBBBO................",
    ".OBBCCCBOBBBBBBBO.....OOOO......",
    "OBBCCCCOBBBBBBBBBBO..OCCCCO.....",
    "OBCCCCCCBBBBBBBBBBBOOCBBBBCO....",
    "OBOCCCCBBBBBBBBBBBBBBBOOOBCO....",
    ".OCCCCCCBBBBBBBBBBBBBBBBBBBO....",
    "..OCCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBCCCCCCBBBBBBBBBBBBBO...",
    "...OBBBBCCCCCCCCBBBBBBBBBBBBO...",
    "...OBBBBBOCCCCOOBBBBOOBBBBBO....",
    "...OBBBBO.OCCO.OBBBO..OBBBBO....",
    "...OBBBO..OCCO..OBBO..OBBBO.....",
    "...OBBO...OCCO..OBBO...OBBO.....",
    "....OO.....OO....OO.....OO.......",
    "................................",
    "................................",
    "................................",
    "................................"
  ],

  /*
  FRAME 4
  Opposite stride
  */

  [
    "................................",
    "................................",
    ".....OO....OO...................",
    "....OBBO..OBBO..................",
    "....OBBO..OCBO..................",
    "...OBBBBBBBBBBO.................",
    "..OBBBBBBBBBBBBO................",
    ".OBBCCCBOBBBBBBBO.....OOOO......",
    "OBBCCCCOBBBBBBBBBBO..OCCCCO.....",
    "OBCCCCCCBBBBBBBBBBBOOCBBBBCO....",
    "OBOCCCCBBBBBBBBBBBBBBBOOOBCO....",
    ".OCCCCCCBBBBBBBBBBBBBBBBBBBO....",
    "..OCCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBCCCCCCBBBBBBBBBBBBBO...",
    "...OBBBBCCCCCCCCBBBBBBBBBBBBO...",
    "...OBBBBOOCCCCOOOBBBBBOOBBBBO...",
    "...OBBBO..OCCO...OBBBO..OBBBO...",
    "..OBBBO...OCCO....OBBBO..OBBBO..",
    ".OBBBO....OCCO.....OBBO...OBBO..",
    "OOO........OO.......OO.....OOO...",
    "................................",
    "................................",
    "................................",
    "................................"
  ],

  /*
  FRAME 5
  Second passing pose
  */

  [
    "................................",
    "................................",
    ".....OO....OO...................",
    "....OBBO..OBBO..................",
    "....OBBO..OCBO..................",
    "...OBBBBBBBBBBO.................",
    "..OBBBBBBBBBBBBO................",
    ".OBBCCCBOBBBBBBBO.....OOOO......",
    "OBBCCCCOBBBBBBBBBBO..OCCCCO.....",
    "OBCCCCCCBBBBBBBBBBBOOCBBBBCO....",
    "OBOCCCCBBBBBBBBBBBBBBBOOOBCO....",
    ".OCCCCCCBBBBBBBBBBBBBBBBBBBO....",
    "..OCCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBCCCCCCBBBBBBBBBBBBBO...",
    "...OBBBBCCCCCCCCBBBBBBBBBBBBO...",
    "...OBBBBOOCCCCOOOBBBBOOBBBBO....",
    "...OBBBO..OCCO....OBBBO.OBBBO...",
    "...OBBO...OCCO.....OBBO.OBBBO...",
    "...OBBO...OCCO......OBBO.OBBO...",
    "....OO.....OO........OO...OO.....",
    "................................",
    "................................",
    "................................",
    "................................"
  ],

  /*
  FRAME 6
  Rear stride
  */

  [
    "................................",
    "................................",
    ".....OO....OO...................",
    "....OBBO..OBBO..................",
    "....OBBO..OCBO..................",
    "...OBBBBBBBBBBO.................",
    "..OBBBBBBBBBBBBO................",
    ".OBBCCCBOBBBBBBBO.....OOOO......",
    "OBBCCCCOBBBBBBBBBBO..OCCCCO.....",
    "OBCCCCCCBBBBBBBBBBBOOCBBBBCO....",
    "OBOCCCCBBBBBBBBBBBBBBBOOOBCO....",
    ".OCCCCCCBBBBBBBBBBBBBBBBBBBO....",
    "..OCCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCCBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCCBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OCBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBBBBBBBBBBBBBBBBBBBO....",
    "...OBBBBBCCCCCCBBBBBBBBBBBBBO...",
    "...OBBBBCCCCCCCCBBBBBBBBBBBBO...",
    "...OBBBBOOCCCCOOOBBBBBOOBBBBO...",
    "...OBBBO..OCCO.....OBBBO.OBBBO..",
    "...OBBO...OCCO......OBBBO.OBBO..",
    "...OBBO...OCCO.......OBBO.OBBO..",
    "....OO.....OO.........OO...OO....",
    "................................",
    "................................",
    "................................",
    "................................"
  ]
];

/*
==================================================
SHIBA LYING DOWN
==================================================
*/

export const SHIBA_LIE = [
  "................................",
  "................................",
  ".....OO....OO...................",
  "....OBBO..OBBO..................",
  "....OBBO..OCBO..................",
  "...OBBBBBBBBBBO.................",
  "..OBBBBBBBBBBBBO................",
  ".OBBCCCBOBBBBBBBO...............",
  "OBBCCCCOBBBBBBBBBBO.....OOOO....",
  "OBCCCCCCBBBBBBBBBBBBO..OCCCCO...",
  "OBOCCCCBBBBBBBBBBBBBBOOCBBBBBO..",
  ".OCCCCCCBBBBBBBBBBBBBBBBBOOBCO..",
  "..OCCCCBBBBBBBBBBBBBBBBBBBBBO...",
  "...OCCCBBBBBBBBBBBBBBBBBBBBBO...",
  "...OCCBBBBBBBBBBBBBBBBBBBBBBO...",
  "...OCCBBBBBBBBBBBBBBBBBBBBBBO...",
  "...OCBBBBBBBBBBBBBBBBBBBBBBBO...",
  "...OCBBBBBBBBBBBBBBBBBBBBBBBO...",
  "...OBBBBBBBBBBBBBBBBBBBBBBBBO...",
  "...OBBBBBCCCCCCCCBBBBBBBBBBBBO...",
  "...OBBBBCCCCCCCCCCBBBBBBBBBBBO...",
  "...OBBBCCCCCCCCCCCCBBBBBBBBBBO...",
  "..OBBBCCCCCCOOCCCCCCBBBBBBBBO...",
  "..OBBBBCCCCO..OCCCCBBBBBBBBBO...",
  "...OOOOOOOO....OOOOOOOOOOOOOO....",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................"
];

/*
==================================================
SHIBA SITTING
==================================================
*/

export const SHIBA_SIT = [
  "................................",
  "................................",
  "......OO....OO..................",
  ".....OBBO..OBBO.................",
  ".....OBBO..OCBO.................",
  "....OBBBBBBBBBBO................",
  "...OBBBBBBBBBBBBO...............",
  "..OBBCCCBOBBBBBBBO..............",
  ".OBBCCCCOBBBBBBBBBBO............",
  "OBCCCCCCBBBBBBBBBBBBBO..........",
  "OBOCCCCBBBBBBBBBBBBBBO..........",
  ".OCCCCCCBBBBBBBBBBBBBO..........",
  "..OCCCCBBBBBBBBBBBBBBO..........",
  "...OCCCBBBBBBBBBBBBBBO..........",
  "...OCCBBBBBBBBBBBBBBBO..........",
  "...OCCBBBBBBBBBBBBBBBO..........",
  "...OCBBBBBBBBBBBBBBBBO..........",
  "...OCBBBBBBBBBBBBBBBBO..........",
  "...OBBBBBBBBBBBBBBBBBO..........",
  "...OBBBBBBBBBBBBBBBBBO..OOOO....",
  "...OBBBBBBBBBBBBBBBBBBOOCCCCO...",
  "...OBBBBBBBBBBBBBBBBBBOCBBBBBO..",
  "...OBBBBBBBBBBBBBBBBBBBBBOBBCO..",
  "...OBBBBCCCCBBBBBBBBBBBBBBBOO...",
  "...OBBBCCCCCCBBBBBBBBBBBBBO.....",
  "...OBBBCCCCCCBBBBBBBBBBBBO......",
  "...OBBOOCCCCOOBBBBBBBBBBO.......",
  "..OBBO..OOOO..OBBBBBBBBO........",
  "..OOOO.........OOOOOOOO.........",
  "................................",
  "................................",
  "................................"
];