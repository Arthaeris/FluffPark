/*
==================================================
WORLD RENDERER
==================================================

Paints the whole map ONCE onto canvas textures
(chunked so no texture exceeds common GPU limits)
instead of re-drawing 70k+ rects every frame.

Look & feel goals (Kairosoft vibes):
  - soft two-tone ground variation per tile
  - trees / bushes / rocks / flowers as round,
    chunky objects with shadows and highlights
  - water with shoreline and little waves
  - buildings with drop shadow, colored roof,
    awnings, windows and doors
  - grid lines only inside GRID_AREAS
    (the customizable Forest & Park zones)
==================================================
*/

import {
  WORLD,
  TILE_TYPES,
  worldMap,
  BUILDINGS,
  GRID_AREAS
} from "./data.js";

const T = TILE_TYPES;
const TS = WORLD.tileSize;

/* deterministic per-tile hash for variation */
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

/* ---------- ground palette: base + variation shades */

const GROUND = {
  [T.GRASS]:        ["#7dab63", "#77a35d", "#83b169"],
  [T.GRASS_MUTED]:  ["#8aa07c", "#849a76", "#90a682"],
  [T.FOREST_GRASS]: ["#6d9c56", "#679452", "#73a45c"],
  [T.PARK_GRASS]:   ["#8fbf72", "#89b76c", "#95c778"],
  [T.STARTER_PARK]: ["#9ccb7e", "#96c378", "#a2d384"],
  [T.RES_GRASS]:    ["#86ad69", "#80a563", "#8cb56f"],
  [T.DEEP_FOREST]:  ["#3f6a38", "#39622f", "#456f3d"],
  [T.PATH]:         ["#d9c08a", "#d2b781", "#e0c993"],
  [T.PLAZA]:        ["#d9c9a0", "#d2c096", "#e0d2aa"],
  [T.ROAD]:         ["#5b5e63", "#57595e", "#5f6268"],
  [T.SIDEWALK]:     ["#c9c3b4", "#c2bcac", "#d0cabc"],
  [T.RIDGE]:        ["#7b7d80", "#74767a", "#828488"],
  [T.WATER]:        ["#6db3e8", "#68aee3", "#72b8ed"],
  [T.BRIDGE]:       ["#b08a5a", "#a88253", "#b89261"]
};

/* decor tiles share their zone's grass under the object */
const DECOR_GROUND = {
  [T.TREE]: null,     // resolved from surrounding zone at paint time
  [T.BUSH]: null,
  [T.ROCK]: null,
  [T.FLOWERS]: null
};

function groundFor(x, y) {
  /* pick the zone grass this decor tile sits in */
  if (y < 44) return GROUND[T.GRASS_MUTED];
  if (y < 72) return GROUND[T.GRASS];
  if (y < 190) return GROUND[T.FOREST_GRASS];
  if (y < 238) return GROUND[T.PARK_GRASS];
  if (y < 296) return GROUND[T.GRASS];
  return GROUND[T.RES_GRASS];
}

/* ---------- building styles */

const BUILDING_STYLES = {
  shopWarm:   { wall: "#f2e3c8", roof: "#e08a4a", awning: ["#e08a4a", "#f6efe2"] },
  vet:        { wall: "#f4f1e8", roof: "#7fb0c9", cross: "#e05c5c" },
  shopPink:   { wall: "#f5e4ec", roof: "#d585a8", awning: ["#d585a8", "#f8eef4"] },
  shopBrown:  { wall: "#ecd9bd", roof: "#a8764f", awning: ["#b8865f", "#f1e6d4"] },
  trainer:    { wall: "#e8e6d4", roof: "#8aa864" },
  hotel:      { wall: "#efe0c8", roof: "#c99a5f" },
  shopBlue:   { wall: "#dfe8ea", roof: "#7fa3ad", awning: ["#7fa3ad", "#eef4f5"] },
  shopPurple: { wall: "#e6e0ee", roof: "#9b8ec4", awning: ["#9b8ec4", "#f2eff7"] },
  home:       { wall: "#f4e6c4", roof: "#d98f52" },
  house1:     { wall: "#eadfc6", roof: "#b96d4f" },
  house2:     { wall: "#e4d4c0", roof: "#8f9a5f" },
  house3:     { wall: "#eee4d0", roof: "#7f97b5" },
  apartments: { wall: "#d9cbb4", roof: "#8a8f9a", floors: true },
  arena:      { wall: "#e5d6bd", roof: "#c27755", banner: true },
  hospital:   { wall: "#f2efe6", roof: "#d97f74", cross: "#e05c5c" },
  town:       { wall: "#cfc6b6", roof: "#9a948a" },
  locked:     { wall: "#b9bdb0", roof: "#9aa08e", question: true }
};

