/*
==================================================
UI (Kairosoft-style, procedural pixel-art)
==================================================

All panels are drawn onto canvas textures with a
chunky "pixel unit" (P), thick warm outlines, a
paper-cream fill, bevel edges and colored title
bands - no image assets.

Components:
  createHud        top-left status panel
  DogCard          bottom info card (1-2 dogs)
  createBreedButton
  Toast            top-center announcements
==================================================
*/

import {
  GENE_KEYS,
  TRAIT_LABELS,
  STAT_KEYS,
  phenotype,
  coloration,
  colorationLabel,
  rarityTier,
  breedPreview,
  RARITY_TIERS,
  RARITY_COLORS,
  COLOR_DEFS
} from "./genetics.js";

/* pixel unit */
const P = 3;

export const UI_COLORS = {
  outline: "#2f2416",
  fill: "#f6e9c8",
  fillDark: "#eddcb4",
  bevelLight: "#fff8e2",
  bevelShadow: "#d9c49c",
  band: "#e0964a",
  bandDark: "#a86a2c",
  bandText: "#fff8e6",
  text: "#4a3826",
  dim: "#8a745a",
  button: "#e8a04a",
  buttonDark: "#b0702a",
  statColors: {
    agility: "#7fb069",
    charm: "#e08aa8",
    wits: "#7fa8d9",
    stamina: "#e0964a"
  },
  statEmpty: "#e0d0ac"
};

const STAT_SHORT = {
  agility: "AGI",
  charm: "CHA",
  wits: "WIT",
  stamina: "STA"
};

/* ---------- drawing helpers ---------- */

function fontPx(size) {
  return `bold ${size}px "Courier New", monospace`;
}

/*
Chunky panel with cut pixel corners, bevel and an
optional title band. Returns the band height.
*/
function drawPanel(ctx, x, y, w, h, opts = {}) {
  const o = UI_COLORS;

  /* outline (cut corners = pixel rounding) */
  ctx.fillStyle = opts.outline ?? o.outline;
  ctx.fillRect(x + P, y, w - 2 * P, h);
  ctx.fillRect(x, y + P, w, h - 2 * P);

  /* fill */
  ctx.fillStyle = opts.fill ?? o.fill;
  ctx.fillRect(x + 2 * P, y + P, w - 4 * P, h - 2 * P);
  ctx.fillRect(x + P, y + 2 * P, w - 2 * P, h - 4 * P);

  /* bevel */
  ctx.fillStyle = o.bevelLight;
  ctx.fillRect(x + 2 * P, y + P, w - 4 * P, P);
  ctx.fillRect(x + P, y + 2 * P, P, h - 4 * P);
  ctx.fillStyle = o.bevelShadow;
  ctx.fillRect(x + 2 * P, y + h - 2 * P, w - 4 * P, P);
  ctx.fillRect(x + w - 2 * P, y + 2 * P, P, h - 4 * P);

  /* title band */
  let bandH = 0;

  if (opts.title !== undefined) {
    bandH = 11 * P;

    ctx.fillStyle = opts.bandColor ?? o.band;
    ctx.fillRect(x + P, y + P, w - 2 * P, bandH);
    ctx.fillRect(x + 2 * P, y + P, w - 4 * P, bandH + P);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x + P, y + bandH, w - 2 * P, P);

    ctx.font = fontPx(6 * P);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillText(opts.title, x + 5 * P + 1, y + P + bandH / 2 + 2);
    ctx.fillStyle = o.bandText;
    ctx.fillText(opts.title, x + 5 * P, y + P + bandH / 2);
  }

  return bandH;
}

function drawHeart(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx - s * 0.22, cy - s * 0.12, s * 0.28, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.22, cy - s * 0.12, s * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.46, cy);
  ctx.lineTo(cx + s * 0.46, cy);
  ctx.lineTo(cx, cy + s * 0.52);
  ctx.closePath();
  ctx.fill();
}

