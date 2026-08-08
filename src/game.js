import {
  WORLD,
  TILE_COLORS,
  worldMap,
  MAP_LABELS,
  getTileType
} from "./data.js";

class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");

    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this.previousPinchDistance = null;
    this.debugText = null;
  }

  create() {
    const worldPixelWidth =
      WORLD.width * WORLD.tileSize;

    const worldPixelHeight =
      WORLD.height * WORLD.tileSize;

    const camera = this.cameras.main;

    camera.setBounds(
      0,
      0,
      worldPixelWidth,
      worldPixelHeight
    );

    this.drawWorld();
    this.drawMapLabels();
    this.createDebugOverlay();

    camera.centerOn(
      worldPixelWidth / 2,
      worldPixelHeight * 0.72
    );

    camera.setZoom(0.5);

    this.setupCameraControls();
  }

  drawWorld() {
    const graphics = this.add.graphics();

    const tileSize = WORLD.tileSize;

    for (
      let tileY = 0;
      tileY < WORLD.height;
      tileY++
    ) {
      for (
        let tileX = 0;
        tileX < WORLD.width;
        tileX++
      ) {
        const tileType =
          worldMap[tileY][tileX];

        const color =
          TILE_COLORS[tileType] ??
          0xff00ff;

        graphics.fillStyle(color);

        graphics.fillRect(
          tileX * tileSize,
          tileY * tileSize,
          tileSize,
          tileSize
        );
      }
    }

    this.drawGrid();
  }

  drawGrid() {
    const graphics = this.add.graphics();

    const tileSize = WORLD.tileSize;

    const worldPixelWidth =
      WORLD.width * tileSize;

    const worldPixelHeight =
      WORLD.height * tileSize;

    graphics.lineStyle(
      1,
      0x000000,
      0.08
    );

    for (
      let x = 0;
      x <= WORLD.width;
      x++
    ) {
      graphics.lineBetween(
        x * tileSize,
        0,
        x * tileSize,
        worldPixelHeight
      );
    }

    for (
      let y = 0;
      y <= WORLD.height;
      y++
    ) {
      graphics.lineBetween(
        0,
        y * tileSize,
        worldPixelWidth,
        y * tileSize
      );
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
          fontSize: "18px",
          color: "#ffffff",
          backgroundColor:
            "rgba(0, 0, 0, 0.45)",
          padding: {
            x: 5,
            y: 3
          }
        }
      );

      text.setOrigin(
        0.5,
        0.5
      );

      text.setDepth(10);
    }
  }

  createDebugOverlay() {
    this.debugText = this.add.text(
      12,
      12,
      "FluffPark",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor:
          "rgba(0, 0, 0, 0.7)",
        padding: {
          x: 8,
          y: 6
        }
      }
    );

    this.debugText
      .setScrollFactor(0)
      .setDepth(1000);
  }

  setupCameraControls() {
    const camera = this.cameras.main;

    this.input.on(
      "pointerdown",
      (pointer) => {
        const pointer1 =
          this.input.pointer1;

        const pointer2 =
          this.input.pointer2;

        if (
          pointer1.isDown &&
          pointer2.isDown
        ) {
          this.isDragging = false;
          return;
        }

        this.isDragging = true;

        this.lastPointerX =
          pointer.x;

        this.lastPointerY =
          pointer.y;

        this.updateTileInfo(
          pointer
        );
      }
    );

    this.input.on(
      "pointerup",
      (pointer) => {
        this.isDragging = false;

        if (
          !this.input.pointer1.isDown ||
          !this.input.pointer2.isDown
        ) {
          this.previousPinchDistance =
            null;
        }

        this.updateTileInfo(
          pointer
        );
      }
    );

    this.input.on(
      "pointerupoutside",
      () => {
        this.isDragging = false;
        this.previousPinchDistance =
          null;
      }
    );

    this.input.on(
      "pointermove",
      (pointer) => {
        const pointer1 =
          this.input.pointer1;

        const pointer2 =
          this.input.pointer2;

        if (
          pointer1.isDown &&
          pointer2.isDown
        ) {
          this.isDragging = false;

          this.handlePinchZoom(
            pointer1,
            pointer2
          );

          return;
        }

        this.previousPinchDistance =
          null;

        if (this.isDragging) {
          const deltaX =
            (
              pointer.x -
              this.lastPointerX
            ) /
            camera.zoom;

          const deltaY =
            (
              pointer.y -
              this.lastPointerY
            ) /
            camera.zoom;

          camera.scrollX -=
            deltaX;

          camera.scrollY -=
            deltaY;

          this.lastPointerX =
            pointer.x;

          this.lastPointerY =
            pointer.y;
        }

        this.updateTileInfo(
          pointer
        );
      }
    );

    this.input.on(
      "wheel",
      (
        pointer,
        gameObjects,
        deltaX,
        deltaY
      ) => {
        const zoomChange =
          deltaY > 0
            ? -0.1
            : 0.1;

        const newZoom =
          Phaser.Math.Clamp(
            camera.zoom +
              zoomChange,
            0.08,
            3
          );

        this.zoomTowardPoint(
          pointer.x,
          pointer.y,
          newZoom
        );
      }
    );
  }

  handlePinchZoom(
    pointer1,
    pointer2
  ) {
    const camera =
      this.cameras.main;

    const distance =
      Phaser.Math.Distance.Between(
        pointer1.x,
        pointer1.y,
        pointer2.x,
        pointer2.y
      );

    const midpointX =
      (
        pointer1.x +
        pointer2.x
      ) / 2;

    const midpointY =
      (
        pointer1.y +
        pointer2.y
      ) / 2;

    if (
      this.previousPinchDistance !==
      null
    ) {
      const difference =
        distance -
        this.previousPinchDistance;

      const zoomChange =
        difference *
        0.0025;

      const newZoom =
        Phaser.Math.Clamp(
          camera.zoom +
            zoomChange,
          0.08,
          3
        );

      this.zoomTowardPoint(
        midpointX,
        midpointY,
        newZoom
      );
    }

    this.previousPinchDistance =
      distance;
  }

  zoomTowardPoint(
    screenX,
    screenY,
    newZoom
  ) {
    const camera =
      this.cameras.main;

    const before =
      camera.getWorldPoint(
        screenX,
        screenY
      );

    camera.setZoom(
      newZoom
    );

    const after =
      camera.getWorldPoint(
        screenX,
        screenY
      );

    camera.scrollX +=
      before.x -
      after.x;

    camera.scrollY +=
      before.y -
      after.y;
  }

  updateTileInfo(pointer) {
    if (!this.debugText) {
      return;
    }

    const camera =
      this.cameras.main;

    const worldPoint =
      camera.getWorldPoint(
        pointer.x,
        pointer.y
      );

    const tileX =
      Math.floor(
        worldPoint.x /
        WORLD.tileSize
      );

    const tileY =
      Math.floor(
        worldPoint.y /
        WORLD.tileSize
      );

    const tileType =
      getTileType(
        tileX,
        tileY
      );

    if (!tileType) {
      this.debugText.setText(
        [
          "FluffPark",
          `Zoom: ${camera.zoom.toFixed(2)}x`
        ]
      );

      return;
    }

    this.debugText.setText(
      [
        `Tile: ${tileX}, ${tileY}`,
        `Type: ${tileType}`,
        `Zoom: ${camera.zoom.toFixed(2)}x`
      ]
    );
  }
}

export const gameConfig = {
  type: Phaser.AUTO,

  parent: "game",

  backgroundColor:
    "#111111",

  render: {
    pixelArt: true,
    antialias: false
  },

  scale: {
    mode:
      Phaser.Scale.RESIZE,

    autoCenter:
      Phaser.Scale.CENTER_BOTH
  },

  input: {
    activePointers: 3
  },

  scene: [
    WorldScene
  ]
};