const OUTLINE = "#3a3126";

function mix(hex, target, amount) {
  const c = parseInt(hex.slice(1), 16);
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const tr = (target >> 16) & 255, tg = (target >> 8) & 255, tb = target & 255;
  const m = (a, t) => Math.round(a + (t - a) * amount);
  return `rgb(${m(r, tr)},${m(g, tg)},${m(b, tb)})`;
}

const mute = (hex) => mix(hex, 0x9a9a92, 0.45);
const darken = (hex, amt = 0.25) => mix(hex, 0x000000, amt);
const lighten = (hex, amt = 0.25) => mix(hex, 0xffffff, amt);

/* ---------- small canvas helpers */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/*
==================================================
PAINT PASSES
==================================================
*/

function paintGround(ctx, x0, y0, x1, y1, offY) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let tile = worldMap[y][x];

      let shades = GROUND[tile];

      if (shades === undefined) {
        if (tile in DECOR_GROUND) {
          shades = groundFor(x, y);
        } else {
          /* building tiles: paint zone grass, structure comes later */
          shades = groundFor(x, y);
        }
      }

      const h = hash(x, y);
      const shade =
        h < 0.62 ? shades[0] : h < 0.81 ? shades[1] : shades[2];

      ctx.fillStyle = shade;
      ctx.fillRect(x * TS, y * TS - offY, TS, TS);
    }
  }
}

function isWater(x, y) {
  if (x < 0 || y < 0 || x >= WORLD.width || y >= WORLD.height) {
    return false;
  }
  const t = worldMap[y][x];
  return t === T.WATER || t === T.BRIDGE;
}

function paintWater(ctx, x0, y0, x1, y1, offY) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (worldMap[y][x] !== T.WATER) {
        continue;
      }

      const px = x * TS;
      const py = y * TS - offY;

      /* shoreline edges */
      ctx.fillStyle = "#3f7fb5";

      if (!isWater(x, y - 1)) ctx.fillRect(px, py, TS, 3);
      if (!isWater(x, y + 1)) ctx.fillRect(px, py + TS - 3, TS, 3);
      if (!isWater(x - 1, y)) ctx.fillRect(px, py, 3, TS);
      if (!isWater(x + 1, y)) ctx.fillRect(px + TS - 3, py, 3, TS);

      /* sparkle waves */
      const h = hash(x * 7, y * 3);

      if (h > 0.72) {
        ctx.fillStyle = "#a8d4f2";
        ctx.fillRect(px + 3 + Math.floor(h * 6), py + 6, 6, 2);
      }
    }
  }
}

function paintPathDetails(ctx, x0, y0, x1, y1, offY) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const tile = worldMap[y][x];
      const px = x * TS;
      const py = y * TS - offY;

      if (tile === T.PATH || tile === T.PLAZA) {
        const h = hash(x * 3, y * 5);

        if (h > 0.7) {
          ctx.fillStyle = "rgba(150,120,70,0.25)";
          ctx.fillRect(px + Math.floor(h * 9), py + Math.floor(h * 11), 4, 3);
        }
      }

      /* plaza: subtle checker paving */
      if (tile === T.PLAZA && (x + y) % 2 === 0) {
        ctx.fillStyle = "rgba(120,100,60,0.08)";
        ctx.fillRect(px, py, TS, TS);
      }

      if (tile === T.BRIDGE) {
        ctx.fillStyle = "#b08a5a";
        ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = "#8a6a42";

        for (let ly = 2; ly < TS; ly += 5) {
          ctx.fillRect(px, py + ly, TS, 2);
        }
      }

      if (tile === T.RIDGE) {
        const h = hash(x * 11, y * 13);

        if (h > 0.6) {
          ctx.fillStyle = h > 0.82 ? "#999b9e" : "#6f7174";
          ctx.fillRect(px + Math.floor(h * 8), py + Math.floor(h * 10), 5, 4);
        }
      }
    }
  }
}

