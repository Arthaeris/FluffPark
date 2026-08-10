import {
  WORLD,
  MAP_LABELS,
  getTileType
} from "./data.js";

import { buildWorldTextures } from "./worldRenderer.js";

import {
  randomGenome,
  breed,
  describe,
  rarityTier,
  phenotype,
  coloration,
  RARITY_TIERS,
  RARITY_COLORS,
  colorationLabel
} from "./genetics.js";

import { Dog } from "./dog.js";
import { NpcSpawner, randomAppearance } from "./npc.js";
import { ensureDogTextures } from "./spriteCompositor.js";
import { sfx, unlockAudio, setMuted, isMuted } from "./audio.js";
import { loadGame, makeSaver } from "./save.js";
import { randomNpcName } from "./names.js";

import {
  createHud,
  createBreedButton,
  createCloseButton,
  createIconButton,
  ensureWarnTexture,
  DogCard,
  KennelBook,
  Toast
} from "./ui.js";

const MAX_SCALE = 3;

const STARTER_DOG_COUNT = 6;

/* one in-game day in real milliseconds */
const DAY_MS = 180000;

/* runaway thresholds (in in-game days at zero mood) */
const RUNAWAY_WARN_DAYS = 0.4;
const RUNAWAY_DAYS = 1.2;
const SHELTER_TRAVEL_DAYS = 2;

/* Starter Park roaming area (tile coordinates) */
const PARK_BOUNDS_TILES = {
  minX: 44,
  maxX: 112,
  minY: 228,
  maxY: 250
};

