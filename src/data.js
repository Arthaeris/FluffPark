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
  width: 224,
  height: 320,
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

/* ---------- zone bases (top of map = north) */

paintRect(0, 0, 224, 6, T.RIDGE);                 // north ridge
paintRect(0, 6, 224, 38, T.GRASS_MUTED);          // next town ground
paintRect(0, 44, 224, 28, T.GRASS);               // advanced facilities
paintRect(0, 72, 224, 12, T.DEEP_FOREST);         // old gate belt
paintRect(0, 84, 224, 106, T.FOREST_GRASS);       // wild forest
paintRect(0, 190, 224, 48, T.PARK_GRASS);         // pet park
paintRect(0, 238, 224, 12, T.GRASS);              // park -> town
paintRect(0, 250, 224, 32, T.GRASS);              // facilities row
paintRect(0, 282, 224, 14, T.ROAD);               // main street
paintRect(0, 296, 224, 24, T.RES_GRASS);          // residential

/* ---------- map frame (west/east edges) */

paintRect(0, 0, 8, 44, T.RIDGE);
paintRect(216, 0, 8, 44, T.RIDGE);
paintRect(0, 44, 8, 206, T.DEEP_FOREST);
paintRect(216, 44, 8, 206, T.DEEP_FOREST);

/* ---------- wild forest: river with gentle bends */

for (let x = 8; x < 216; x++) {
  const center = 134 + Math.round(3 * Math.sin(x / 14));

  for (let y = center - 2; y <= center + 2; y++) {
    worldMap[y][x] = T.WATER;
  }
}

/* ---------- park pond (ellipse) */

for (let y = 198; y <= 216; y++) {
  for (let x = 150; x <= 172; x++) {
    const dx = (x - 161) / 11;
    const dy = (y - 207) / 9;

    if (dx * dx + dy * dy <= 1) {
      worldMap[y][x] = T.WATER;
    }
  }
}

/* ---------- main path: gate down to town plaza */

for (let y = 40; y < 250; y++) {
  for (let x = 110; x <= 113; x++) {
    worldMap[y][x] =
      worldMap[y][x] === T.WATER ? T.BRIDGE : T.PATH;
  }
}

/* bridge planks a bit wider than the path */
for (let y = 128; y <= 141; y++) {
  for (const x of [109, 114]) {
    if (worldMap[y][x] === T.WATER) {
      worldMap[y][x] = T.BRIDGE;
    }
  }
}

/* park cross path */
paintRect(20, 230, 184, 3, T.PATH);

/* small plaza pad where the path meets town */
paintRect(100, 240, 24, 10, T.PLAZA);

/* ---------- forest decor */

scatterTiles(8, 84, 208, 106, T.TREE, 0.11, 101);
scatterTiles(8, 84, 208, 106, T.BUSH, 0.06, 202);
scatterTiles(8, 84, 208, 106, T.ROCK, 0.02, 303);
scatterTiles(8, 84, 208, 106, T.FLOWERS, 0.02, 404);

/* denser tree walls near the forest frame */
scatterTiles(8, 84, 10, 106, T.TREE, 0.35, 505);
scatterTiles(206, 84, 10, 106, T.TREE, 0.35, 606);

/* clear a breathing space around the main path */
for (let y = 84; y < 190; y++) {
  for (let x = 107; x <= 116; x++) {
    if (worldMap[y][x] === T.TREE || worldMap[y][x] === T.ROCK) {
      worldMap[y][x] = T.FOREST_GRASS;
    }
  }
}

/* ---------- park decor */

paintRect(70, 202, 78, 26, T.STARTER_PARK);       // starter lawn
scatterTiles(10, 191, 204, 46, T.FLOWERS, 0.035, 707);
scatterTiles(10, 191, 204, 46, T.TREE, 0.015, 808);
scatterTiles(10, 191, 204, 46, T.BUSH, 0.02, 909);

/* repaint the main path across the starter lawn */
for (let y = 202; y < 228; y++) {
  for (let x = 110; x <= 113; x++) {
    worldMap[y][x] = T.PATH;
  }
}

/* keep the starter lawn clear */
for (let y = 202; y < 228; y++) {
  for (let x = 70; x < 148; x++) {
    if (
      worldMap[y][x] === T.TREE ||
      worldMap[y][x] === T.BUSH ||
      worldMap[y][x] === T.ROCK
    ) {
      worldMap[y][x] = T.STARTER_PARK;
    }
  }
}

/* ---------- facilities strip */

paintRect(0, 250, 224, 2, T.SIDEWALK);
paintRect(96, 252, 32, 28, T.PLAZA);              // town plaza
paintRect(0, 278, 224, 2, T.SIDEWALK);

/* ---------- main street details */

paintRect(0, 282, 224, 2, T.SIDEWALK);
paintRect(0, 294, 224, 2, T.SIDEWALK);

/* ---------- residential decor */

