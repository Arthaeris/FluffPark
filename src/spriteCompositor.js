/*
==================================================
SPRITE-COMPOSITOR
==================================================

Setzt einen Hund aus ASCII-Teilen zusammen:

  1. Körper (Pose/Frame)
  2. Muster-Maske (recolort nur B-Pixel zu C/M)
  3. Schweif-Layer (mit Pose-Offset)
  4. Ohren-Layer (mit Pose-Offset)
  5. automatische Außenkontur um die Silhouette

Dadurch sieht jede Kombination aus Ohren, Schweif,
Muster und Palette wie ein handgezeichneter Sprite
aus - ohne dass jede Kombination einzeln gepixelt
werden muss.
==================================================
*/

import {
  SPRITE_SIZE,
  WALK_RAISED,
  OFFSETS,
  BODY_WALK,
  BODY_SIT,
  BODY_LIE,
  EARS,
  TAILS,
  MASKS
} from "./sprites/shibaParts.js";

import { COLOR_DEFS } from "./genetics.js";

/*
==================================================
DYNAMIC PALETTES
==================================================

The palette is built from the dog's coloration
(primary / secondary / marking color ids), so any
mutation color combination renders correctly:

  B = primary          S = shaded primary
  D = far-leg shade    C = secondary
  M = marking          O/E/N = outline (derived
                       from a darkened primary)
==================================================
*/

function mixHex(hex, target, amount) {
  const c = parseInt(hex.slice(1), 16);
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  const tr = (target >> 16) & 255;
  const tg = (target >> 8) & 255;
  const tb = target & 255;
  const mix = (a, t) => Math.round(a + (t - a) * amount);

  return (
    "#" +
    ((1 << 24) | (mix(r, tr) << 16) | (mix(g, tg) << 8) | mix(b, tb))
      .toString(16)
      .slice(1)
  );
}

const paletteCache = new Map();

export function buildPalette(col) {
  const key = `${col.primary}|${col.secondary}|${col.marking}`;

  if (paletteCache.has(key)) {
    return paletteCache.get(key);
  }

  const base = COLOR_DEFS[col.primary].hex;

  /* warm near-black outline, tinted by the base coat */
  const outline = mixHex(mixHex(base, 0x1e130c, 0.78), 0x000000, 0.1);

  const palette = {
    B: base,
    S: mixHex(base, 0x000000, 0.14),
    D: mixHex(base, 0x000000, 0.3),
    C: COLOR_DEFS[col.secondary].hex,
    M: COLOR_DEFS[col.marking].hex,
    O: outline,
    E: outline,
    N: outline
  };

  paletteCache.set(key, palette);

  return palette;
}

const FILL = new Set(["O", "B", "C", "M", "E", "N", "D", "S"]);

export function emptyGrid() {
  return Array.from(
    { length: SPRITE_SIZE },
    () => new Array(SPRITE_SIZE).fill(".")
  );
}

export function gridFromRows(rows) {
  const g = emptyGrid();

  for (let y = 0; y < SPRITE_SIZE; y++) {
    const row = rows[y] ?? "";

    for (let x = 0; x < SPRITE_SIZE; x++) {
      g[y][x] = row[x] ?? ".";
    }
  }

  return g;
}

/* Teil auf Grid stempeln (nur Nicht-Punkte), mit Offset */
export function stamp(dst, rows, dx = 0, dy = 0) {
  for (let y = 0; y < SPRITE_SIZE; y++) {
    const row = rows[y] ?? "";

    for (let x = 0; x < SPRITE_SIZE; x++) {
      const ch = row[x] ?? ".";

      if (ch === ".") {
        continue;
      }

      const tx = x + dx;
      const ty = y + dy;

      if (
        tx >= 0 && tx < SPRITE_SIZE &&
        ty >= 0 && ty < SPRITE_SIZE
      ) {
        dst[ty][tx] = ch;
      }
    }
  }
}

