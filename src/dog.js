/*
==================================================
DOG
==================================================

Ein Hund im Park: hält sein Genom, seine Texturen
und ein kleines Verhaltens-Zustandsmodell
(laufen -> sitzen/liegen -> weiterlaufen).
==================================================
*/

import { phenotype, coloration } from "./genetics.js";
import { ensureDogTextures } from "./spriteCompositor.js";

const WALK_FRAME_MS = 130;

export class Dog {
  constructor(scene, container, genome, bounds, options = {}) {
    this.scene = scene;
    this.genome = genome;
    this.phenotype = phenotype(genome);
    this.coloration = coloration(genome);
    this.bounds = bounds;

    this.textures = ensureDogTextures(
      scene,
      this.phenotype,
      this.coloration
    );

    /* care (Nintendogs-style needs, 0-100) */
    this.care = options.care ?? {
      hunger: 85 + Math.random() * 15,
      clean: 85 + Math.random() * 15,
      mood: 85 + Math.random() * 15
    };

    this.favorite = options.favorite ?? false;
    this.zeroMoodDays = options.zeroMoodDays ?? 0;
    this.runawayWarned = false;

    this.state = "walk";
    this.stateTimer = this.randomWalkTime();
    this.frameIndex = 0;
    this.frameTimer = 0;

    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.speed = options.puppy ? 18 : 22 + Math.random() * 10;

    this.growth = options.puppy ? 0.5 : 1;

    const x = options.x ?? Phaser.Math.Between(bounds.minX, bounds.maxX);
    const y = options.y ?? Phaser.Math.Between(bounds.minY, bounds.maxY);

    this.selectionRing = scene.add.ellipse(
      x,
      y - 2,
      40,
      14,
      0xffffff,
      0
    );

    this.selectionRing.setStrokeStyle(2, 0xfff2b0, 0.9);
    this.selectionRing.setDepth(49);
    this.selectionRing.setVisible(false);

    this.sprite = scene.add.image(x, y, this.textures.walk[0]);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDepth(50);
    this.sprite.setScale(this.growth);
    this.sprite.setFlipX(this.direction === 1);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.dogRef = this;

    /* "!" bubble when the dog needs attention */
    this.warnBubble = scene.add.image(x, y - 36, "ui-warn");
    this.warnBubble.setOrigin(0.5, 1);
    this.warnBubble.setDepth(51);
    this.warnBubble.setVisible(false);

    container.add(this.selectionRing);
    container.add(this.sprite);
    container.add(this.warnBubble);

    if (options.puppy) {
      /* Welpe wächst in zwei Stufen heran */
      scene.time.delayedCall(15000, () => this.setGrowth(0.75));
      scene.time.delayedCall(30000, () => this.setGrowth(1));
    }
  }

  setGrowth(value) {
    this.growth = value;

    if (this.sprite) {
      this.sprite.setScale(value);
    }
  }

  setSelected(selected) {
    this.selectionRing.setVisible(selected);
  }

  randomWalkTime() {
    return 3000 + Math.random() * 5000;
  }

  randomRestTime() {
    return 2500 + Math.random() * 4000;
  }

  enterState(state) {
    this.state = state;

    if (state === "walk") {
      this.stateTimer = this.randomWalkTime();
      this.frameIndex = 0;
      this.sprite.setTexture(this.textures.walk[0]);
    } else if (state === "sit") {
      this.stateTimer = this.randomRestTime();
      this.sprite.setTexture(this.textures.sit);
    } else {
      this.stateTimer = this.randomRestTime() * 1.5;
      this.sprite.setTexture(this.textures.lie);
    }
  }

  /*
  Needs decay; dt is in in-game DAYS.
  A sad dog whose mood stays at zero long enough
  will run away (handled by the scene).
  */
  tickCare(dtDays) {
    const c = this.care;

    c.hunger = Math.max(0, c.hunger - 55 * dtDays);
    c.clean = Math.max(0, c.clean - 30 * dtDays);

    const strain =
      1 + (c.hunger < 30 ? 1 : 0) + (c.clean < 30 ? 1 : 0);

    if (c.hunger > 70 && c.clean > 70) {
      c.mood = Math.min(100, c.mood + 14 * dtDays);
    } else {
      c.mood = Math.max(0, c.mood - 38 * dtDays * strain);
    }

    if (c.mood <= 0) {
      this.zeroMoodDays += dtDays;
    } else {
      this.zeroMoodDays = 0;
      this.runawayWarned = false;
    }

    this.warnBubble.setVisible(this.needsAttention());
  }

  needsAttention() {
    const c = this.care;

    return c.hunger < 25 || c.clean < 25 || c.mood < 20;
  }

  feed() {
    this.care.hunger = 100;
    this.care.mood = Math.min(100, this.care.mood + 12);
    this.warnBubble.setVisible(this.needsAttention());
  }

  wash() {
    this.care.clean = 100;
    this.care.mood = Math.min(100, this.care.mood + 12);
    this.warnBubble.setVisible(this.needsAttention());
  }

  update(delta) {
    this.stateTimer -= delta;

    if (this.stateTimer <= 0) {
      if (this.state === "walk") {
        this.enterState(Math.random() < 0.3 ? "lie" : "sit");
      } else {
        /* sad dogs rest more instead of playing */
        const restAgain =
          this.care.mood < 35 && Math.random() < 0.6;

        this.enterState(restAgain ? "lie" : "walk");
      }
    }

    if (this.state !== "walk") {
      this.syncRing();
      return;
    }

    /* Bewegung */
    const seconds = delta / 1000;

    this.sprite.x += this.speed * this.direction * seconds;

    if (this.sprite.x >= this.bounds.maxX) {
      this.sprite.x = this.bounds.maxX;
      this.direction = -1;
      this.sprite.setFlipX(false);
    }

    if (this.sprite.x <= this.bounds.minX) {
      this.sprite.x = this.bounds.minX;
      this.direction = 1;
      this.sprite.setFlipX(true);
    }

    /* Lauf-Animation */
    this.frameTimer += delta;

    if (this.frameTimer >= WALK_FRAME_MS) {
      this.frameTimer -= WALK_FRAME_MS;

      this.frameIndex =
        (this.frameIndex + 1) % this.textures.walk.length;

      this.sprite.setTexture(
        this.textures.walk[this.frameIndex]
      );
    }

    this.syncRing();
  }

  syncRing() {
    this.selectionRing.x = this.sprite.x;
    this.selectionRing.y = this.sprite.y - 2;
    this.warnBubble.x = this.sprite.x + 10;
    this.warnBubble.y =
      this.sprite.y - 34 - Math.sin(this.scene.time.now / 180) * 2;
  }

  destroy() {
    this.sprite?.destroy();
    this.selectionRing?.destroy();
    this.warnBubble?.destroy();
    this.sprite = null;
  }
}