class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");

    this.worldContainer = null;
    this.hud = null;
    this.dogCard = null;
    this.breedButton = null;
    this.toast = null;
    this.lastTileInfo = null;

    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this.pinchActive = false;
    this.pinchStartDistance = 0;
    this.pinchStartScale = 1;

    this.pinchScreenX = 0;
    this.pinchScreenY = 0;
    this.pinchLocalX = 0;
    this.pinchLocalY = 0;

    this.worldPixelWidth = 0;
    this.worldPixelHeight = 0;

    this.dogs = [];
    this.selectedDogs = [];

    /* community & economy */
    this.away = [];          // ran away / waiting in the shelter
    this.coins = 100;
    this.clockMs = 0;
    this.nextDogId = 1;
    this.regulars = [];
    this.npcSpawner = null;
    this.kennelBook = null;
    this.saver = null;
    this.lastTile = null;
    this.lastDayShown = -1;
  }

  currentDay() {
    return 1 + Math.floor(this.clockMs / DAY_MS);
  }

  create() {
    this.worldPixelWidth = WORLD.width * WORLD.tileSize;
    this.worldPixelHeight = WORLD.height * WORLD.tileSize;

    this.worldContainer = this.add.container(0, 0);

    ensureWarnTexture(this);
    this.createFxTextures();

    this.drawWorld();
    this.drawMapLabels();

    /* load save BEFORE spawning anything */
    this.savedData = loadGame();

    if (this.savedData) {
      this.coins = this.savedData.coins ?? 100;
      this.clockMs = this.savedData.clockMs ?? 0;
      this.nextDogId = this.savedData.nextDogId ?? 1;
      this.away = this.savedData.away ?? [];
      this.regulars = this.savedData.regulars ?? [];
      setMuted(this.savedData.muted ?? false);
    }

    if (this.regulars.length === 0) {
      for (let i = 0; i < 4; i++) {
        this.regulars.push({
          name: randomNpcName(),
          appearance: randomAppearance(),
          regular: true
        });
      }
    }

    this.createDogs();

    this.npcSpawner = new NpcSpawner(
      this,
      this.worldContainer,
      this.regulars,
      (x, y, amount) => this.collectCoin(x, y, amount)
    );

    /* audio unlock + autosave plumbing */
    this.input.on("pointerdown", unlockAudio);

    this.saver = makeSaver(() => this.collectSaveData());
    this.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => this.saver.flush()
    });

    window.addEventListener("beforeunload", () => {
      this.saver.flush();
    });

    /* live refresh of care bars while a card is open */
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (this.selectedDogs.length > 0 && !this.kennelBook?.isOpen) {
          this.refreshSelectionUi();
        }
      }
    });

    const startingScale = Math.max(this.getMinimumScale(), 1.1);

    this.worldContainer.setScale(startingScale);

    /* start centered on the Pet Park */
    const focusX = 80 * WORLD.tileSize;
    const focusY = 238 * WORLD.tileSize;

    this.worldContainer.x =
      this.scale.width / 2 - focusX * startingScale;

    this.worldContainer.y =
      this.scale.height / 2 - focusY * startingScale;

    this.clampWorldPosition();

    this.createInterface();
    this.setupControls();

    this.scale.on("resize", () => {
      const minimum = this.getMinimumScale();

      if (this.worldContainer.scaleX < minimum) {
        this.setScaleAroundScreenPoint(
          this.scale.width / 2,
          this.scale.height / 2,
          minimum
        );
      }

      this.clampWorldPosition();
      this.layoutInterface();
    });
  }

  update(time, delta) {
    for (const dog of this.dogs) {
      dog.update(delta);
    }

    if (this.npcSpawner) {
      this.npcSpawner.update(delta);
    }

    /* day clock + care simulation */
    this.clockMs += delta;

    const dtDays = delta / DAY_MS;
    const runaways = [];

    for (const dog of this.dogs) {
      dog.tickCare(dtDays);

      if (
        dog.zeroMoodDays > RUNAWAY_WARN_DAYS &&
        !dog.runawayWarned
      ) {
        dog.runawayWarned = true;
        sfx.warn();
        this.toast.show(
          "UNHAPPY DOG!",
          [
            `${dog.genome.name} is miserable and thinking`,
            "about running away. Feed and wash them!"
          ],
          "#c9503c"
        );
      }

      if (dog.zeroMoodDays > RUNAWAY_DAYS) {
        runaways.push(dog);
      }
    }

    for (const dog of runaways) {
      this.dogRunsAway(dog);
    }

    /* shelter arrivals */
    const day = this.currentDay();

    for (const entry of this.away) {
      if (entry.status === "away" && day >= entry.arriveDay) {
        entry.status = "shelter";
        sfx.ui();
        this.toast.show(
          "SHELTER NEWS",
          [
            `${entry.genome.name} was found and brought`,
            "to the shelter. Pick them up! (Kennel Book)"
          ],
          "#4a7fb5"
        );
        this.saver.markDirty();
      }
    }

    if (day !== this.lastDayShown) {
      this.lastDayShown = day;
      this.refreshHud();
      this.saver.markDirty();
    }
  }

  /*
  ==================================================
  WORLD DRAWING
  ==================================================
  */

  drawWorld() {
    /*
    The whole map is painted once onto chunked
    canvas textures (see worldRenderer.js) instead
    of thousands of per-frame graphics commands.
    */
    const chunks = buildWorldTextures(this);

    for (const chunk of chunks) {
      const image = this.add.image(0, chunk.y, chunk.key);

      image.setOrigin(0, 0);

      this.worldContainer.add(image);
    }
  }

  drawMapLabels() {
    for (const label of MAP_LABELS) {
      const text = this.add.text(
        label.x * WORLD.tileSize,
        label.y * WORLD.tileSize,
        label.text,
        {
          fontFamily: "Arial",
          fontSize: "13px",
          color: "#ffffff",
          backgroundColor: "rgba(30, 40, 20, 0.5)",
          padding: { x: 5, y: 3 },
          align: "center"
        }
      );

      text.setOrigin(0.5);
      text.setDepth(10);

      this.worldContainer.add(text);
    }
  }

  /*
  ==================================================
  DOGS
  ==================================================
  */

  parkBoundsPixels() {
    const t = WORLD.tileSize;

    return {
      minX: PARK_BOUNDS_TILES.minX * t,
      maxX: PARK_BOUNDS_TILES.maxX * t,
      minY: PARK_BOUNDS_TILES.minY * t,
      maxY: PARK_BOUNDS_TILES.maxY * t
    };
  }

  createDogs() {
    if (this.savedData?.dogs?.length) {
      for (const saved of this.savedData.dogs) {
        this.spawnDog(saved.genome, {
          care: saved.care,
          favorite: saved.favorite,
          x: saved.x,
          y: saved.y
        });
      }
    } else {
      for (let i = 0; i < STARTER_DOG_COUNT; i++) {
        this.spawnDog(randomGenome(), {});
      }
    }

    /* Hunde antippen = auswählen */
    this.input.on(
      "gameobjectup",
      (pointer, gameObject, event) => {
        if (!gameObject.dogRef) {
          return;
        }

        /* Drag nicht als Klick werten */
        if (pointer.getDistance() > 12) {
          return;
        }

        this.toggleDogSelection(gameObject.dogRef);

        if (event) {
          event.stopPropagation();
        }
      }
    );
  }

  spawnDog(genome, options) {
    if (!genome.id) {
      genome.id = this.nextDogId++;
    }

    this.nextDogId = Math.max(this.nextDogId, genome.id + 1);

    const bounds = this.parkBoundsPixels();

    const dog = new Dog(
      this,
      this.worldContainer,
      genome,
      bounds,
      options
    );

    this.dogs.push(dog);
    this.refreshHud();
    this.saver?.markDirty();

    return dog;
  }

  /*
  ==================================================
  CARE / RUNAWAY / SHELTER
  ==================================================
  */

  dogRunsAway(dog) {
    const index = this.selectedDogs.indexOf(dog);

    if (index >= 0) {
      this.selectedDogs.splice(index, 1);
      this.refreshSelectionUi();
    }

    this.dogs = this.dogs.filter((d) => d !== dog);

    this.away.push({
      genome: dog.genome,
      favorite: dog.favorite,
      status: "away",
      arriveDay: this.currentDay() + SHELTER_TRAVEL_DAYS
    });

    dog.destroy();

    sfx.warn();
    this.toast.show(
      "DOG RAN AWAY!",
      [
        `${dog.genome.name} ran off into the forest ...`,
        `They should turn up at the shelter in ${SHELTER_TRAVEL_DAYS} days.`
      ],
      "#c9503c"
    );

    this.refreshHud();
    this.saver.markDirty();
  }

  pickupFromShelter(entry) {
    this.away = this.away.filter((e) => e !== entry);

    const dog = this.spawnDog(entry.genome, {
      favorite: entry.favorite,
      care: { hunger: 65, clean: 55, mood: 60 }
    });

    sfx.breed();
    this.toast.show(
      "WELCOME BACK!",
      [`${dog.genome.name} is back in the park.`,
       "Take better care of them this time!"]
    );

    this.panToWorld(dog.sprite.x, dog.sprite.y);
    this.saver.markDirty();
  }

  /*
  ==================================================
  COINS & FX
  ==================================================
  */

  createFxTextures() {
    if (!this.textures.exists("fx-heart")) {
      const c = document.createElement("canvas");
      c.width = 12;
      c.height = 12;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#e86a8a";
      ctx.beginPath();
      ctx.arc(3.5, 4, 3, 0, Math.PI * 2);
      ctx.arc(8.5, 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0.8, 5.4);
      ctx.lineTo(11.2, 5.4);
      ctx.lineTo(6, 11.4);
      ctx.closePath();
      ctx.fill();
      this.textures.addCanvas("fx-heart", c);
    }

    if (!this.textures.exists("fx-coin")) {
      const c = document.createElement("canvas");
      c.width = 12;
      c.height = 12;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#a8741c";
      ctx.beginPath();
      ctx.arc(6, 6, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8c153";
      ctx.beginPath();
      ctx.arc(6, 6, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f6e2a0";
      ctx.beginPath();
      ctx.arc(4.5, 4.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      this.textures.addCanvas("fx-coin", c);
    }
  }

  collectCoin(x, y, amount) {
    this.coins += amount;
    sfx.coin();

    const coin = this.add.image(x, y - 20, "fx-coin");

    coin.setDepth(60);
    this.worldContainer.add(coin);

    this.tweens.add({
      targets: coin,
      y: y - 50,
      alpha: 0,
      duration: 900,
      ease: "Cubic.Out",
      onComplete: () => coin.destroy()
    });

    this.refreshHud();
    this.saver.markDirty();
  }

  spawnHearts(x, y) {
    for (let i = 0; i < 6; i++) {
      const heart = this.add.image(
        x + Phaser.Math.Between(-24, 24),
        y - Phaser.Math.Between(6, 24),
        "fx-heart"
      );

      heart.setDepth(60);
      this.worldContainer.add(heart);

      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(28, 48),
        alpha: 0,
        duration: Phaser.Math.Between(700, 1200),
        delay: i * 90,
        ease: "Cubic.Out",
        onComplete: () => heart.destroy()
      });
    }
  }

  /* smooth camera pan to a world point (clamped) */
  panToWorld(worldX, worldY) {
    const s = this.worldContainer.scaleX;

    let tx = this.scale.width / 2 - worldX * s;
    let ty = this.scale.height / 2 - worldY * s;

    const scaledW = this.worldPixelWidth * s;
    const scaledH = this.worldPixelHeight * s;

    tx = Phaser.Math.Clamp(tx, this.scale.width - scaledW, 0);
    ty = Phaser.Math.Clamp(ty, this.scale.height - scaledH, 0);

    this.tweens.add({
      targets: this.worldContainer,
      x: tx,
      y: ty,
      duration: 650,
      ease: "Cubic.Out"
    });
  }

  /*
  ==================================================
  SAVE
  ==================================================
  */

  collectSaveData() {
    return {
      coins: Math.floor(this.coins),
      clockMs: Math.floor(this.clockMs),
      nextDogId: this.nextDogId,
      muted: isMuted(),
      regulars: this.regulars,
      away: this.away,
      dogs: this.dogs.map((dog) => ({
        genome: dog.genome,
        care: dog.care,
        favorite: dog.favorite,
        x: Math.round(dog.sprite.x),
        y: Math.round(dog.sprite.y)
      }))
    };
  }

  refreshHud() {
    if (!this.hud) {
      return;
    }

    this.hud.update({
      dogs: this.dogs.length,
      coins: Math.floor(this.coins),
      day: this.currentDay(),
      tile: this.lastTile?.tile ?? "Touch a tile",
      zoom:
        this.lastTile?.zoom ??
        this.worldContainer.scaleX.toFixed(2)
    });
  }

  toggleDogSelection(dog) {
    const index = this.selectedDogs.indexOf(dog);

    if (index >= 0) {
      this.selectedDogs.splice(index, 1);
      dog.setSelected(false);
      sfx.deselect();
    } else {
      if (this.selectedDogs.length >= 2) {
        const removed = this.selectedDogs.shift();
        removed.setSelected(false);
      }

      this.selectedDogs.push(dog);
      dog.setSelected(true);
      sfx.select();
    }

    this.refreshSelectionUi();
  }

  breedSelected() {
    if (this.selectedDogs.length !== 2) {
      return;
    }

    const [parentA, parentB] = this.selectedDogs;

    const puppyGenome = breed(parentA.genome, parentB.genome);

    /* pedigree */
    puppyGenome.parents = {
      ids: [parentA.genome.id, parentB.genome.id],
      names: [parentA.genome.name, parentB.genome.name]
    };

    const puppy = this.spawnDog(puppyGenome, {
      puppy: true,
      x: (parentA.sprite.x + parentB.sprite.x) / 2,
      y: (parentA.sprite.y + parentB.sprite.y) / 2
    });

    this.spawnHearts(puppy.sprite.x, puppy.sprite.y);
    this.panToWorld(puppy.sprite.x, puppy.sprite.y);

    for (const dog of this.selectedDogs) {
      dog.setSelected(false);
    }

    this.selectedDogs = [];
    this.refreshSelectionUi();

    const tier = rarityTier(puppyGenome);

    const title =
      tier > 0
        ? `${RARITY_TIERS[tier].toUpperCase()} PUPPY!`
        : "PUPPY BORN!";

    const lines = [
      `${puppyGenome.name} (${puppyGenome.personality})`,
      describe(puppyGenome)[1]
    ];

    if (tier > 0) {
      lines.push(`Coat: ${colorationLabel(puppyGenome)}`);
    }

    this.toast.show(
      title,
      lines,
      tier > 0 ? RARITY_COLORS[tier] : undefined
    );

    if (tier > 0) {
      sfx.rare();
    } else {
      sfx.breed();
    }
  }

  /*
  ==================================================
  FIXED UI
  ==================================================
  */

  createInterface() {
    this.hud = createHud(this);
    this.toast = new Toast(this);

    this.dogCard = new DogCard(this, (action) =>
      this.onCardAction(action)
    );

    this.kennelBook = new KennelBook(this, {
      getSitKey: (genome) => {
        const pheno = phenotype(genome);
        const col = coloration(genome);

        return ensureDogTextures(this, pheno, col).sit;
      },
      onSelect: (entry) => {
        const dog = this.dogs.find(
          (d) => d.genome.id === entry.genome.id
        );

        if (dog) {
          this.clearSelection();
          this.toggleDogSelection(dog);
          this.panToWorld(dog.sprite.x, dog.sprite.y);
        }
      },
      onPickup: (entry) => this.pickupFromShelter(entry)
    });

    this.bookButton = createIconButton(this, "ui-btn-book", "book", () => {
      sfx.book();
      this.openKennelBook();
    });

    this.soundButton = createIconButton(this, "ui-btn-sound", "sound", () => {
      setMuted(!isMuted());
      this.soundButton.redrawIcon(!isMuted());
      sfx.ui();
      this.saver.markDirty();
    });

    this.breedButton = createBreedButton(this, () => {
      this.breedSelected();
    });

    this.breedButton.setVisible(false);

    this.closeButton = createCloseButton(this, () => {
      this.clearSelection();
    });

    this.closeButton.setVisible(false);

    /* ESC closes the book or the card */
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-ESC", () => {
        if (this.kennelBook?.isOpen) {
          this.kennelBook.close();
        } else {
          this.clearSelection();
        }
      });
    }

    this.hud.update({
      dogs: this.dogs.length,
      tile: "Touch a tile",
      zoom: this.worldContainer.scaleX.toFixed(2)
    });

    this.layoutInterface();
  }

  layoutInterface() {
    if (this.dogCard) {
      this.dogCard.layout();
    }

    if (this.toast) {
      this.toast.layout();
    }

    if (this.breedButton) {
      const cardTop = this.dogCard?.image
        ? this.dogCard.image.y -
          this.dogCard.image.displayHeight
        : this.scale.height - 8;

      this.breedButton.x = this.scale.width / 2;
      this.breedButton.y = cardTop - 6;
      this.breedButton.baseY = this.breedButton.y;
    }

    if (this.closeButton) {
      const corner = this.dogCard?.topRight?.();

      if (corner) {
        this.closeButton.x = corner.x - 4;
        this.closeButton.y = corner.y + 4;
      }
    }

    if (this.bookButton) {
      this.bookButton.x = this.scale.width - 10;
      this.bookButton.y = 10;
    }

    if (this.soundButton) {
      this.soundButton.x = this.scale.width - 10;
      this.soundButton.y = 10 + this.bookButton.displayHeight + 8;
    }

    if (this.kennelBook?.isOpen) {
      this.kennelBook.layout();
    }
  }

  openKennelBook() {
    const entries = [];

    for (const dog of this.dogs) {
      entries.push({
        genome: dog.genome,
        favorite: dog.favorite,
        status: "park"
      });
    }

    for (const entry of this.away) {
      entries.push({
        genome: entry.genome,
        favorite: entry.favorite,
        status: entry.status,
        arriveDay: entry.arriveDay
      });
    }

    /* favorites first, then rarity */
    entries.sort((a, b) => {
      const fav = (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);

      if (fav !== 0) {
        return fav;
      }

      return rarityTier(b.genome) - rarityTier(a.genome);
    });

    this.kennelBook.open(entries);
  }

  onCardAction(action) {
    const dog = this.selectedDogs[action.index];

    if (!dog) {
      return;
    }

    if (action.type === "feed") {
      dog.feed();
      sfx.feed();
      this.spawnHearts(dog.sprite.x, dog.sprite.y);
    } else if (action.type === "wash") {
      dog.wash();
      sfx.wash();
      this.spawnHearts(dog.sprite.x, dog.sprite.y);
    } else if (action.type === "favorite") {
      dog.favorite = !dog.favorite;
      sfx.ui();
    } else if (action.type === "rename") {
      const name = window.prompt(
        "New name:",
        dog.genome.name
      );

      if (name && name.trim().length > 0) {
        dog.genome.name = name.trim().slice(0, 12);
        sfx.ui();
      }
    }

    this.refreshSelectionUi();
    this.saver.markDirty();
  }

  clearSelection() {
    for (const dog of this.selectedDogs) {
      dog.setSelected(false);
    }

    this.selectedDogs = [];
    this.refreshSelectionUi();
  }

  refreshSelectionUi() {
    if (this.selectedDogs.length === 0) {
      this.dogCard.hide();
      this.breedButton.setVisible(false);
      this.closeButton.setVisible(false);
      this.layoutInterface();
      return;
    }

    const footer =
      this.selectedDogs.length === 2
        ? "Ready to breed!"
        : "Select a second dog ...";

    this.dogCard.show(this.selectedDogs, footer);

    this.breedButton.setVisible(
      this.selectedDogs.length === 2
    );

    this.closeButton.setVisible(true);

    this.layoutInterface();
  }

  /*
  ==================================================
  INPUT
  ==================================================
  */

  setupControls() {
    this.input.on("pointerdown", (pointer) => {
      const pointers = this.getActivePointers();

      if (pointers.length >= 2) {
        this.isDragging = false;

        if (!this.pinchActive) {
          this.beginPinch(pointers[0], pointers[1]);
        }

        return;
      }

      this.isDragging = true;
      this.lastPointerX = pointer.x;
      this.lastPointerY = pointer.y;

      this.updateTileInfo(pointer);
    });

    this.input.on("pointermove", (pointer) => {
      const pointers = this.getActivePointers();

      if (pointers.length >= 2) {
        this.isDragging = false;

        if (!this.pinchActive) {
          this.beginPinch(pointers[0], pointers[1]);
        }

        this.updatePinch(pointers[0], pointers[1]);

        return;
      }

      if (this.pinchActive) {
        this.pinchActive = false;
        this.isDragging = false;

        return;
      }

      if (this.isDragging) {
        const dx = pointer.x - this.lastPointerX;
        const dy = pointer.y - this.lastPointerY;

        this.worldContainer.x += dx;
        this.worldContainer.y += dy;

        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;

        this.clampWorldPosition();
      }

      this.updateTileInfo(pointer);
    });

    this.input.on("pointerup", (pointer) => {
      const pointers = this.getActivePointers();

      if (pointers.length < 2) {
        this.pinchActive = false;
      }

      this.isDragging = false;

      this.updateTileInfo(pointer);
    });

    this.input.on("pointerupoutside", () => {
      this.isDragging = false;
      this.pinchActive = false;
    });

    this.input.on(
      "wheel",
      (pointer, gameObjects, deltaX, deltaY) => {
        const oldScale = this.worldContainer.scaleX;
        const multiplier = deltaY > 0 ? 0.9 : 1.1;

        const newScale = Phaser.Math.Clamp(
          oldScale * multiplier,
          this.getMinimumScale(),
          MAX_SCALE
        );

        this.setScaleAroundScreenPoint(
          pointer.x,
          pointer.y,
          newScale
        );

        this.clampWorldPosition();
      }
    );
  }

  getActivePointers() {
    return this.input.manager.pointers.filter(
      (pointer) => pointer.isDown
    );
  }

  /*
  ==================================================
  PINCH
  ==================================================
  */

  beginPinch(pointerA, pointerB) {
    const distance = Phaser.Math.Distance.Between(
      pointerA.x,
      pointerA.y,
      pointerB.x,
      pointerB.y
    );

    if (distance <= 0) {
      return;
    }

    this.pinchStartDistance = distance;
    this.pinchStartScale = this.worldContainer.scaleX;

    this.pinchScreenX = (pointerA.x + pointerB.x) / 2;
    this.pinchScreenY = (pointerA.y + pointerB.y) / 2;

    this.pinchLocalX =
      (this.pinchScreenX - this.worldContainer.x) /
      this.worldContainer.scaleX;

    this.pinchLocalY =
      (this.pinchScreenY - this.worldContainer.y) /
      this.worldContainer.scaleY;

    this.pinchActive = true;
  }

  updatePinch(pointerA, pointerB) {
    if (
      !this.pinchActive ||
      this.pinchStartDistance <= 0
    ) {
      return;
    }

    const currentDistance = Phaser.Math.Distance.Between(
      pointerA.x,
      pointerA.y,
      pointerB.x,
      pointerB.y
    );

    if (currentDistance <= 0) {
      return;
    }

    const ratio =
      currentDistance / this.pinchStartDistance;

    const newScale = Phaser.Math.Clamp(
      this.pinchStartScale * ratio,
      this.getMinimumScale(),
      MAX_SCALE
    );

    this.worldContainer.setScale(newScale);

    this.worldContainer.x =
      this.pinchScreenX - this.pinchLocalX * newScale;

    this.worldContainer.y =
      this.pinchScreenY - this.pinchLocalY * newScale;

    this.clampWorldPosition();
  }

  /*
  ==================================================
  SCALE HELPER
  ==================================================
  */

  setScaleAroundScreenPoint(screenX, screenY, newScale) {
    const oldScale = this.worldContainer.scaleX;

    const localX =
      (screenX - this.worldContainer.x) / oldScale;

    const localY =
      (screenY - this.worldContainer.y) / oldScale;

    this.worldContainer.setScale(newScale);

    this.worldContainer.x = screenX - localX * newScale;
    this.worldContainer.y = screenY - localY * newScale;
  }

  /*
  ==================================================
  MINIMUM SCALE
  ==================================================
  */

  getMinimumScale() {
    /*
    The world must always cover the whole screen,
    so the view can never leave the map.
    */
    return Math.max(
      this.scale.width / this.worldPixelWidth,
      this.scale.height / this.worldPixelHeight
    );
  }

  /*
  ==================================================
  PAN LIMITS
  ==================================================
  */

  clampWorldPosition() {
    /*
    Hard camera bounds: the screen edges never
    leave the world map. If the world is smaller
    than the screen on one axis (should not happen
    thanks to getMinimumScale), center it.
    */
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    const scaledWorldWidth =
      this.worldPixelWidth * this.worldContainer.scaleX;

    const scaledWorldHeight =
      this.worldPixelHeight * this.worldContainer.scaleY;

    if (scaledWorldWidth <= screenWidth) {
      this.worldContainer.x =
        (screenWidth - scaledWorldWidth) / 2;
    } else {
      this.worldContainer.x = Phaser.Math.Clamp(
        this.worldContainer.x,
        screenWidth - scaledWorldWidth,
        0
      );
    }

    if (scaledWorldHeight <= screenHeight) {
      this.worldContainer.y =
        (screenHeight - scaledWorldHeight) / 2;
    } else {
      this.worldContainer.y = Phaser.Math.Clamp(
        this.worldContainer.y,
        screenHeight - scaledWorldHeight,
        0
      );
    }
  }

  /*
  ==================================================
  TILE INFO
  ==================================================
  */

  updateTileInfo(pointer) {
    if (!this.hud) {
      return;
    }

    const scale = this.worldContainer.scaleX;

    const localX =
      (pointer.x - this.worldContainer.x) / scale;

    const localY =
      (pointer.y - this.worldContainer.y) / scale;

    const tileX = Math.floor(localX / WORLD.tileSize);
    const tileY = Math.floor(localY / WORLD.tileSize);

    const tileType = getTileType(tileX, tileY);

    this.lastTile = {
      tile: tileType ?? "Out of Bounds",
      zoom: scale.toFixed(2)
    };

    this.refreshHud();
  }
}

export const gameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#111111",

  render: {
    pixelArt: true,
    antialias: false
  },

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  input: {
    activePointers: 3
  },

  scene: [WorldScene]
};