function paintRoadDetails(ctx, offY) {
  /* dashed center line on main street */
  const roadTop = 282 * TS - offY;
  ctx.fillStyle = "#e8d27b";

  for (let x = 0; x < WORLD.width * TS; x += 48) {
    ctx.fillRect(x, roadTop + 6 * TS - 2, 24, 4);
  }

  /* crosswalk aligned with the plaza / main path */
  ctx.fillStyle = "rgba(240,240,235,0.55)";

  for (let x = 107 * TS; x < 117 * TS; x += 16) {
    ctx.fillRect(x, roadTop + 2 * TS + 8, 9, 8 * TS - 16);
  }

  /* next town road: muted dashes */
  const farRoadTop = 36 * TS - offY;
  ctx.fillStyle = "rgba(220,210,160,0.4)";

  for (let x = 8 * TS; x < 216 * TS; x += 48) {
    ctx.fillRect(x, farRoadTop + 2 * TS - 2, 24, 3);
  }
}

/* ---------- decor objects */

function paintDecor(ctx, x0, y0, x1, y1, offY) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const tile = worldMap[y][x];
      const h = hash(x * 17, y * 19);
      const jx = Math.floor((h - 0.5) * 6);
      const jy = Math.floor((hash(x * 23, y * 29) - 0.5) * 6);
      const cx = x * TS + TS / 2 + jx;
      const cy = y * TS + TS / 2 + jy - offY;
      const muted = y < 44;

      if (tile === T.TREE || tile === T.DEEP_FOREST) {
        const deep = tile === T.DEEP_FOREST;

        if (deep && h < 0.45) {
          continue; // not every deep tile gets a canopy
        }

        const r = deep ? 9 + h * 3 : 8 + h * 2;

        /* shadow */
        ctx.fillStyle = "rgba(30,50,25,0.28)";
        ctx.beginPath();
        ctx.ellipse(cx + 2, cy + r * 0.55, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        /* trunk */
        ctx.fillStyle = muted ? mute("#6b4a2f") : "#6b4a2f";
        ctx.fillRect(cx - 2, cy + r * 0.25, 4, 5);

        /* canopy */
        let canopy = deep
          ? (h > 0.7 ? "#3a682f" : "#356028")
          : (h > 0.6 ? "#4c8140" : "#457a39");

        if (muted) canopy = mute(canopy);

        ctx.fillStyle = darken(canopy, 0.22);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = canopy;
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 1, r - 1.5, 0, Math.PI * 2);
        ctx.fill();

        /* highlight */
        ctx.fillStyle = lighten(canopy, 0.22);
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === T.BUSH) {
        ctx.fillStyle = "rgba(30,50,25,0.22)";
        ctx.beginPath();
        ctx.ellipse(cx + 1, cy + 4, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#4a7c3c";
        ctx.beginPath();
        ctx.arc(cx, cy + 1, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#5b8f4a";
        ctx.beginPath();
        ctx.arc(cx - 1, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === T.ROCK) {
        ctx.fillStyle = "rgba(30,40,30,0.25)";
        ctx.beginPath();
        ctx.ellipse(cx + 1, cy + 4, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#6f7174";
        roundRect(ctx, cx - 6, cy - 4, 12, 9, 4);
        ctx.fill();

        ctx.fillStyle = "#8f9194";
        roundRect(ctx, cx - 5, cy - 4, 9, 6, 3);
        ctx.fill();

        ctx.fillStyle = "#aeb0b3";
        ctx.fillRect(cx - 3, cy - 3, 3, 2);
      } else if (tile === T.FLOWERS) {
        const colors = ["#e86a6a", "#f2d05c", "#f7f7f0", "#e8925c"];

        for (let i = 0; i < 4; i++) {
          const fx = cx - 5 + Math.floor(hash(x * 31 + i, y * 37) * 10);
          const fy = cy - 5 + Math.floor(hash(x * 41, y * 43 + i) * 10);

          ctx.fillStyle = colors[(x + y + i) % colors.length];
          ctx.fillRect(fx, fy, 3, 3);
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillRect(fx + 1, fy + 1, 1, 1);
        }
      }
    }
  }
}

/* ---------- buildings */

function paintBuilding(ctx, b, offY) {
  const style = BUILDING_STYLES[b.style] ?? BUILDING_STYLES.town;

  const x = b.x * TS;
  const y = b.y * TS - offY;
  const w = b.w * TS;
  const h = b.h * TS;

  let wall = style.wall;
  let roof = style.roof;

  if (b.locked) {
    wall = mute(wall);
    roof = mute(roof);
  }

  /* drop shadow */
  ctx.fillStyle = "rgba(20,30,15,0.25)";
  roundRect(ctx, x + 5, y + 7, w, h, 8);
  ctx.fill();

  /* wall */
  ctx.fillStyle = wall;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = b.locked ? "rgba(58,49,38,0.55)" : OUTLINE;
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 7);
  ctx.stroke();

  /* roof band */
  const roofH = Math.max(16, Math.floor(h * 0.34));

  ctx.fillStyle = roof;
  roundRect(ctx, x + 3, y + 3, w - 6, roofH, 6);
  ctx.fill();

  ctx.fillStyle = darken(roof, b.locked ? 0.08 : 0.12);
  ctx.fillRect(x + 3, y + 3 + Math.floor(roofH * 0.55), w - 6, 3);

  ctx.fillStyle = darken(roof, b.locked ? 0.14 : 0.22);
  ctx.fillRect(x + 3, y + roofH - 1, w - 6, 3);

  ctx.fillStyle = lighten(roof, 0.3);
  ctx.fillRect(x + 6, y + 5, w - 12, 3);

  /* door (scaled with the building) */
  const doorW = Math.max(14, Math.min(26, Math.floor(w * 0.11)));
  const doorH = Math.max(18, Math.min(30, Math.floor((h - roofH) * 0.45)));
  const doorX = x + w / 2 - doorW / 2;
  const doorY = y + h - doorH - 4;

  /* windows: a few generous ones, not a spreadsheet */
  const wallTop = y + roofH + 6;
  const winW = 16;
  const winH = 14;

  if (style.floors) {
    /* apartments: floor lines + tidy grid */
    ctx.fillStyle = darken(wall, 0.18);

    for (let fy = y + roofH + 26; fy < y + h - 16; fy += 30) {
      ctx.fillRect(x + 6, fy, w - 12, 2);
    }

    const cols = Math.min(6, Math.floor((w - 40) / 34));
    const totalW = cols * winW + (cols - 1) * 18;
    const startX = x + w / 2 - totalW / 2;

    ctx.fillStyle = b.locked ? "rgba(90,100,110,0.5)" : "#9fc4d8";

    for (let c = 0; c < cols; c++) {
      for (let wy = wallTop + 4; wy < y + h - doorH - 12; wy += 30) {
        const wx = startX + c * (winW + 18);
        ctx.fillRect(wx, wy, winW, winH);
        ctx.strokeStyle = "rgba(58,49,38,0.55)";
        ctx.lineWidth = 2;
        ctx.strokeRect(wx + 1, wy + 1, winW - 2, winH - 2);
      }
    }
  } else {
    /* one row of windows left and right of the door */
    const cols = Math.min(4, Math.max(2, Math.floor(w / 110) * 2));
    const slotW = (w - doorW - 24) / cols;

    ctx.fillStyle = b.locked ? "rgba(90,100,110,0.5)" : "#9fc4d8";

    for (let c = 0; c < cols; c++) {
      let wx = x + 12 + c * slotW + slotW / 2 - winW / 2;

      /* skip the door column */
      if (wx + winW > doorX - 6 && wx < doorX + doorW + 6) {
        continue;
      }

      const wy = doorY + Math.floor((doorH - winH) / 2) - 2;

      ctx.fillRect(wx, wy, winW, winH);
      ctx.strokeStyle = "rgba(58,49,38,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(wx + 1, wy + 1, winW - 2, winH - 2);

      /* window sill */
      ctx.fillStyle = darken(wall, 0.2);
      ctx.fillRect(wx - 2, wy + winH, winW + 4, 3);
      ctx.fillStyle = b.locked ? "rgba(90,100,110,0.5)" : "#9fc4d8";
    }
  }

  /* door on top of everything */
  ctx.fillStyle = b.locked ? "rgba(70,60,50,0.6)" : darken(roof, 0.35);
  roundRect(ctx, doorX, doorY, doorW, doorH, 4);
  ctx.fill();

  ctx.fillStyle = lighten(roof, 0.35);
  ctx.fillRect(doorX + doorW - 6, doorY + doorH / 2, 3, 3);

  /* awning over the door (shops) */
  if (style.awning && !b.locked) {
    const awW = Math.min(w - 20, doorW + 44);
    const awX = x + w / 2 - awW / 2;
    const awY = y + roofH + 2;

    for (let i = 0; i < awW; i += 10) {
      ctx.fillStyle = style.awning[(i / 10) % 2];
      const sw = Math.min(10, awW - i);
      ctx.fillRect(awX + i, awY, sw, 10);
      ctx.beginPath();
      ctx.arc(awX + i + sw / 2, awY + 10, sw / 2, 0, Math.PI);
      ctx.fill();
    }
  }

  /* vet / hospital cross */
  if (style.cross) {
    const cx = x + w - 26;
    const cy = y + 4 + roofH / 2;

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = b.locked ? mute(style.cross) : style.cross;
    ctx.fillRect(cx - 4, cy - 10, 8, 20);
    ctx.fillRect(cx - 10, cy - 4, 20, 8);
  }

  /* arena banner */
  if (style.banner) {
    ctx.fillStyle = b.locked ? "rgba(240,230,210,0.5)" : "#f6e8c8";
    ctx.fillRect(x + w / 2 - 24, y + 6, 48, roofH - 8);
    ctx.fillStyle = b.locked ? "rgba(150,90,70,0.5)" : "#c27755";
    ctx.fillRect(x + w / 2 - 24, y + 6, 48, 4);
  }

  /* locked lot: big question mark */
  if (style.question || b.locked) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `bold ${Math.floor(h * 0.35)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", x + w / 2, y + roofH + (h - roofH) / 2 - 4);
  }
}

/* ---------- fountain on the town plaza */

function paintFountain(ctx, offY) {
  const cx = 112 * TS;
  const cy = 266 * TS - offY;

  ctx.fillStyle = "rgba(20,30,15,0.2)";
  ctx.beginPath();
  ctx.arc(cx + 3, cy + 4, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b5a988";
  ctx.beginPath();
  ctx.arc(cx, cy, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9a8f70";
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6db3e8";
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();

  /* sparkle */
  ctx.fillStyle = "#a8d4f2";
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 12, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 16, cy + 8, 5, 0, Math.PI * 2);
  ctx.fill();

  /* center pillar */
  ctx.fillStyle = "#b5a988";
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d3c7a4";
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, 7, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- grid overlay (customizable zones only) */

function paintGrid(ctx, offY) {
  ctx.strokeStyle = "rgba(20,40,15,0.13)";
  ctx.lineWidth = 1;

  for (const area of GRID_AREAS) {
    const px0 = area.x * TS;
    const py0 = area.y * TS - offY;
    const px1 = (area.x + area.w) * TS;
    const py1 = (area.y + area.h) * TS - offY;

    ctx.beginPath();

    for (let gx = area.x; gx <= area.x + area.w; gx++) {
      ctx.moveTo(gx * TS + 0.5, py0);
      ctx.lineTo(gx * TS + 0.5, py1);
    }

    for (let gy = area.y; gy <= area.y + area.h; gy++) {
      ctx.moveTo(px0, gy * TS - offY + 0.5);
      ctx.lineTo(px1, gy * TS - offY + 0.5);
    }

    ctx.stroke();
  }
}

/*
==================================================
PUBLIC API
==================================================

Builds chunked canvas textures and returns their
keys + pixel offsets, ready to add as images.
==================================================
*/

export function buildWorldTextures(scene) {
  const CHUNK_TILES = 160;   // 160*16 = 2560px per chunk (< 4096 GPU limit)
  const chunks = [];

  for (let cy = 0; cy < WORLD.height; cy += CHUNK_TILES) {
    const tilesH = Math.min(CHUNK_TILES, WORLD.height - cy);
    const offY = cy * TS;

    const canvas = document.createElement("canvas");
    canvas.width = WORLD.width * TS;
    canvas.height = tilesH * TS;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const y0 = cy;
    const y1 = cy + tilesH;

    paintGround(ctx, 0, y0, WORLD.width, y1, offY);
    paintWater(ctx, 0, y0, WORLD.width, y1, offY);
    paintPathDetails(ctx, 0, y0, WORLD.width, y1, offY);
    paintRoadDetails(ctx, offY);
    paintGrid(ctx, offY);
    paintDecor(ctx, 0, Math.max(0, y0 - 2), WORLD.width, Math.min(WORLD.height, y1 + 2), offY);

    for (const b of BUILDINGS) {
      /* draw buildings that overlap this chunk */
      if (b.y + b.h >= y0 - 2 && b.y <= y1 + 2) {
        paintBuilding(ctx, b, offY);
      }
    }

    paintFountain(ctx, offY);

    const key = `worldmap-${cy}`;

    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }

    scene.textures.addCanvas(key, canvas);
    chunks.push({ key, y: offY });
  }

  return chunks;
}
