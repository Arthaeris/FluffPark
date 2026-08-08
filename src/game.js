import { WORLD, AREAS } from "./data.js";

class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");

    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
  }

  create() {
  const worldPixelWidth = WORLD.width * WORLD.tileSize;
  const worldPixelHeight = WORLD.height * WORLD.tileSize;

  const camera = this.cameras.main;

  camera.setBounds(
    0,
    0,
    worldPixelWidth,
    worldPixelHeight
  );

  this.drawWorld();

  camera.centerOn(
    worldPixelWidth / 2,
    worldPixelHeight * 0.72
  );

  camera.setZoom(0.8);

  let previousPinchDistance = null;

  this.input.on("pointerdown", (pointer) => {
    if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
      this.isDragging = false;
      return;
    }

    this.isDragging = true;
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;
  });

  this.input.on("pointerup", () => {
    this.isDragging = false;

    if (
      !this.input.pointer1.isDown ||
      !this.input.pointer2.isDown
    ) {
      previousPinchDistance = null;
    }
  });

  this.input.on("pointerupoutside", () => {
    this.isDragging = false;
    previousPinchDistance = null;
  });

  this.input.on("pointermove", (pointer) => {
    const pointer1 = this.input.pointer1;
    const pointer2 = this.input.pointer2;

    // Two-finger pinch zoom
    if (pointer1.isDown && pointer2.isDown) {
      this.isDragging = false;

      const distance = Phaser.Math.Distance.Between(
        pointer1.x,
        pointer1.y,
        pointer2.x,
        pointer2.y
      );

      if (previousPinchDistance !== null) {
        const difference =
          distance - previousPinchDistance;

        const zoomChange = difference * 0.003;

        const newZoom = Phaser.Math.Clamp(
          camera.zoom + zoomChange,
          0.25,
          2.5
        );

        camera.setZoom(newZoom);
      }

      previousPinchDistance = distance;
      return;
    }

    previousPinchDistance = null;

    // One-finger map dragging
    if (!this.isDragging) {
      return;
    }

    const deltaX =
      (pointer.x - this.lastPointerX) / camera.zoom;

    const deltaY =
      (pointer.y - this.lastPointerY) / camera.zoom;

    camera.scrollX -= deltaX;
    camera.scrollY -= deltaY;

    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;
  });

  // Desktop / mouse-wheel zoom
  this.input.on(
    "wheel",
    (pointer, gameObjects, deltaX, deltaY) => {
      const zoomChange =
        deltaY > 0 ? -0.1 : 0.1;

      camera.setZoom(
        Phaser.Math.Clamp(
          camera.zoom + zoomChange,
          0.25,
          2.5
        )
      );
    }
  );
}

  drawWorld() {
    const graphics = this.add.graphics();

    const tileSize = WORLD.tileSize;

    const worldPixelWidth =
      WORLD.width * tileSize;

    const worldPixelHeight =
      WORLD.height * tileSize;

    // Base ground
    graphics.fillStyle(0x78a95f);

    graphics.fillRect(
      0,
      0,
      worldPixelWidth,
      worldPixelHeight
    );

    // Outer forest
    this.drawArea(
      graphics,
      AREAS.outerForest,
      0x315c35
    );

    // Future facilities
    this.drawArea(
      graphics,
      AREAS.futureFacilities,
      0x557f4d
    );

    // Main forest / park
    this.drawArea(
      graphics,
      AREAS.park,
      0x416f3e
    );

    // Cleared starter area
    this.drawArea(
      graphics,
      AREAS.starterArea,
      0x8fba70
    );

    // Main street
    this.drawArea(
      graphics,
      AREAS.mainStreet,
      0x55585c
    );

    // Residential area
    this.drawArea(
      graphics,
      AREAS.residential,
      0xb6a377
    );

    // Placeholder town buildings
    this.drawBuilding(
      graphics,
      90,
      365,
      30,
      22,
      0xc98d64
    );

    this.drawBuilding(
      graphics,
      170,
      365,
      30,
      22,
      0x9f7258
    );

    this.drawBuilding(
      graphics,
      270,
      365,
      34,
      24,
      0xc6a56a
    );

    this.drawBuilding(
      graphics,
      370,
      365,
      32,
      22,
      0xaa7860
    );

    // Temporary grid
    graphics.lineStyle(
      1,
      0x000000,
      0.08
    );

    for (let x = 0; x <= WORLD.width; x++) {
      graphics.lineBetween(
        x * tileSize,
        0,
        x * tileSize,
        worldPixelHeight
      );
    }

    for (let y = 0; y <= WORLD.height; y++) {
      graphics.lineBetween(
        0,
        y * tileSize,
        worldPixelWidth,
        y * tileSize
      );
    }
  }

  drawArea(graphics, area, color) {
    graphics.fillStyle(color);

    graphics.fillRect(
      area.x * WORLD.tileSize,
      area.y * WORLD.tileSize,
      area.width * WORLD.tileSize,
      area.height * WORLD.tileSize
    );
  }

  drawBuilding(
    graphics,
    x,
    y,
    width,
    height,
    color
  ) {
    graphics.fillStyle(color);

    graphics.fillRect(
      x * WORLD.tileSize,
      y * WORLD.tileSize,
      width * WORLD.tileSize,
      height * WORLD.tileSize
    );
  }
}

export const gameConfig = {
  type: Phaser.AUTO,

  parent: "game",

  backgroundColor: "#111111",

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  input: {
    activePointers: 3
  },

  scene: [WorldScene]
};
