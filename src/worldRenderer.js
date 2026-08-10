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
  GRID_AREAS,
  POI
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
  if (y < 78) return GROUND[T.GRASS];
  if (y < 210) return GROUND[T.FOREST_GRASS];
  if (y < 268) return GROUND[T.PARK_GRASS];
  if (y < 330) return GROUND[T.GRASS];
  return GROUND[T.RES_GRASS];
}

/* ---------- building styles */

const BUILDING_STYLES = {
  shopWarm:   { wall: "#f6e8cc", roof: "#e08a4a", awning: ["#e0743c", "#f8f2e4"], icon: "paw",     detail: "vent" },
  vet:        { wall: "#f6f3ea", roof: "#7fb0c9", awning: ["#7fb0c9", "#f0f6f8"], icon: "cross",   detail: "vent" },
  shopPink:   { wall: "#f8e9f0", roof: "#d585a8", awning: ["#cf6f98", "#faf1f5"], icon: "scissors", detail: "vent" },
  shopBrown:  { wall: "#f0dfc4", roof: "#a8764f", awning: ["#9c6a42", "#f4ead8"], icon: "heart",   detail: "vent" },
  trainer:    { wall: "#eceadb", roof: "#8aa864", awning: ["#7c9c54", "#f0eee0"], icon: "bone",    detail: "vent" },
  hotel:      { wall: "#f3e6cf", roof: "#c99a5f", awning: ["#bd8a4c", "#f6ecd9"], icon: "bed",     detail: "vent" },
  shopBlue:   { wall: "#e6eef0", roof: "#7fa3ad", awning: ["#6e96a1", "#f0f5f6"], icon: "paw",     detail: "vent" },
  shopPurple: { wall: "#ece6f2", roof: "#9b8ec4", awning: ["#8a7bb8", "#f3f0f8"], icon: "camera",  detail: "skylight" },
  home:       { wall: "#f6e9c9", roof: "#d98f52", icon: "heart", detail: "chimney" },
  house1:     { wall: "#eee2ca", roof: "#b96d4f", detail: "chimney" },
  house2:     { wall: "#e8d8c4", roof: "#8f9a5f", detail: "chimney" },
  house3:     { wall: "#f1e7d4", roof: "#7f97b5", detail: "chimney" },
  apartments: { wall: "#ded0b8", roof: "#8a8f9a", floors: true, detail: "ac" },
  arena:      { wall: "#ead9be", roof: "#c27755", banner: true, icon: "star", detail: "vent" },
  hospital:   { wall: "#f5f2e9", roof: "#d97f74", icon: "cross", detail: "ac" },
  town:       { wall: "#d4ccbc", roof: "#a09a90", detail: "ac" },
  shelter:    { wall: "#eef4ef", roof: "#7fb598", awning: ["#6ca887", "#f0f6f2"], icon: "paw", detail: "vent" },
  locked:     { wall: "#bcc0b3", roof: "#9aa08e", question: true }
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
  const roadTop = POI.mainStreet.y * TS - offY;
  const roadMid = roadTop + (POI.mainStreet.height / 2) * TS;

  ctx.fillStyle = "#e8d27b";

  for (let x = 0; x < WORLD.width * TS; x += 48) {
    ctx.fillRect(x, roadMid - 2, 24, 4);
  }

  /* crosswalk aligned with the plaza / main path */
  ctx.fillStyle = "rgba(240,240,235,0.55)";

  for (let x = POI.mainStreet.crosswalkX0 * TS; x < POI.mainStreet.crosswalkX1 * TS; x += 16) {
    ctx.fillRect(x, roadTop + 2 * TS + 8, 9, (POI.mainStreet.height - 4) * TS - 16);
  }

  /* next town road: muted dashes */
  const farRoadTop = POI.nextTownRoadY * TS - offY;
  ctx.fillStyle = "rgba(220,210,160,0.4)";

  for (let x = 6 * TS; x < (WORLD.width - 6) * TS; x += 48) {
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

/* small procedural sign icons */
function drawIcon(ctx, name, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (name === "paw") {
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.25, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
    for (const dx of [-0.55, 0, 0.55]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy - s * 0.38 + Math.abs(dx) * s * 0.25, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (name === "cross") {
    ctx.fillRect(cx - s * 0.18, cy - s * 0.5, s * 0.36, s);
    ctx.fillRect(cx - s * 0.5, cy - s * 0.18, s, s * 0.36);
  } else if (name === "heart") {
    ctx.beginPath();
    ctx.arc(cx - s * 0.22, cy - s * 0.15, s * 0.28, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.22, cy - s * 0.15, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.46, cy - s * 0.02);
    ctx.lineTo(cx + s * 0.46, cy - s * 0.02);
    ctx.lineTo(cx, cy + s * 0.52);
    ctx.closePath();
    ctx.fill();
  } else if (name === "bone") {
    ctx.fillRect(cx - s * 0.4, cy - s * 0.12, s * 0.8, s * 0.24);
    for (const dx of [-0.4, 0.4]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy - s * 0.14, s * 0.16, 0, Math.PI * 2);
      ctx.arc(cx + dx * s, cy + s * 0.14, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (name === "scissors") {
    ctx.lineWidth = Math.max(2, s * 0.14);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.4, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.45, cy + s * 0.3);
    ctx.moveTo(cx + s * 0.4, cy - s * 0.4);
    ctx.lineTo(cx - s * 0.45, cy + s * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - s * 0.45, cy + s * 0.42, s * 0.16, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.45, cy + s * 0.42, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (name === "bed") {
    ctx.fillRect(cx - s * 0.5, cy - s * 0.05, s, s * 0.35);
    ctx.fillRect(cx - s * 0.5, cy - s * 0.35, s * 0.3, s * 0.3);
    ctx.fillRect(cx - s * 0.55, cy - s * 0.1, s * 0.08, s * 0.5);
    ctx.fillRect(cx + s * 0.47, cy - s * 0.1, s * 0.08, s * 0.5);
  } else if (name === "camera") {
    ctx.fillRect(cx - s * 0.5, cy - s * 0.3, s, s * 0.65);
    ctx.fillRect(cx - s * 0.15, cy - s * 0.42, s * 0.3, s * 0.15);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy + 0.02 * s, s * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (name === "star") {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s * 0.55 : s * 0.24;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/*
Kairosoft-style building:

  - big roof PLANE on top (with eaves wider than
    the facade), inset trim, tile lines and a
    rooftop detail (chimney / AC / vent / skylight)
  - facade below with storefront windows, awning,
    door, icon sign and potted plants
*/
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

  const outline = b.locked ? "rgba(58,49,38,0.55)" : OUTLINE;
  const roofH = Math.floor(h * 0.52);
  const facadeX = x + 6;
  const facadeW = w - 12;
  const facadeY = y + roofH - 4;
  const facadeH = h - roofH + 4;

  /* ---- drop shadow */
  ctx.fillStyle = "rgba(20,30,15,0.28)";
  roundRect(ctx, x + 6, y + 8, w, h, 10);
  ctx.fill();

  /* ---- facade */
  ctx.fillStyle = wall;
  roundRect(ctx, facadeX, facadeY, facadeW, facadeH, 4);
  ctx.fill();

  /* base strip */
  ctx.fillStyle = darken(wall, 0.16);
  ctx.fillRect(facadeX, facadeY + facadeH - 6, facadeW, 6);

  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  roundRect(ctx, facadeX + 1.5, facadeY + 1.5, facadeW - 3, facadeH - 3, 3);
  ctx.stroke();

  /* ---- door */
  const doorW = Math.max(16, Math.min(28, Math.floor(facadeW * 0.14)));
  const doorH = Math.max(20, Math.floor(facadeH * 0.42));
  const doorX = x + w / 2 - doorW / 2;
  const doorY = facadeY + facadeH - doorH - 5;

  /* ---- windows (storefront, generous) */
  const winH = Math.max(14, Math.floor(facadeH * 0.28));
  const winW = Math.max(20, Math.floor(facadeW * 0.16));
  const winY = doorY + doorH - winH - 2;
  const glass = b.locked ? "rgba(90,100,110,0.5)" : "#aedbe8";
  const frame = darken(wall, 0.35);

  const slots = [
    x + w / 2 - doorW / 2 - 14 - winW,
    x + w / 2 + doorW / 2 + 14
  ];

  if (facadeW > 250) {
    slots.push(slots[0] - winW - 18);
    slots.push(slots[1] + winW + 18);
  }

  for (const wx of slots) {
    if (wx < facadeX + 8 || wx + winW > facadeX + facadeW - 8) {
      continue;
    }

    ctx.fillStyle = frame;
    ctx.fillRect(wx - 2, winY - 2, winW + 4, winH + 4);
    ctx.fillStyle = glass;
    ctx.fillRect(wx, winY, winW, winH);

    /* glass shine + mullion */
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(wx + 2, winY + 2, Math.floor(winW * 0.3), 3);
    ctx.fillStyle = frame;
    ctx.fillRect(wx + Math.floor(winW / 2) - 1, winY, 2, winH);

    /* sill */
    ctx.fillStyle = darken(wall, 0.22);
    ctx.fillRect(wx - 4, winY + winH + 2, winW + 8, 3);
  }

  /* apartments: two window rows, smaller */
  if (style.floors) {
    ctx.fillStyle = darken(wall, 0.2);
    ctx.fillRect(facadeX + 4, facadeY + Math.floor(facadeH * 0.5), facadeW - 8, 2);
  }

  /* ---- door drawing */
  ctx.fillStyle = frame;
  roundRect(ctx, doorX - 3, doorY - 3, doorW + 6, doorH + 3, 4);
  ctx.fill();

  ctx.fillStyle = b.locked ? "rgba(70,60,50,0.6)" : darken(roof, 0.25);
  roundRect(ctx, doorX, doorY, doorW, doorH, 3);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(doorX + 3, doorY + 3, doorW - 6, 4);
  ctx.fillStyle = lighten(roof, 0.4);
  ctx.fillRect(doorX + doorW - 6, doorY + Math.floor(doorH / 2), 3, 3);

  /* welcome mat */
  ctx.fillStyle = "rgba(60,45,30,0.3)";
  ctx.fillRect(doorX - 2, doorY + doorH, doorW + 4, 4);

  /* ---- potted plants beside the door (shops only) */
  if (style.awning && !b.locked && facadeW > 160) {
    for (const px of [doorX - 16, doorX + doorW + 8]) {
      ctx.fillStyle = "#a06a3c";
      ctx.fillRect(px, doorY + doorH - 10, 9, 8);
      ctx.fillStyle = "#4a7c3c";
      ctx.beginPath();
      ctx.arc(px + 4.5, doorY + doorH - 13, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5b8f4a";
      ctx.beginPath();
      ctx.arc(px + 3.5, doorY + doorH - 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---- awning across the storefront */
  if (style.awning && !b.locked) {
    const awW = Math.floor(facadeW * 0.82);
    const awX = x + w / 2 - awW / 2;
    const awY = facadeY + 4;
    const awH = 11;

    for (let i = 0, k = 0; i < awW; i += 12, k++) {
      const sw = Math.min(12, awW - i);
      ctx.fillStyle = style.awning[k % 2];
      ctx.fillRect(awX + i, awY, sw, awH);
      ctx.beginPath();
      ctx.arc(awX + i + sw / 2, awY + awH, sw / 2, 0, Math.PI);
      ctx.fill();
    }

    /* awning shadow */
    ctx.fillStyle = "rgba(40,30,20,0.15)";
    ctx.fillRect(awX, awY + awH + 6, awW, 4);
  }

  /* ---- sign plaque with icon */
  if (style.icon && !b.locked) {
    const signW = 30;
    const signH = 26;
    const signX = doorX + doorW + (style.awning ? 26 : 12);
    const signY = facadeY + 8;

    if (signX + signW < facadeX + facadeW - 6) {
      ctx.fillStyle = darken(roof, 0.3);
      roundRect(ctx, signX + 2, signY + 3, signW, signH, 5);
      ctx.fill();

      ctx.fillStyle = lighten(roof, 0.05);
      roundRect(ctx, signX, signY, signW, signH, 5);
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = outline;
      roundRect(ctx, signX + 1, signY + 1, signW - 2, signH - 2, 4);
      ctx.stroke();

      drawIcon(ctx, style.icon, signX + signW / 2, signY + signH / 2, 12, "#fdfaf2");
    }
  }

  /* ---- roof plane (painted last, over the facade top) */
  ctx.fillStyle = darken(roof, 0.32);
  roundRect(ctx, x - 3, y - 3, w + 6, roofH + 3, 9);
  ctx.fill();

  ctx.fillStyle = roof;
  roundRect(ctx, x, y, w, roofH, 8);
  ctx.fill();

  /* roof tile lines */
  ctx.fillStyle = darken(roof, 0.12);
  for (let ry = y + 12; ry < y + roofH - 8; ry += 11) {
    ctx.fillRect(x + 4, ry, w - 8, 2);
  }

  /* inset trim */
  ctx.lineWidth = 2;
  ctx.strokeStyle = lighten(roof, 0.28);
  roundRect(ctx, x + 5, y + 5, w - 10, roofH - 10, 5);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  roundRect(ctx, x - 1.5, y - 1.5, w + 3, roofH + 3, 9);
  ctx.stroke();

  /* eave shadow onto the facade */
  ctx.fillStyle = "rgba(30,25,15,0.25)";
  ctx.fillRect(facadeX + 2, y + roofH + 2, facadeW - 4, 5);

  /* ---- rooftop details */
  const detail = style.detail;

  if (detail === "chimney") {
    const chX = x + Math.floor(w * 0.72);
    ctx.fillStyle = darken(wall, 0.25);
    ctx.fillRect(chX, y + 8, 14, 18);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(chX + 1, y + 9, 12, 16);
    ctx.fillStyle = "rgba(30,20,10,0.7)";
    ctx.fillRect(chX + 3, y + 11, 8, 4);
  } else if (detail === "ac") {
    for (const dx of [0.2, 0.62]) {
      const acX = x + Math.floor(w * dx);
      ctx.fillStyle = "#b9b9b2";
      roundRect(ctx, acX, y + 10, 22, 15, 3);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      roundRect(ctx, acX + 1, y + 11, 20, 13, 3);
      ctx.stroke();
      ctx.fillStyle = "#8b8b85";
      ctx.beginPath();
      ctx.arc(acX + 8, y + 17.5, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (detail === "vent") {
    const vX = x + Math.floor(w * 0.16);
    ctx.fillStyle = "#b9b9b2";
    roundRect(ctx, vX, y + 9, 16, 11, 3);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    roundRect(ctx, vX + 1, y + 10, 14, 9, 3);
    ctx.stroke();
  } else if (detail === "skylight") {
    for (const dx of [0.2, 0.65]) {
      const sX = x + Math.floor(w * dx);
      ctx.fillStyle = "#aedbe8";
      roundRect(ctx, sX, y + 10, 20, 12, 3);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      roundRect(ctx, sX + 1, y + 11, 18, 10, 3);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(sX + 3, y + 12, 6, 3);
    }
  }

  /* arena banner across the roof */
  if (style.banner) {
    const bw = Math.floor(w * 0.5);
    const bx = x + w / 2 - bw / 2;
    ctx.fillStyle = b.locked ? "rgba(240,230,210,0.5)" : "#f6e8c8";
    roundRect(ctx, bx, y + 8, bw, roofH - 20, 4);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    roundRect(ctx, bx + 1, y + 9, bw - 2, roofH - 22, 4);
    ctx.stroke();
    ctx.fillStyle = b.locked ? "rgba(150,90,70,0.5)" : "#c27755";
    ctx.fillRect(bx, y + 8, bw, 5);
    if (!b.locked) {
      drawIcon(ctx, "star", x + w / 2, y + roofH / 2 - 2, 14, "#c27755");
    }
  }

  /* hospital / vet cross badge on the roof */
  if (style.icon === "cross") {
    const cx = x + w - 30;
    const cy = y + roofH / 2;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();
    drawIcon(ctx, "cross", cx, cy, 18, b.locked ? mute("#e05c5c") : "#e05c5c");
  }

  /* locked: question mark on the roof */
  if (style.question || b.locked) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `bold ${Math.floor(roofH * 0.55)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", x + w / 2, y + roofH / 2 + 2);
  }
}

/* ---------- fountain on the town plaza */

function paintFountain(ctx, offY) {
  const cx = POI.fountain.x * TS;
  const cy = POI.fountain.y * TS - offY;

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
