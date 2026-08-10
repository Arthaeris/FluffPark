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

/*
==================================================
HUD (top-left)
==================================================
*/

export function createHud(scene) {
  const w = 74 * P;
  const h = 30 * P;

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

    drawPaw(ctx, 7 * P, 17.5 * P, 4 * P, UI_COLORS.band);

    ctx.font = fontPx(5 * P);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = UI_COLORS.text;
    ctx.fillText(`Dogs: ${info.dogs}`, 12 * P, 17.5 * P);

    ctx.font = fontPx(4 * P);
    ctx.fillStyle = UI_COLORS.dim;
    ctx.fillText(
      `${info.tile}  x${info.zoom}`,
      4 * P,
      24.5 * P
    );

    texture.refresh();
  }

  update({ dogs: 0, tile: "-", zoom: "-" });

  return { image, update };
}

/*
==================================================
DOG CARD (bottom info card, 1-2 dogs)
==================================================
*/

const CARD_COL_W = 88 * P;
const CARD_COL_H = 102 * P;

function drawDogColumn(scene, ctx, x, y, dog) {
  const o = UI_COLORS;
  const genome = dog.genome;
  const pheno = phenotype(genome);
  const col = coloration(genome);
  const tier = rarityTier(genome);

  /* name band colored by rarity */
  const bandColor = RARITY_COLORS[tier];

  ctx.fillStyle = o.outline;
  ctx.fillRect(x, y, CARD_COL_W, 11 * P);
  ctx.fillStyle = bandColor;
  ctx.fillRect(x + P, y + P, CARD_COL_W - 2 * P, 9 * P);

  ctx.font = fontPx(5.5 * P);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillText(genome.name.toUpperCase(), x + 3 * P + 1, y + 5.5 * P + 2);
  ctx.fillStyle = o.bandText;
  ctx.fillText(genome.name.toUpperCase(), x + 3 * P, y + 5.5 * P);

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

  /* right of portrait: personality, gen, coat swatches */
  const rx = x + boxSize + 4 * P;

  ctx.font = fontPx(4.5 * P);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = o.text;
  ctx.fillText(`Gen ${genome.generation}`, rx, cy + P);
  ctx.fillStyle = o.dim;
  ctx.fillText(genome.personality, rx, cy + 7 * P);

  /* coat color swatches */
  const channels = ["primary", "secondary", "marking"];

  for (let i = 0; i < channels.length; i++) {
    const id = col[channels[i]];
    const sy = cy + (14 + i * 8) * P;

    ctx.fillStyle = o.outline;
    ctx.fillRect(rx, sy, 6 * P, 6 * P);
    ctx.fillStyle = COLOR_DEFS[id].hex;
    ctx.fillRect(rx + P, sy + P, 4 * P, 4 * P);

    ctx.font = fontPx(4 * P);
    ctx.fillStyle = COLOR_DEFS[id].special ? RARITY_COLORS[1] : o.dim;
    ctx.fillText(COLOR_DEFS[id].name, rx + 8 * P, sy + P);
  }

  cy += boxSize + 3 * P;

  /* traits */
  ctx.font = fontPx(4.2 * P);
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

    cy += 8 * P;
  }
}

export class DogCard {
  constructor(scene) {
    this.scene = scene;
    this.image = null;
    this.counter = 0;
  }

  show(dogs, footer) {
    this.hide();

    const cols = dogs.length;
    const pad = 4 * P;
    const footerH = footer ? 10 * P : 2 * P;
    const w = cols * CARD_COL_W + (cols + 1) * pad;
    const h = CARD_COL_H + footerH + 6 * P;

    const key = `ui-card-${this.counter++}`;
    const texture = makeCanvasTexture(this.scene, key, w, h);
    const ctx = texture.context;

    drawPanel(ctx, 0, 0, w, h, {});

    for (let i = 0; i < cols; i++) {
      drawDogColumn(
        this.scene,
        ctx,
        pad + i * (CARD_COL_W + pad),
        pad,
        dogs[i]
      );
    }

    if (footer) {
      ctx.font = fontPx(4.5 * P);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = UI_COLORS.dim;
      ctx.fillText(footer, w / 2, h - 7 * P);
    }

    texture.refresh();

    this.image = this.scene.add.image(0, 0, key);
    this.image.setOrigin(0.5, 1).setDepth(10000).setScrollFactor(0);

    /* swallow map input underneath the card */
    this.image.setInteractive();

    this.image.on("pointerdown", (pointer, lx, ly, event) => {
      if (event) event.stopPropagation();
    });

    this.image.on("pointerup", (pointer, lx, ly, event) => {
      if (event) event.stopPropagation();
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
CLOSE BUTTON (small square with an X)
==================================================
*/

export function createCloseButton(scene, onClick) {
  const s = 14 * P;

  const texture = makeCanvasTexture(scene, "ui-close", s, s);
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
