/*
==================================================
WORLD DATA
==================================================

A compact, dense Kairosoft-style world.

South -> North progression:

  RESIDENTIAL  (bottom / south)
  MAIN STREET
  FACILITIES   (shop row + town plaza)
  PET PARK     (customizable - visible grid)
  WILD FOREST  (customizable - visible grid)
  OLD GATE     (thick forest belt)
  ADVANCED FACILITIES  (hidden / locked)
  NEXT TOWN    (hidden / locked)

The tile map drives gameplay info (tile lookup),
while worldRenderer.js paints the pretty picture.
==================================================
*/

export const WORLD = {
  width: 160,
  height: 352,
  tileSize: 16
};

export const TILE_TYPES = {
  GRASS: "Grass",
  GRASS_MUTED: "Distant Grass",
  FOREST_GRASS: "Forest Floor",
  PARK_GRASS: "Park Lawn",
  STARTER_PARK: "Starter Park",
  RES_GRASS: "Residential Green",

  DEEP_FOREST: "Deep Forest",
  TREE: "Tree",
  BUSH: "Bush",
  ROCK: "Rock",
  FLOWERS: "Flowers",

  WATER: "Water",
  BRIDGE: "Bridge",
  PATH: "Path",
  ROAD: "Road",
  SIDEWALK: "Sidewalk",
  PLAZA: "Town Plaza",
  RIDGE: "Mountain Ridge",

  PET_SHOP: "Pet Shop",
  VET: "Veterinary Clinic",
  GROOMER: "Groomer",
  BREEDER: "Breeder",
  TRAINER: "Trainer",
  PET_HOTEL: "Pet Hotel",
  DOG_WALKER: "Dog Walker",
  PHOTO_STUDIO: "Pet Photography Studio",

  ARENA: "Competition Arena",
  HOSPITAL: "Animal Hospital",
  ELITE_TRAINER: "Elite Trainer",
  LOCKED_LOT: "Locked Lot",
  TOWN_BUILDING: "Next Town",

  SHELTER: "Animal Shelter",
  PLAYER_HOME: "Player Home",
  HOUSE: "House",
  APARTMENTS: "Apartments"
};

/* Base colors, also used by the tile info panel */
export const TILE_COLORS = {
  [TILE_TYPES.GRASS]: 0x7dab63,
  [TILE_TYPES.GRASS_MUTED]: 0x8aa07c,
  [TILE_TYPES.FOREST_GRASS]: 0x6d9c56,
  [TILE_TYPES.PARK_GRASS]: 0x8fbf72,
  [TILE_TYPES.STARTER_PARK]: 0x9ccb7e,
  [TILE_TYPES.RES_GRASS]: 0x86ad69,

  [TILE_TYPES.DEEP_FOREST]: 0x4e7a44,
  [TILE_TYPES.TREE]: 0x4c8140,
  [TILE_TYPES.BUSH]: 0x5b8f4a,
  [TILE_TYPES.ROCK]: 0x8f9194,
  [TILE_TYPES.FLOWERS]: 0x8fbf72,

  [TILE_TYPES.WATER]: 0x6db3e8,
  [TILE_TYPES.BRIDGE]: 0xb08a5a,
  [TILE_TYPES.PATH]: 0xd9c08a,
  [TILE_TYPES.ROAD]: 0x5b5e63,
  [TILE_TYPES.SIDEWALK]: 0xc9c3b4,
  [TILE_TYPES.PLAZA]: 0xd9c9a0,
  [TILE_TYPES.RIDGE]: 0x7b7d80,

  [TILE_TYPES.PET_SHOP]: 0xf2e3c8,
  [TILE_TYPES.VET]: 0xf4f1e8,
  [TILE_TYPES.GROOMER]: 0xf5e4ec,
  [TILE_TYPES.BREEDER]: 0xecd9bd,
  [TILE_TYPES.TRAINER]: 0xe8e6d4,
  [TILE_TYPES.PET_HOTEL]: 0xefe0c8,
  [TILE_TYPES.DOG_WALKER]: 0xdfe8ea,
  [TILE_TYPES.PHOTO_STUDIO]: 0xe6e0ee,

  [TILE_TYPES.ARENA]: 0xe5d6bd,
  [TILE_TYPES.HOSPITAL]: 0xf2efe6,
  [TILE_TYPES.ELITE_TRAINER]: 0xdfe4cf,
  [TILE_TYPES.LOCKED_LOT]: 0x9aa08e,
  [TILE_TYPES.TOWN_BUILDING]: 0xb8b0a0,

  [TILE_TYPES.SHELTER]: 0xd8ece4,
  [TILE_TYPES.PLAYER_HOME]: 0xf4e6c4,
  [TILE_TYPES.HOUSE]: 0xeadfc6,
  [TILE_TYPES.APARTMENTS]: 0xd9cbb4
};