scatterTiles(8, 296, 208, 20, T.FLOWERS, 0.03, 111);
scatterTiles(8, 296, 208, 20, T.TREE, 0.012, 222);
paintRect(0, 314, 224, 6, T.GRASS);
scatterTiles(0, 314, 224, 4, T.BUSH, 0.25, 333);

scatterTiles(10, 45, 204, 26, T.TREE, 0.018, 555);

/* ---------- next town decor (locked, muted) */

scatterTiles(10, 8, 204, 34, T.TREE, 0.03, 444);
paintRect(0, 36, 224, 4, T.ROAD);

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
  { x: 24,  y: 12, w: 24, h: 12, type: T.TOWN_BUILDING, style: "town", locked: true },
  { x: 58,  y: 16, w: 20, h: 10, type: T.TOWN_BUILDING, style: "town", locked: true },
  { x: 92,  y: 12, w: 28, h: 12, type: T.TOWN_BUILDING, style: "town", locked: true },
  { x: 132, y: 16, w: 20, h: 10, type: T.TOWN_BUILDING, style: "town", locked: true },
  { x: 164, y: 12, w: 26, h: 12, type: T.TOWN_BUILDING, style: "town", locked: true },

  /* advanced facilities (locked for now) */
  { x: 18,  y: 46, w: 48, h: 16, type: T.ARENA,         style: "arena",    locked: true },
  { x: 80,  y: 48, w: 40, h: 14, type: T.HOSPITAL,      style: "hospital", locked: true },
  { x: 134, y: 48, w: 34, h: 14, type: T.ELITE_TRAINER, style: "trainer",  locked: true },
  { x: 182, y: 48, w: 26, h: 14, type: T.LOCKED_LOT,    style: "locked",   locked: true },

  /* facilities row */
  { x: 8,   y: 256, w: 19, h: 16, type: T.PET_SHOP,     style: "shopWarm" },
  { x: 30,  y: 256, w: 19, h: 16, type: T.VET,          style: "vet" },
  { x: 52,  y: 256, w: 19, h: 16, type: T.GROOMER,      style: "shopPink" },
  { x: 74,  y: 256, w: 19, h: 16, type: T.BREEDER,      style: "shopBrown" },
  { x: 132, y: 256, w: 19, h: 16, type: T.TRAINER,      style: "trainer" },
  { x: 154, y: 256, w: 19, h: 16, type: T.PET_HOTEL,    style: "hotel" },
  { x: 176, y: 256, w: 18, h: 16, type: T.DOG_WALKER,   style: "shopBlue" },
  { x: 197, y: 256, w: 19, h: 16, type: T.PHOTO_STUDIO, style: "shopPurple" },

  /* residential */
  { x: 16,  y: 298, w: 24, h: 13, type: T.PLAYER_HOME,  style: "home" },
  { x: 50,  y: 300, w: 16, h: 11, type: T.HOUSE,        style: "house1" },
  { x: 74,  y: 300, w: 16, h: 11, type: T.HOUSE,        style: "house2" },
  { x: 98,  y: 300, w: 16, h: 11, type: T.HOUSE,        style: "house3" },
  { x: 122, y: 300, w: 16, h: 11, type: T.HOUSE,        style: "house1" },
  { x: 148, y: 298, w: 28, h: 13, type: T.APARTMENTS,   style: "apartments" },
  { x: 184, y: 298, w: 28, h: 13, type: T.APARTMENTS,   style: "apartments" }
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
  { x: 8, y: 84, w: 208, h: 106 },   // wild forest
  { x: 8, y: 190, w: 208, h: 48 }    // pet park
];

/*
==================================================
MAP LABELS (all English)
==================================================
*/

export const MAP_LABELS = [
  { text: "NEXT TOWN ???", x: 112, y: 30 },

  { text: "COMPETITION ARENA", x: 42, y: 66 },
  { text: "ANIMAL HOSPITAL", x: 100, y: 66 },
  { text: "ELITE TRAINER", x: 151, y: 66 },
  { text: "???", x: 195, y: 66 },

  { text: "OLD GATE", x: 112, y: 78 },
  { text: "WILD FOREST", x: 60, y: 100 },

  { text: "PET PARK", x: 40, y: 195 },
  { text: "STARTER PARK", x: 109, y: 214 },

  { text: "PET SHOP", x: 17, y: 265 },
  { text: "VET", x: 39, y: 265 },
  { text: "GROOMER", x: 61, y: 265 },
  { text: "BREEDER", x: 83, y: 265 },
  { text: "TOWN PLAZA", x: 112, y: 251 },
  { text: "TRAINER", x: 141, y: 265 },
  { text: "PET HOTEL", x: 163, y: 265 },
  { text: "DOG WALKER", x: 185, y: 265 },
  { text: "PHOTO STUDIO", x: 206, y: 265 },

  { text: "MAIN STREET", x: 112, y: 288 },
  { text: "RESIDENTIAL", x: 112, y: 316 },
  { text: "PLAYER HOME", x: 28, y: 313 }
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