/* Muster-Maske: C/M ersetzen ausschließlich B-Pixel */
function applyMask(dst, rows, dx = 0, dy = 0) {
  for (let y = 0; y < SPRITE_SIZE; y++) {
    const row = rows[y] ?? "";

    for (let x = 0; x < SPRITE_SIZE; x++) {
      const ch = row[x] ?? ".";

      if (ch !== "C" && ch !== "M") {
        continue;
      }

      const tx = x + dx;
      const ty = y + dy;

      if (
        tx >= 0 && tx < SPRITE_SIZE &&
        ty >= 0 && ty < SPRITE_SIZE &&
        dst[ty][tx] === "B"
      ) {
        dst[ty][tx] = ch;
      }
    }
  }
}

/* Automatische Außenkontur um die fertige Silhouette */
export function outline(g) {
  const out = g.map((row) => row.slice());

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (g[y][x] !== ".") {
        continue;
      }

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (
          nx >= 0 && nx < SPRITE_SIZE &&
          ny >= 0 && ny < SPRITE_SIZE &&
          FILL.has(g[ny][nx])
        ) {
          out[y][x] = "O";
          break;
        }
      }
    }
  }

  return out;
}

/*
Kompletten Hund als Zeichen-Grid zusammensetzen.

phenotype: { ears, tail, pattern, coat }
pose:      "walk" | "sit" | "lie"
frame:     Walk-Frame-Index (0-3), sonst 0
*/
export function composeGrid(phenotype, pose, frame = 0) {
  let bodyRows;
  let offsetKey;
  let maskKey;
  let maskDy = 0;

  if (pose === "walk") {
    bodyRows = BODY_WALK[frame % BODY_WALK.length];
    offsetKey = WALK_RAISED[frame % BODY_WALK.length]
      ? "walk_up"
      : "walk";
    maskKey = "walk";
    maskDy = WALK_RAISED[frame % BODY_WALK.length] ? -1 : 0;
  } else if (pose === "sit") {
    bodyRows = BODY_SIT;
    offsetKey = "sit";
    maskKey = "sit";
  } else {
    bodyRows = BODY_LIE;
    offsetKey = "lie";
    maskKey = "lie";
  }

  const g = emptyGrid();

  stamp(g, bodyRows);

  applyMask(
    g,
    MASKS[maskKey][phenotype.pattern],
    0,
    maskDy
  );

  const tailOffset = OFFSETS[offsetKey].tail;
  const earsOffset = OFFSETS[offsetKey].ears;

  stamp(
    g,
    TAILS[phenotype.tail],
    tailOffset[0],
    tailOffset[1]
  );

  stamp(
    g,
    EARS[phenotype.ears],
    earsOffset[0],
    earsOffset[1]
  );

  return outline(g);
}

/* Grid auf ein Canvas malen */
export function gridToCanvas(grid, palette) {
  const canvas = document.createElement("canvas");

  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;

  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const ch = grid[y][x];

      if (ch === ".") {
        continue;
      }

      ctx.fillStyle = palette[ch] ?? "#ff00ff";
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas;
}

/*
Eindeutiger Textur-Schlüssel für Phänotyp +
Färbung in einer bestimmten Pose.
*/
export function textureKey(phenotype, col, pose, frame = 0) {
  return [
    "dog",
    col.primary,
    col.secondary,
    col.marking,
    phenotype.ears,
    phenotype.tail,
    phenotype.pattern,
    pose,
    frame
  ].join("|");
}

/*
Stellt sicher, dass alle Texturen (4 Walk-Frames,
Sitzen, Liegen) für Phänotyp + Färbung existieren.
Gibt die Schlüssel zurück.
*/
export function ensureDogTextures(scene, phenotype, col) {
  const palette = buildPalette(col);

  const keys = {
    walk: [],
    sit: null,
    lie: null
  };

  for (let f = 0; f < BODY_WALK.length; f++) {
    const key = textureKey(phenotype, col, "walk", f);

    if (!scene.textures.exists(key)) {
      scene.textures.addCanvas(
        key,
        gridToCanvas(
          composeGrid(phenotype, "walk", f),
          palette
        )
      );
    }

    keys.walk.push(key);
  }

  for (const pose of ["sit", "lie"]) {
    const key = textureKey(phenotype, col, pose);

    if (!scene.textures.exists(key)) {
      scene.textures.addCanvas(
        key,
        gridToCanvas(
          composeGrid(phenotype, pose),
          palette
        )
      );
    }

    keys[pose] = key;
  }

  return keys;
}
