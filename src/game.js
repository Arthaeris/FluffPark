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
  RARITY_TIERS,
  RARITY_COLORS,
  colorationLabel
} from "./genetics.js";

import { Dog } from "./dog.js";

import {
  createHud,
  createBreedButton,
  createCloseButton,
  DogCard,
  Toast
} from "./ui.js";

const MAX_SCALE = 3;

const STARTER_DOG_COUNT = 6;

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
  }

  create() {
    this.worldPixelWidth = WORLD.width * WORLD.tileSize;
    this.worldPixelHeight = WORLD.height * WORLD.tileSize;

    this.worldContainer = this.add.container(0, 0);

    this.drawWorld();
    this.drawMapLabels();
    this.createDogs();

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
    for (let i = 0; i < STARTER_DOG_COUNT; i++) {
      this.spawnDog(randomGenome(), {});
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
    const bounds = this.parkBoundsPixels();

    const dog = new Dog(
      this,
      this.worldContainer,
      genome,
      bounds,
      options
    );

    this.dogs.push(dog);

    if (this.hud) {
      this.hud.update({
        dogs: this.dogs.length,
        tile: "Touch a tile",
        zoom: this.worldContainer.scaleX.toFixed(2)
      });
    }

    return dog;
  }

  toggleDogSelection(dog) {
    const index = this.selectedDogs.indexOf(dog);

    if (index >= 0) {
      this.selectedDogs.splice(index, 1);
      dog.setSelected(false);
    } else {
      if (this.selectedDogs.length >= 2) {
        const removed = this.selectedDogs.shift();
        removed.setSelected(false);
      }

      this.selectedDogs.push(dog);
      dog.setSelected(true);
    }

    this.refreshSelectionUi();
  }

  breedSelected() {
    if (this.selectedDogs.length !== 2) {
      return;
    }

    const [parentA, parentB] = this.selectedDogs;

    const puppyGenome = breed(parentA.genome, parentB.genome);

    const puppy = this.spawnDog(puppyGenome, {
      puppy: true,
      x: (parentA.sprite.x + parentB.sprite.x) / 2,
      y: (parentA.sprite.y + parentB.sprite.y) / 2
    });

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
  }

  /*
  ==================================================
  FIXED UI
  ==================================================
  */

  createInterface() {
    this.hud = createHud(this);
    this.dogCard = new DogCard(this);
    this.toast = new Toast(this);

    this.breedButton = createBreedButton(this, () => {
      this.breedSelected();
    });

    this.breedButton.setVisible(false);

    this.closeButton = createCloseButton(this, () => {
      this.clearSelection();
    });

    this.closeButton.setVisible(false);

    /* ESC also closes the card */
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-ESC", () => {
        this.clearSelection();
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

    this.hud.update({
      dogs: this.dogs.length,
      tile: tileType ?? "Out of Bounds",
      zoom: scale.toFixed(2)
    });
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
