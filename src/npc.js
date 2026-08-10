/*
==================================================
NPC (human visitors)
==================================================

Humans are built exactly like the dogs: ASCII
layers (body + hair) composed at runtime with an
auto-outline, recolored through channel palettes:

  K skin   H hair   T shirt/dress
  L pants  Q shoes  E eye

No breeding - appearance is generated once per
NPC. Some NPCs are "regulars" that come back.

NPCs stroll along NPC_ROUTES and occasionally
drop coins for the player.
==================================================
*/

import {
  HUMAN_BODY,
  HUMAN_HAIRS,
  HUMAN_RAISED,
  SKIN_TONES,
  HAIR_COLORS,
  SHIRT_COLORS,
  PANTS_COLORS,
  SHOE_COLORS
} from "./sprites/humanParts.js";

import {
  emptyGrid,
  stamp,
  outline,
  gridToCanvas
} from "./spriteCompositor.js";

import { WORLD, NPC_ROUTES } from "./data.js";
import { randomNpcName } from "./names.js";

const WALK_FRAME_MS = 140;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/* ---------- appearance ---------- */

export function randomAppearance() {
  return {
    body: Math.random() < 0.5 ? "suit" : "dress",
    hair: pick(Object.keys(HUMAN_HAIRS)),
    skin: pick(SKIN_TONES),
    hairColor: pick(HAIR_COLORS),
    shirt: pick(SHIRT_COLORS),
    pants: pick(PANTS_COLORS),
    shoes: pick(SHOE_COLORS)
  };
}

function appearanceKey(a) {
  return [
    "npc", a.body, a.hair,
    a.skin, a.hairColor, a.shirt, a.pants, a.shoes
  ].join("|");
}

function humanPalette(a) {
  return {
    K: a.skin,
    H: a.hairColor,
    T: a.shirt,
    L: a.pants,
    Q: a.shoes,
    O: "#2b2018",
    E: "#20160e"
  };
}

/* human grid: body frame + hair, then auto-outline */
function composeHuman(a, frame) {
  const g = emptyGrid();

  stamp(g, HUMAN_BODY[a.body][frame]);

  stamp(
    g,
    HUMAN_HAIRS[a.hair],
    0,
    HUMAN_RAISED[frame] ? -1 : 0
  );

  return outline(g);
}

export function ensureHumanTextures(scene, a) {
  const keys = [];

  for (let f = 0; f < 4; f++) {
    const key = `${appearanceKey(a)}|${f}`;

    if (!scene.textures.exists(key)) {
      scene.textures.addCanvas(
        key,
        gridToCanvas(composeHuman(a, f), humanPalette(a))
      );
    }

    keys.push(key);
  }

  return keys;
}

/*
==================================================
NPC actor
==================================================
*/

export class Npc {
  constructor(scene, container, identity, onCoin) {
    this.scene = scene;
    this.identity = identity;   // { name, appearance, regular }
    this.onCoin = onCoin;

    this.textures = ensureHumanTextures(scene, identity.appearance);

    /* pick a stroll route; sometimes walk it backwards */
    const route = pick(NPC_ROUTES).map((p) => ({
      x: p[0] * WORLD.tileSize,
      y: p[1] * WORLD.tileSize
    }));

    this.points = Math.random() < 0.5 ? route : route.slice().reverse();
    this.segment = 0;

    this.speed = 24 + Math.random() * 12;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.pauseTimer = 0;
    this.coinTimer = 12000 + Math.random() * 25000;
    this.done = false;

    const start = this.points[0];

    this.sprite = scene.add.image(start.x, start.y, this.textures[0]);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDepth(49);

    container.add(this.sprite);
  }

  update(delta) {
    if (this.done) {
      return;
    }

    /* short window-shopping pauses */
    if (this.pauseTimer > 0) {
      this.pauseTimer -= delta;
      return;
    }

    const target = this.points[this.segment + 1];

    if (!target) {
      this.despawn();
      return;
    }

    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const step = (this.speed * delta) / 1000;

    if (dist <= step) {
      this.sprite.x = target.x;
      this.sprite.y = target.y;
      this.segment++;

      if (Math.random() < 0.35) {
        this.pauseTimer = 1200 + Math.random() * 2600;
      }
    } else {
      this.sprite.x += (dx / dist) * step;
      this.sprite.y += (dy / dist) * step;

      if (Math.abs(dx) > 2) {
        /* sprite faces left natively */
        this.sprite.setFlipX(dx > 0);
      }
    }

    /* walk animation */
    this.frameTimer += delta;

    if (this.frameTimer >= WALK_FRAME_MS) {
      this.frameTimer -= WALK_FRAME_MS;
      this.frameIndex = (this.frameIndex + 1) % 4;
      this.sprite.setTexture(this.textures[this.frameIndex]);
    }

    /* coin drops */
    this.coinTimer -= delta;

    if (this.coinTimer <= 0) {
      this.coinTimer = 18000 + Math.random() * 30000;

      if (this.onCoin) {
        this.onCoin(this.sprite.x, this.sprite.y, 1 + Math.floor(Math.random() * 3));
      }
    }
  }

  despawn() {
    this.done = true;

    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}

/*
==================================================
Spawner: keeps a handful of visitors around.
Regulars (persistent identities) come back now
and then; the rest are one-off strangers.
==================================================
*/

export class NpcSpawner {
  constructor(scene, container, regulars, onCoin) {
    this.scene = scene;
    this.container = container;
    this.regulars = regulars;   // persistent identity list
    this.onCoin = onCoin;

    this.npcs = [];
    this.spawnTimer = 1000;
    this.maxNpcs = 5;
  }

  update(delta) {
    for (const npc of this.npcs) {
      npc.update(delta);
    }

    this.npcs = this.npcs.filter((n) => !n.done);

    this.spawnTimer -= delta;

    if (this.spawnTimer <= 0) {
      this.spawnTimer = 6000 + Math.random() * 9000;

      if (this.npcs.length < this.maxNpcs) {
        this.spawn();
      }
    }
  }

  spawn() {
    let identity;

    if (this.regulars.length > 0 && Math.random() < 0.35) {
      identity = this.regulars[
        Math.floor(Math.random() * this.regulars.length)
      ];
    } else {
      identity = {
        name: randomNpcName(),
        appearance: randomAppearance(),
        regular: false
      };
    }

    this.npcs.push(
      new Npc(this.scene, this.container, identity, this.onCoin)
    );
  }
}