function drawPaw(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.22, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
  for (const dx of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.arc(
      cx + dx * s,
      cy - s * 0.32 + Math.abs(dx) * s * 0.22,
      s * 0.18,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

function drawStar(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s : s * 0.44;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/* canvas texture management (create or replace) */
function makeCanvasTexture(scene, key, w, h) {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  return scene.textures.createCanvas(key, w, h);
}

function drawCoin(ctx, cx, cy, s) {
  ctx.fillStyle = "#a8741c";
  ctx.beginPath();
  ctx.arc(cx + 1, cy + 1, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8c153";
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6e2a0";
  ctx.beginPath();
  ctx.arc(cx - s * 0.25, cy - s * 0.25, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBowl(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, s, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - s, cy - s * 0.4, s * 2, s * 0.4);
  ctx.beginPath();
  ctx.arc(cx - s * 0.35, cy - s * 0.55, s * 0.3, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.3, cy - s * 0.6, s * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function drawDrop(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.25, s * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.5, cy + s * 0.1);
  ctx.lineTo(cx, cy - s * 0.8);
  ctx.closePath();
  ctx.fill();
}

function drawBook(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.fillRect(cx - s * 0.8, cy - s * 0.6, s * 1.6, s * 1.2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(cx - s * 0.08, cy - s * 0.6, s * 0.16, s * 1.2);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(cx - s * 0.6, cy - s * 0.35, s * 0.4, s * 0.12);
  ctx.fillRect(cx - s * 0.6, cy - s * 0.1, s * 0.4, s * 0.12);
  ctx.fillRect(cx + s * 0.2, cy - s * 0.35, s * 0.4, s * 0.12);
}

function drawSpeaker(ctx, cx, cy, s, color, on) {
  ctx.fillStyle = color;
  ctx.fillRect(cx - s * 0.8, cy - s * 0.3, s * 0.5, s * 0.6);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.15, cy - s * 0.75);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.75);
  ctx.lineTo(cx - s * 0.35, cy + s * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (on) {
    ctx.beginPath();
    ctx.arc(cx + s * 0.35, cy, s * 0.45, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * 0.35, cy, s * 0.8, -0.9, 0.9);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.35, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.95, cy + s * 0.4);
    ctx.moveTo(cx + s * 0.95, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.4);
    ctx.stroke();
  }
}

/* "!" bubble texture used above needy dogs */
export function ensureWarnTexture(scene) {
  if (scene.textures.exists("ui-warn")) {
    return;
  }

  const w = 22;
  const h = 26;
  const texture = scene.textures.createCanvas("ui-warn", w, h);
  const ctx = texture.context;

  ctx.fillStyle = UI_COLORS.outline;
  ctx.fillRect(2, 0, w - 4, h - 8);
  ctx.fillRect(0, 2, w, h - 12);
  ctx.fillStyle = "#f6e9c8";
  ctx.fillRect(3, 2, w - 6, h - 12);
  ctx.fillRect(2, 3, w - 4, h - 14);

  /* tail */
  ctx.fillStyle = UI_COLORS.outline;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 5, h - 9);
  ctx.lineTo(w / 2 + 5, h - 9);
  ctx.lineTo(w / 2, h - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f6e9c8";
  ctx.beginPath();
  ctx.moveTo(w / 2 - 3, h - 10);
  ctx.lineTo(w / 2 + 3, h - 10);
  ctx.lineTo(w / 2, h - 4);
  ctx.closePath();
  ctx.fill();

  /* exclamation mark */
  ctx.fillStyle = "#c9503c";
  ctx.fillRect(w / 2 - 2, 5, 4, 8);
  ctx.fillRect(w / 2 - 2, 15, 4, 4);

  texture.refresh();
}

/*
==================================================
TOOLBAR ICON BUTTON (small square, top-right)
==================================================
*/

export function createIconButton(scene, key, icon, onClick) {
  const s = 16 * P;

  function draw(state) {
    const texture = makeCanvasTexture(scene, key, s, s);
    const ctx = texture.context;

    drawPanel(ctx, 0, 0, s, s, {});

    const cx = s / 2;
    const cy = s / 2;

    if (icon === "book") {
      drawBook(ctx, cx, cy, 5.5 * P, UI_COLORS.band);
    } else if (icon === "sound") {
      drawSpeaker(ctx, cx, cy, 4.5 * P, UI_COLORS.text, state !== false);
    }

    texture.refresh();

    return texture;
  }

  draw(true);

  const image = scene.add.image(0, 0, key);

  image.setOrigin(1, 0).setDepth(10001).setScrollFactor(0);
  image.setInteractive({ useHandCursor: true });

  image.on("pointerdown", (p, lx, ly, event) => {
    if (event) event.stopPropagation();
  });

  image.on("pointerup", (p, lx, ly, event) => {
    if (event) event.stopPropagation();
    onClick();
  });

  image.redrawIcon = draw;

  return image;
}

/*
==================================================
HUD (top-left)
==================================================
*/

export function createHud(scene) {
  const w = 78 * P;
  const h = 38 * P;

  const texture = makeCanvasTexture(scene, "ui-hud", w, h);
  const image = scene.add.image(10, 10, "ui-hud");

  image.setOrigin(0, 0).setDepth(10000).setScrollFactor(0);

  let last = "";

  function update(info) {
    const stamp = JSON.stringify(info);

    if (stamp === last) {
      return;
    }

    last = stamp;

    const ctx = texture.context;

    ctx.clearRect(0, 0, w, h);
    drawPanel(ctx, 0, 0, w, h, { title: "FLUFFPARK" });

    ctx.font = fontPx(5 * P);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    drawPaw(ctx, 7 * P, 17.5 * P, 4 * P, UI_COLORS.band);
    ctx.fillStyle = UI_COLORS.text;
    ctx.fillText(`${info.dogs}`, 12 * P, 17.5 * P);

    drawCoin(ctx, 24 * P, 17.5 * P, 2.6 * P);
    ctx.fillStyle = UI_COLORS.text;
    ctx.fillText(`${info.coins}`, 29 * P, 17.5 * P);

    ctx.fillStyle = UI_COLORS.dim;
    ctx.fillText(`Day ${info.day}`, 52 * P, 17.5 * P);

    ctx.font = fontPx(4 * P);
    ctx.fillStyle = UI_COLORS.dim;
    ctx.fillText(
      `${info.tile}  x${info.zoom}`,
      4 * P,
      27 * P
    );

    texture.refresh();
  }

  update({ dogs: 0, coins: 0, day: 1, tile: "-", zoom: "-" });

  return { image, update };
}

/*
==================================================
DOG CARD (bottom info card, 1-2 dogs)
==================================================
*/

const CARD_COL_W = 88 * P;

function drawCareBar(ctx, x, y, value, color, iconFn) {
  iconFn(ctx, x + 2.5 * P, y + 3 * P, 2.6 * P, color);

  const barX = x + 6 * P;
  const barW = 15 * P;

  ctx.fillStyle = UI_COLORS.outline;
  ctx.fillRect(barX, y, barW + 2 * P, 6 * P);
  ctx.fillStyle = UI_COLORS.statEmpty;
  ctx.fillRect(barX + P, y + P, barW, 4 * P);

  const fillW = Math.round((barW * Math.max(0, value)) / 100);

  ctx.fillStyle = value < 25 ? "#c9503c" : color;

  if (fillW > 0) {
    ctx.fillRect(barX + P, y + P, fillW, 4 * P);
  }
}

/* returns interactive regions for this column */
function drawDogColumn(scene, ctx, x, y, dog, index, single) {
  const o = UI_COLORS;
  const genome = dog.genome;
  const pheno = phenotype(genome);
  const col = coloration(genome);
  const tier = rarityTier(genome);
  const regions = [];

  /* name band colored by rarity */
  const bandColor = RARITY_COLORS[tier];

  ctx.fillStyle = o.outline;
  ctx.fillRect(x, y, CARD_COL_W, 11 * P);
  ctx.fillStyle = bandColor;
  ctx.fillRect(x + P, y + P, CARD_COL_W - 2 * P, 9 * P);

  /* favorite star (toggle) at the left of the band */
  drawStar(
    ctx,
    x + 5 * P,
    y + 5.5 * P,
    3.4 * P,
    dog.favorite ? "#ffe066" : "rgba(0,0,0,0.25)"
  );

  regions.push({
    x, y, w: 10 * P, h: 11 * P,
    action: { type: "favorite", index }
  });

  ctx.font = fontPx(5.5 * P);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillText(genome.name.toUpperCase(), x + 10 * P + 1, y + 5.5 * P + 2);
  ctx.fillStyle = o.bandText;
  ctx.fillText(genome.name.toUpperCase(), x + 10 * P, y + 5.5 * P);

  regions.push({
    x: x + 10 * P, y, w: CARD_COL_W - 32 * P, h: 11 * P,
    action: { type: "rename", index }
  });

  /* rarity stars in the band */
  for (let i = 0; i < tier; i++) {
    drawStar(
      ctx,
      x + CARD_COL_W - (4 + i * 7) * P,
      y + 5.5 * P,
      3 * P,
      "#fff2b0"
    );
  }

  let cy = y + 14 * P;

  /* portrait box */
  const boxSize = 38 * P;

  ctx.fillStyle = o.outline;
  ctx.fillRect(x, cy, boxSize, boxSize);
  ctx.fillStyle = "#cfe0b8";
  ctx.fillRect(x + P, cy + P, boxSize - 2 * P, boxSize - 2 * P);
  ctx.fillStyle = "#bdd4a4";
  ctx.fillRect(x + P, cy + boxSize - 9 * P, boxSize - 2 * P, 8 * P);

  const sitKey = dog.textures.sit;

  if (scene.textures.exists(sitKey)) {
    const img = scene.textures.get(sitKey).getSourceImage();

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      img,
      x + boxSize / 2 - 48,
      cy + boxSize / 2 - 44,
      96,
      96
    );
  }

  /* right of portrait: gen, personality, coat swatches, parents */
  const rx = x + boxSize + 4 * P;

  ctx.font = fontPx(4.5 * P);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = o.text;
  ctx.fillText(`Gen ${genome.generation}`, rx, cy + P);
  ctx.fillStyle = o.dim;
  ctx.fillText(genome.personality, rx, cy + 7 * P);

  const channels = ["primary", "secondary", "marking"];

  for (let i = 0; i < channels.length; i++) {
    const id = col[channels[i]];
    const sy = cy + (13 + i * 7) * P;

    ctx.fillStyle = o.outline;
    ctx.fillRect(rx, sy, 5 * P, 5 * P);
    ctx.fillStyle = COLOR_DEFS[id].hex;
    ctx.fillRect(rx + P, sy + P, 3 * P, 3 * P);

    ctx.font = fontPx(4 * P);
    ctx.fillStyle = COLOR_DEFS[id].special ? RARITY_COLORS[1] : o.dim;
    ctx.fillText(COLOR_DEFS[id].name, rx + 7 * P, sy);
  }

  /* parents */
  ctx.font = fontPx(3.8 * P);
  ctx.fillStyle = o.dim;

  const parents = genome.parents?.names
    ? `${genome.parents.names[0]} × ${genome.parents.names[1]}`
    : "First generation";

  ctx.fillText(parents, rx, cy + 34 * P);

  cy += boxSize + 3 * P;

  /* traits */
  ctx.font = fontPx(4.2 * P);
  ctx.textBaseline = "top";
  ctx.fillStyle = o.text;
  ctx.fillText(
    `${TRAIT_LABELS.ears[pheno.ears]} · ${TRAIT_LABELS.tail[pheno.tail]}`,
    x,
    cy
  );
  ctx.fillStyle = o.dim;
  ctx.fillText(
    `${TRAIT_LABELS.pattern[pheno.pattern]} pattern`,
    x,
    cy + 6 * P
  );

  cy += 13 * P;

  /* care bars: hunger / cleanliness / mood */
  const care = dog.care ?? { hunger: 100, clean: 100, mood: 100 };

  drawCareBar(ctx, x, cy, care.hunger, "#e0964a", drawBowl);
  drawCareBar(ctx, x + 23 * P, cy, care.clean, "#7fa8d9", drawDrop);
  drawCareBar(ctx, x + 46 * P, cy, care.mood, "#e08aa8", drawHeart);

  cy += 9 * P;

  /* stat bars */
  for (const key of STAT_KEYS) {
    ctx.font = fontPx(4 * P);
    ctx.textBaseline = "middle";
    ctx.fillStyle = o.text;
    ctx.fillText(STAT_SHORT[key], x, cy + 2.5 * P);

    const value = genome.stats[key];

    for (let i = 0; i < 10; i++) {
      const bx = x + (13 + i * 7) * P;

      ctx.fillStyle = o.outline;
      ctx.fillRect(bx, cy, 6 * P, 5 * P);
      ctx.fillStyle =
        i < value ? o.statColors[key] : o.statEmpty;
      ctx.fillRect(bx + P, cy + P, 4 * P, 3 * P);
    }

    cy += 7.5 * P;
  }

  /* care action buttons (only when a single dog is selected) */
  if (single) {
    cy += 2 * P;

    const btnW = 40 * P;
    const btnH = 13 * P;

    const buttons = [
      { label: "FEED", icon: drawBowl, color: "#e0964a", type: "feed", bx: x },
      { label: "WASH", icon: drawDrop, color: "#7fa8d9", type: "wash", bx: x + btnW + 4 * P }
    ];

    for (const b of buttons) {
      ctx.fillStyle = "rgba(30,20,10,0.3)";
      ctx.fillRect(b.bx + P, cy + 2 * P, btnW, btnH - P);

      drawPanel(ctx, b.bx, cy, btnW, btnH, {
        fill: b.color,
        outline: o.outline
      });

      b.icon(ctx, b.bx + 7 * P, cy + btnH / 2, 3 * P, "#fff6ea");

      ctx.font = fontPx(5 * P);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillText(b.label, b.bx + 13 * P + 1, cy + btnH / 2 + 2);
      ctx.fillStyle = "#fff8e6";
      ctx.fillText(b.label, b.bx + 13 * P, cy + btnH / 2);

      regions.push({
        x: b.bx, y: cy, w: btnW, h: btnH,
        action: { type: b.type, index }
      });
    }
  }

  return regions;
}

export class DogCard {
  constructor(scene, onAction) {
    this.scene = scene;
    this.onAction = onAction;
    this.image = null;
    this.counter = 0;
    this.regions = [];
  }

  show(dogs, footer) {
    this.hide();

    const cols = dogs.length;
    const single = cols === 1;
    const pad = 4 * P;

    /* breed preview for a pair */
    let preview = null;

    if (cols === 2) {
      preview = breedPreview(dogs[0].genome, dogs[1].genome);
    }

    const colH = single ? 124 * P : 107 * P;

    let previewH = 0;

    if (preview) {
      const geneLines = GENE_KEYS.filter(
        (k) => preview.possible[k].length > 0
      ).length;

      previewH = (8 + geneLines * 5.5 + (preview.boosted ? 7 : 0)) * P;
    }

    const footerH = footer ? 9 * P : 2 * P;
    const w = cols * CARD_COL_W + (cols + 1) * pad;
    const h = colH + previewH + footerH + 8 * P;

    const key = `ui-card-${this.counter++}`;
    const texture = makeCanvasTexture(this.scene, key, w, h);
    const ctx = texture.context;

    drawPanel(ctx, 0, 0, w, h, {});

    this.regions = [];

    for (let i = 0; i < cols; i++) {
      const regions = drawDogColumn(
        this.scene,
        ctx,
        pad + i * (CARD_COL_W + pad),
        pad,
        dogs[i],
        i,
        single
      );

      this.regions.push(...regions);
    }

    /* breed preview block */
    if (preview) {
      let py = pad + colH + P;

      ctx.font = fontPx(4.5 * P);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = UI_COLORS.text;
      ctx.fillText("Possible puppy traits:", pad, py);

      py += 6.5 * P;
      ctx.font = fontPx(4 * P);

      const GENE_TITLES = {
        ears: "Ears", tail: "Tail", pattern: "Pattern", coat: "Coat"
      };

      for (const geneKey of GENE_KEYS) {
        const names = preview.possible[geneKey]
          .map((v) => TRAIT_LABELS[geneKey][v])
          .join(" / ");

        ctx.fillStyle = UI_COLORS.dim;
        ctx.fillText(`${GENE_TITLES[geneKey]}: ${names}`, pad + 2 * P, py);
        py += 5.5 * P;
      }

      if (preview.boosted) {
        drawStar(ctx, pad + 3 * P, py + 2.5 * P, 2.6 * P, RARITY_COLORS[3]);
        ctx.fillStyle = RARITY_COLORS[3];
        ctx.fillText(
          "Unstable coat! Mutation chance up",
          pad + 7 * P,
          py
        );
      }
    }

    if (footer) {
      ctx.font = fontPx(4.5 * P);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = UI_COLORS.dim;
      ctx.fillText(footer, w / 2, h - 6.5 * P);
    }

    texture.refresh();

    this.image = this.scene.add.image(0, 0, key);
    this.image.setOrigin(0.5, 1).setDepth(10000).setScrollFactor(0);

    /* swallow map input underneath + hit-test regions */
    this.image.setInteractive();

    this.image.on("pointerdown", (pointer, lx, ly, event) => {
      if (event) event.stopPropagation();
    });

    this.image.on("pointerup", (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();

      if (pointer.getDistance() > 12 || !this.onAction) {
        return;
      }

      for (const region of this.regions) {
        if (
          localX >= region.x && localX <= region.x + region.w &&
          localY >= region.y && localY <= region.y + region.h
        ) {
          this.onAction(region.action);
          return;
        }
      }
    });

    this.key = key;
    this.layout();
  }

  layout() {
    if (!this.image) {
      return;
    }

    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;

    const scale = Math.min(1, (sw - 16) / this.image.width);

    this.image.setScale(scale);
    this.image.x = sw / 2;
    this.image.y = sh - 8;
  }

  /* top-right corner in screen coordinates (for the close button) */
  topRight() {
    if (!this.image) {
      return null;
    }

    return {
      x: this.image.x + this.image.displayWidth / 2,
      y: this.image.y - this.image.displayHeight
    };
  }

  hide() {
    if (this.image) {
      this.image.destroy();
      this.image = null;
    }

    if (this.key && this.scene.textures.exists(this.key)) {
      this.scene.textures.remove(this.key);
      this.key = null;
    }
  }
}

/*
==================================================
BREED BUTTON
==================================================
*/

export function createBreedButton(scene, onClick) {
  const w = 54 * P;
  const h = 18 * P;

  const texture = makeCanvasTexture(scene, "ui-breed", w, h);
  const ctx = texture.context;

  /* shadow */
  ctx.fillStyle = "rgba(30,20,10,0.35)";
  ctx.fillRect(P, 2 * P, w - 2 * P, h - 2 * P);

  drawPanel(ctx, 0, 0, w, h - P, {
    fill: UI_COLORS.button,
    outline: UI_COLORS.outline
  });

  /* darker bottom edge = raised look */
  ctx.fillStyle = UI_COLORS.buttonDark;
  ctx.fillRect(2 * P, h - 4 * P, w - 4 * P, 2 * P);

  drawHeart(ctx, 9 * P, (h - P) / 2, 6 * P, "#fff2f2");

  ctx.font = fontPx(5.5 * P);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillText("BREED", 16 * P + 1, (h - P) / 2 + 2);
  ctx.fillStyle = "#fff8e6";
  ctx.fillText("BREED", 16 * P, (h - P) / 2);

  texture.refresh();

  const image = scene.add.image(0, 0, "ui-breed");

  image.setOrigin(0.5, 1).setDepth(10001).setScrollFactor(0);
  image.setInteractive({ useHandCursor: true });

  image.on("pointerdown", (pointer, lx, ly, event) => {
    image.y += P;
    if (event) event.stopPropagation();
  });

  image.on("pointerup", (pointer, lx, ly, event) => {
    image.y -= P;
    if (event) event.stopPropagation();
    onClick();
  });

  image.on("pointerout", () => {
    image.setY(image.baseY ?? image.y);
  });

  return image;
}

/*
==================================================
KENNEL BOOK (full-screen overlay)
==================================================

Roster of ALL dogs - in the park, ran away, or
waiting in the shelter. Tap a park dog to select
it, tap a shelter dog to pick it up.
==================================================
*/

const BOOK_COLS = 3;
const BOOK_ROWS = 2;
const TILE_W = 47 * P;
const TILE_H = 44 * P;

export class KennelBook {
  constructor(scene, handlers) {
    this.scene = scene;
    this.handlers = handlers;   // { getSitKey, onSelect, onPickup }
    this.page = 0;
    this.entries = [];
    this.backdrop = null;
    this.image = null;
    this.closeBtn = null;
    this.regions = [];
    this.counter = 0;
  }

  get isOpen() {
    return !!this.image;
  }

  open(entries) {
    this.entries = entries;
    this.page = Math.min(
      this.page,
      Math.max(0, Math.ceil(entries.length / (BOOK_COLS * BOOK_ROWS)) - 1)
    );

    if (!this.backdrop) {
      this.backdrop = this.scene.add.rectangle(
        0, 0, 10, 10, 0x201808, 0.5
      );
      this.backdrop.setOrigin(0, 0).setDepth(10005).setScrollFactor(0);
      this.backdrop.setInteractive();
      this.backdrop.on("pointerdown", (p, lx, ly, e) => e?.stopPropagation());
      this.backdrop.on("pointerup", (p, lx, ly, e) => e?.stopPropagation());
    }

    this.render();

    if (!this.closeBtn) {
      this.closeBtn = createCloseButton(this.scene, () => this.close());
      this.closeBtn.setDepth(10008);
    }

    this.closeBtn.setVisible(true);
    this.layout();
  }

  render() {
    const perPage = BOOK_COLS * BOOK_ROWS;
    const pages = Math.max(1, Math.ceil(this.entries.length / perPage));
    const pad = 4 * P;
    const w = BOOK_COLS * TILE_W + (BOOK_COLS + 1) * pad;
    const h = 13 * P + BOOK_ROWS * (TILE_H + pad) + 14 * P;

    const key = `ui-book-${this.counter++}`;
    const texture = makeCanvasTexture(this.scene, key, w, h);
    const ctx = texture.context;

    drawPanel(ctx, 0, 0, w, h, { title: "KENNEL BOOK" });

    this.regions = [];

    const start = this.page * perPage;
    const slice = this.entries.slice(start, start + perPage);

    slice.forEach((entry, i) => {
      const tx = pad + (i % BOOK_COLS) * (TILE_W + pad);
      const ty = 14 * P + Math.floor(i / BOOK_COLS) * (TILE_H + pad);

      this.drawTile(ctx, tx, ty, entry);

      this.regions.push({
        x: tx, y: ty, w: TILE_W, h: TILE_H,
        action: { type: "entry", entry }
      });
    });

    /* pager */
    const py = h - 11 * P;

    ctx.font = fontPx(4.5 * P);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = UI_COLORS.dim;
    ctx.fillText(`${this.page + 1} / ${pages}`, w / 2, py + 4 * P);

    if (pages > 1) {
      for (const [label, dx, action] of [
        ["<", w / 2 - 18 * P, "prev"],
        [">", w / 2 + 10 * P, "next"]
      ]) {
        drawPanel(ctx, dx, py, 8 * P, 8 * P, {
          fill: UI_COLORS.button
        });
        ctx.fillStyle = "#fff8e6";
        ctx.font = fontPx(5 * P);
        ctx.fillText(label, dx + 4 * P, py + 4 * P);

        this.regions.push({
          x: dx, y: py, w: 8 * P, h: 8 * P,
          action: { type: action }
        });
      }
    }

    texture.refresh();

    if (this.image) {
      const oldKey = this.key;
      this.image.setTexture(key);
      if (oldKey && this.scene.textures.exists(oldKey)) {
        this.scene.textures.remove(oldKey);
      }
    } else {
      this.image = this.scene.add.image(0, 0, key);
      this.image.setOrigin(0.5, 0.5).setDepth(10006).setScrollFactor(0);
      this.image.setInteractive();

      this.image.on("pointerdown", (p, lx, ly, e) => e?.stopPropagation());

      this.image.on("pointerup", (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (pointer.getDistance() > 12) {
          return;
        }

        for (const region of this.regions) {
          if (
            localX >= region.x && localX <= region.x + region.w &&
            localY >= region.y && localY <= region.y + region.h
          ) {
            this.handleAction(region.action);
            return;
          }
        }
      });
    }

    this.key = key;
  }

  drawTile(ctx, x, y, entry) {
    const o = UI_COLORS;
    const tier = rarityTier(entry.genome);

    ctx.fillStyle = o.outline;
    ctx.fillRect(x, y, TILE_W, TILE_H);
    ctx.fillStyle = entry.status === "park" ? o.fillDark : "#d8d2c0";
    ctx.fillRect(x + P, y + P, TILE_W - 2 * P, TILE_H - 2 * P);

    /* portrait */
    const sitKey = this.handlers.getSitKey(entry.genome);

    if (this.scene.textures.exists(sitKey)) {
      const img = this.scene.textures.get(sitKey).getSourceImage();

      ctx.imageSmoothingEnabled = false;

      if (entry.status !== "park") {
        ctx.globalAlpha = 0.55;
      }

      ctx.drawImage(img, x + TILE_W / 2 - 32, y + 2 * P, 64, 64);
      ctx.globalAlpha = 1;
    }

    /* favorite marker */
    if (entry.favorite) {
      drawStar(ctx, x + 5 * P, y + 5 * P, 3 * P, "#ffe066");
    }

    /* name */
    ctx.font = fontPx(4.2 * P);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = o.text;
    ctx.fillText(entry.genome.name, x + TILE_W / 2, y + 25 * P);

    /* rarity stars */
    for (let i = 0; i < tier; i++) {
      drawStar(
        ctx,
        x + TILE_W / 2 + (i - (tier - 1) / 2) * 6 * P,
        y + 32 * P,
        2.4 * P,
        RARITY_COLORS[tier]
      );
    }

    /* status line */
    ctx.font = fontPx(3.6 * P);

    if (entry.status === "park") {
      ctx.fillStyle = "#5b8f4a";
      ctx.fillText("In the park", x + TILE_W / 2, y + 37 * P);
    } else if (entry.status === "away") {
      ctx.fillStyle = "#c9503c";
      ctx.fillText(
        `Ran away! Shelter day ${entry.arriveDay}`,
        x + TILE_W / 2,
        y + 37 * P
      );
    } else {
      ctx.fillStyle = "#4a7fb5";
      ctx.fillText("Tap to pick up!", x + TILE_W / 2, y + 37 * P);
    }
  }

  handleAction(action) {
    if (action.type === "prev" && this.page > 0) {
      this.page--;
      this.render();
      this.layout();
    } else if (action.type === "next") {
      const perPage = BOOK_COLS * BOOK_ROWS;

      if ((this.page + 1) * perPage < this.entries.length) {
        this.page++;
        this.render();
        this.layout();
      }
    } else if (action.type === "entry") {
      const entry = action.entry;

      if (entry.status === "park") {
        this.close();
        this.handlers.onSelect(entry);
      } else if (entry.status === "shelter") {
        this.close();
        this.handlers.onPickup(entry);
      }
    }
  }

  layout() {
    if (!this.image) {
      return;
    }

    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;

    this.backdrop.setSize(sw, sh);

    const scale = Math.min(
      1,
      (sw - 16) / this.image.width,
      (sh - 16) / this.image.height
    );

    this.image.setScale(scale);
    this.image.x = sw / 2;
    this.image.y = sh / 2;

    if (this.closeBtn) {
      this.closeBtn.x =
        this.image.x + this.image.displayWidth / 2 - 4;
      this.closeBtn.y =
        this.image.y - this.image.displayHeight / 2 + 4;
    }
  }

  close() {
    if (this.image) {
      this.image.destroy();
      this.image = null;
    }

    if (this.key && this.scene.textures.exists(this.key)) {
      this.scene.textures.remove(this.key);
      this.key = null;
    }

    if (this.backdrop) {
      this.backdrop.destroy();
      this.backdrop = null;
    }

    if (this.closeBtn) {
      this.closeBtn.destroy();
      this.closeBtn = null;
    }
  }
}

/*
==================================================
CLOSE BUTTON (small square with an X)
==================================================
*/

export function createCloseButton(scene, onClick) {
  const s = 14 * P;

  if (scene.textures.exists("ui-close")) {
    return attachCloseHandlers(scene, onClick);
  }

  const texture = scene.textures.createCanvas("ui-close", s, s);
  const ctx = texture.context;

  drawPanel(ctx, 0, 0, s, s, {
    fill: "#c96a4a",
    outline: UI_COLORS.outline
  });

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(2 * P, s - 3 * P, s - 4 * P, P);

  /* pixel X */
  ctx.strokeStyle = "#fff2ea";
  ctx.lineWidth = 2 * P;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(4.5 * P, 4.5 * P);
  ctx.lineTo(s - 4.5 * P, s - 4.5 * P);
  ctx.moveTo(s - 4.5 * P, 4.5 * P);
  ctx.lineTo(4.5 * P, s - 4.5 * P);
  ctx.stroke();

  texture.refresh();

  return attachCloseHandlers(scene, onClick);
}

function attachCloseHandlers(scene, onClick) {
  const image = scene.add.image(0, 0, "ui-close");

  image.setOrigin(0.5, 0.5).setDepth(10002).setScrollFactor(0);
  image.setInteractive({ useHandCursor: true });

  image.on("pointerdown", (pointer, lx, ly, event) => {
    if (event) event.stopPropagation();
  });

  image.on("pointerup", (pointer, lx, ly, event) => {
    if (event) event.stopPropagation();
    onClick();
  });

  return image;
}

/*
==================================================
TOAST (top-center announcement)
==================================================
*/

export class Toast {
  constructor(scene) {
    this.scene = scene;
    this.image = null;
    this.timer = null;
    this.counter = 0;
  }

  show(title, lines, bandColor) {
    this.hide();

    const w = 120 * P;
    const h = (18 + lines.length * 6) * P;

    const key = `ui-toast-${this.counter++}`;
    const texture = makeCanvasTexture(this.scene, key, w, h);
    const ctx = texture.context;

    drawPanel(ctx, 0, 0, w, h, {
      title,
      bandColor: bandColor ?? UI_COLORS.band
    });

    ctx.font = fontPx(4.5 * P);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = UI_COLORS.text;

    lines.forEach((line, i) => {
      ctx.fillText(line, 5 * P, (15 + i * 6) * P);
    });

    texture.refresh();

    this.image = this.scene.add.image(0, 0, key);
    this.image.setOrigin(0.5, 0).setDepth(10002).setScrollFactor(0);

    /* tap to dismiss */
    this.image.setInteractive({ useHandCursor: true });

    this.image.on("pointerup", (pointer, lx, ly, event) => {
      if (event) event.stopPropagation();
      this.hide();
    });

    this.key = key;
    this.layout();

    this.timer = this.scene.time.delayedCall(5200, () => this.hide());
  }

  layout() {
    if (!this.image) {
      return;
    }

    const sw = this.scene.scale.width;
    const scale = Math.min(1, (sw - 16) / this.image.width);

    this.image.setScale(scale);
    this.image.x = sw / 2;
    this.image.y = 10;
  }

  hide() {
    if (this.timer) {
      this.timer.remove(false);
      this.timer = null;
    }

    if (this.image) {
      this.image.destroy();
      this.image = null;
    }

    if (this.key && this.scene.textures.exists(this.key)) {
      this.scene.textures.remove(this.key);
      this.key = null;
    }
  }
}