/*
==================================================
MAP CONSTRUCTION
==================================================
*/

export const worldMap = Array.from(
  { length: WORLD.height },
  () => Array.from({ length: WORLD.width }, () => TILE_TYPES.GRASS)
);

function paintRect(x, y, width, height, tileType) {
  const startX = Math.max(0, x);
  const startY = Math.max(0, y);
  const endX = Math.min(WORLD.width, x + width);
  const endY = Math.min(WORLD.height, y + height);

  for (let ty = startY; ty < endY; ty++) {
    for (let tx = startX; tx < endX; tx++) {
      worldMap[ty][tx] = tileType;
    }
  }
}

/* Seeded random so the map is identical on every load */
function makeRandom(seed) {
  let value = seed;

  return function random() {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/* Scatter decor, but only on top of plain ground tiles */
const SCATTER_GROUND = new Set([
  TILE_TYPES.GRASS,
  TILE_TYPES.GRASS_MUTED,
  TILE_TYPES.FOREST_GRASS,
  TILE_TYPES.PARK_GRASS,
  TILE_TYPES.RES_GRASS
]);

function scatterTiles(x, y, width, height, tileType, density, seed) {
  const random = makeRandom(seed);

  for (let ty = y; ty < y + height; ty++) {
    for (let tx = x; tx < x + width; tx++) {
      if (
        tx < 0 || ty < 0 ||
        tx >= WORLD.width || ty >= WORLD.height
      ) {
        continue;
      }

      if (
        random() < density &&
        SCATTER_GROUND.has(worldMap[ty][tx])
      ) {
        worldMap[ty][tx] = tileType;
      }
    }
  }
}

const T = TILE_TYPES;

/*
Portrait layout, sized for a phone screen
(160 x 352 tiles ~ 9:19.8).

y   0-  6  north ridge
y   6- 44  NEXT TOWN (locked)
y  44- 78  ADVANCED FACILITIES (locked)
y  78- 92  OLD GATE forest belt
y  92-210  WILD FOREST   (customizable, grid)
y 210-268  PET PARK      (customizable, grid)
y 268-278  park -> town transition
y 278-314  FACILITIES (two shop rows + plaza)
y 314-330  MAIN STREET
y 330-352  RESIDENTIAL + south hedge
*/

paintRect(0, 0, 160, 6, T.RIDGE);
paintRect(0, 6, 160, 38, T.GRASS_MUTED);
paintRect(0, 44, 160, 34, T.GRASS);
paintRect(0, 78, 160, 14, T.DEEP_FOREST);
paintRect(0, 92, 160, 118, T.FOREST_GRASS);
paintRect(0, 210, 160, 58, T.PARK_GRASS);
paintRect(0, 268, 160, 10, T.GRASS);
paintRect(0, 278, 160, 36, T.GRASS);
paintRect(0, 314, 160, 16, T.ROAD);
paintRect(0, 330, 160, 22, T.RES_GRASS);

/* ---------- map frame (west/east edges) */

paintRect(0, 0, 6, 48, T.RIDGE);
paintRect(154, 0, 6, 48, T.RIDGE);
paintRect(0, 48, 6, 220, T.DEEP_FOREST);
paintRect(154, 48, 6, 220, T.DEEP_FOREST);

/* ---------- wild forest: river with gentle bends */

for (let x = 6; x < 154; x++) {
  const center = 150 + Math.round(3 * Math.sin(x / 12));

  for (let y = center - 2; y <= center + 2; y++) {
    worldMap[y][x] = T.WATER;
  }
}

/* ---------- park pond (ellipse) */

for (let y = 214; y <= 234; y++) {
  for (let x = 118; x <= 146; x++) {
    const dx = (x - 132) / 14;
    const dy = (y - 224) / 10;

    if (dx * dx + dy * dy <= 1) {
      worldMap[y][x] = T.WATER;
    }
  }
}

/* ---------- main path: next town road down to the plaza */

for (let y = 42; y < 280; y++) {
  for (let x = 77; x <= 80; x++) {
    worldMap[y][x] =
      worldMap[y][x] === T.WATER ? T.BRIDGE : T.PATH;
  }
}

/* bridge planks a bit wider than the path */
for (let y = 144; y <= 157; y++) {
  for (const x of [76, 81]) {
    if (worldMap[y][x] === T.WATER) {
      worldMap[y][x] = T.BRIDGE;
    }
  }
}

/* park cross path + plaza pad */
paintRect(14, 254, 132, 3, T.PATH);
paintRect(68, 268, 24, 10, T.PLAZA);

/* ---------- forest decor */

scatterTiles(6, 92, 148, 118, T.TREE, 0.11, 101);
scatterTiles(6, 92, 148, 118, T.BUSH, 0.06, 202);
scatterTiles(6, 92, 148, 118, T.ROCK, 0.02, 303);
scatterTiles(6, 92, 148, 118, T.FLOWERS, 0.02, 404);

/* denser tree walls near the forest frame */
scatterTiles(6, 92, 10, 118, T.TREE, 0.35, 505);
scatterTiles(144, 92, 10, 118, T.TREE, 0.35, 606);

/* clear a breathing space around the main path */
for (let y = 92; y < 210; y++) {
  for (let x = 74; x <= 83; x++) {
    if (worldMap[y][x] === T.TREE || worldMap[y][x] === T.ROCK) {
      worldMap[y][x] = T.FOREST_GRASS;
    }
  }
}

/* ---------- park decor */

paintRect(40, 224, 76, 28, T.STARTER_PARK);
scatterTiles(8, 211, 144, 56, T.FLOWERS, 0.035, 707);
scatterTiles(8, 211, 144, 56, T.TREE, 0.015, 808);
scatterTiles(8, 211, 144, 56, T.BUSH, 0.02, 909);

/* repaint the main path across the starter lawn */
for (let y = 224; y < 252; y++) {
  for (let x = 77; x <= 80; x++) {
    worldMap[y][x] = T.PATH;
  }
}

/* keep the starter lawn clear */
for (let y = 224; y < 252; y++) {
  for (let x = 40; x < 116; x++) {
    if (
      worldMap[y][x] === T.TREE ||
      worldMap[y][x] === T.BUSH ||
      worldMap[y][x] === T.ROCK
    ) {
      worldMap[y][x] = T.STARTER_PARK;
    }
  }
}

/* ---------- facilities: two shop rows around the plaza */

paintRect(0, 276, 160, 2, T.SIDEWALK);
paintRect(62, 278, 36, 36, T.PLAZA);
paintRect(0, 312, 160, 2, T.SIDEWALK);

/* ---------- main street details */

paintRect(0, 314, 160, 2, T.SIDEWALK);
paintRect(0, 328, 160, 2, T.SIDEWALK);

/* ---------- residential decor */

scatterTiles(6, 330, 148, 18, T.FLOWERS, 0.03, 111);
scatterTiles(6, 330, 148, 18, T.TREE, 0.012, 222);
paintRect(0, 348, 160, 4, T.GRASS);
scatterTiles(0, 348, 160, 3, T.BUSH, 0.25, 333);

/* ---------- advanced facilities decor */

scatterTiles(8, 46, 144, 30, T.TREE, 0.018, 555);

/* ---------- next town decor (locked, muted) */

scatterTiles(8, 8, 144, 34, T.TREE, 0.03, 444);
paintRect(0, 38, 160, 4, T.ROAD);

/*
==================================================
BUILDINGS
==================================================

Painted into the tile map for the info panel and
drawn as pretty structures by worldRenderer.js.

style keys map to BUILDING_STYLES in the renderer.
==================================================
*/

export const BUILDINGS = [
  /* next town (locked) */
  { x: 10,  y: 12, w: 22, h: 14, type: T.TOWN_BUILDING, style: "town", locked: true },
  { x: 38,  y: 16, w: 20, h: 12, type: T.TOWN_BUILDING, style: "town", locked: true },
  { x: 64,  y: 10, w: 32, h: 16, type: T.TOWN_BUILDING, style: "town", locked: true },
  { x: 102, y: 16, w: 20, h: 12, type: T.TOWN_BUILDING, style: "town", locked: true },
  { x: 128, y: 12, w: 22, h: 14, type: T.TOWN_BUILDING, style: "town", locked: true },

  /* advanced facilities (locked for now) */
  { x: 8,   y: 50, w: 44, h: 18, type: T.ARENA,         style: "arena",    locked: true },
  { x: 58,  y: 52, w: 14, h: 14, type: T.LOCKED_LOT,    style: "locked",   locked: true },
  { x: 86,  y: 52, w: 34, h: 15, type: T.HOSPITAL,      style: "hospital", locked: true },
  { x: 126, y: 51, w: 26, h: 16, type: T.ELITE_TRAINER, style: "trainer",  locked: true },

  /* facilities: row A (north of plaza center) */
  { x: 8,   y: 280, w: 22, h: 13, type: T.PET_SHOP,     style: "shopWarm" },
  { x: 34,  y: 280, w: 22, h: 13, type: T.VET,          style: "vet" },
  { x: 104, y: 280, w: 22, h: 13, type: T.GROOMER,      style: "shopPink" },
  { x: 130, y: 280, w: 22, h: 13, type: T.BREEDER,      style: "shopBrown" },

  /* facilities: row B */
  { x: 8,   y: 297, w: 22, h: 13, type: T.TRAINER,      style: "trainer" },
  { x: 34,  y: 297, w: 22, h: 13, type: T.PET_HOTEL,    style: "hotel" },
  { x: 104, y: 297, w: 22, h: 13, type: T.DOG_WALKER,   style: "shopBlue" },
  { x: 130, y: 297, w: 22, h: 13, type: T.PHOTO_STUDIO, style: "shopPurple" },

  /* park shelter */
  { x: 14,  y: 257, w: 20, h: 11, type: T.SHELTER, style: "shelter" },

  /* residential */
  { x: 8,   y: 332, w: 22, h: 12, type: T.PLAYER_HOME,  style: "home" },
  { x: 36,  y: 334, w: 14, h: 10, type: T.HOUSE,        style: "house1" },
  { x: 56,  y: 334, w: 14, h: 10, type: T.HOUSE,        style: "house2" },
  { x: 80,  y: 332, w: 26, h: 12, type: T.APARTMENTS,   style: "apartments" },
  { x: 112, y: 334, w: 14, h: 10, type: T.HOUSE,        style: "house3" },
  { x: 132, y: 334, w: 14, h: 10, type: T.HOUSE,        style: "house1" }
];

for (const b of BUILDINGS) {
  paintRect(b.x, b.y, b.w, b.h, b.type);
}

/*
==================================================
GRID AREAS
==================================================

The grid is only clearly visible in the two
customizable zones: Wild Forest and Pet Park.
==================================================
*/

export const GRID_AREAS = [
  { x: 6, y: 92, w: 148, h: 118 },   // wild forest
  { x: 6, y: 210, w: 148, h: 58 }    // pet park
];

/*
==================================================
POINTS OF INTEREST (for the renderer)
==================================================
*/

export const POI = {
  fountain: { x: 80, y: 296 },
  mainStreet: { y: 314, height: 16, crosswalkX0: 74, crosswalkX1: 86 },
  nextTownRoadY: 38
};

/*
==================================================
MAP LABELS (all English)
==================================================
*/

export const MAP_LABELS = [
  { text: "NEXT TOWN ???", x: 80, y: 32 },

  { text: "COMPETITION ARENA", x: 30, y: 71 },
  { text: "???", x: 65, y: 69 },
  { text: "ANIMAL HOSPITAL", x: 103, y: 70 },
  { text: "ELITE TRAINER", x: 139, y: 70 },

  { text: "OLD GATE", x: 80, y: 85 },
  { text: "WILD FOREST", x: 40, y: 108 },

  { text: "PET PARK", x: 28, y: 215 },
  { text: "STARTER PARK", x: 77, y: 236 },

  { text: "SHELTER", x: 24, y: 270 },
  { text: "PET SHOP", x: 19, y: 295 },
  { text: "VET", x: 45, y: 295 },
  { text: "GROOMER", x: 115, y: 295 },
  { text: "BREEDER", x: 141, y: 295 },
  { text: "TOWN PLAZA", x: 80, y: 280 },
  { text: "TRAINER", x: 19, y: 312 },
  { text: "PET HOTEL", x: 45, y: 312 },
  { text: "DOG WALKER", x: 115, y: 312 },
  { text: "PHOTO STUDIO", x: 141, y: 312 },

  { text: "MAIN STREET", x: 80, y: 321 },
  { text: "RESIDENTIAL", x: 80, y: 349 },
  { text: "PLAYER HOME", x: 19, y: 346 }
];

/*
==================================================
NPC STROLL ROUTES (tile coordinates)
==================================================
*/

export const NPC_ROUTES = [
  /* main street, west <-> east on the sidewalk */
  [[2, 315], [157, 315]],

  /* plaza up the main path into the park, then west */
  [[78.5, 313], [78.5, 256], [20, 255.5]],

  /* plaza up the main path, then east to the pond */
  [[78.5, 313], [78.5, 256], [140, 255.5]],

  /* plaza loop */
  [[66, 313], [66, 285], [92, 285], [92, 313]],

  /* park visitor: cross path stroll */
  [[16, 255.5], [144, 255.5]],

  /* forest hike up to the bridge and back area */
  [[78.5, 256], [78.5, 160], [78.5, 256]]
];

/*
==================================================
TILE LOOKUP
==================================================
*/

export function getTileType(tileX, tileY) {
  if (
    tileX < 0 || tileY < 0 ||
    tileX >= WORLD.width || tileY >= WORLD.height
  ) {
    return null;
  }

  return worldMap[tileY][tileX];
}
