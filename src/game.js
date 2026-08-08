import {
  WORLD,
  TILE_COLORS,
  worldMap,
  MAP_LABELS,
  getTileType
} from "./data.js";

const MAX_ZOOM = 3;

class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");

    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this.pinchActive = false;
    this.previousPinchDistance = 0;
    this.previousPinchMidX = 0;
    this.previousPinchMidY = 0;

    this.debugText = null;
    this.uiCamera = null;

    this.worldObjects = [];
  }

  create() {
    this.worldPixelWidth =
      WORLD.width * WORLD.tileSize;

    this.worldPixelHeight =
      WORLD.height * WORLD.tileSize;

    const camera = this.cameras.main;

    camera.setBounds(
      0,
      0,
      this.worldPixelWidth,
      this.worldPixelHeight
    );

    this.drawWorld();
    this.drawMapLabels();

    camera.centerOn(
      this.worldPixelWidth / 2,
      this.worldPixelHeight * 0.7
    );

    camera.setZoom(0.5);

    this.createInterface();
    this.setupCameraControls();

    this.scale.on("resize", (gameSize) => {
      if (this.uiCamera) {
        this.uiCamera.setViewport(
          0,
          0,
          gameSize.width,
          gameSize.height
        );
      }
    });
  }

  /*
  ==================================================
  WORLD
  ==================================================
  */

  drawWorld() {
    const graphics = this.add.graphics();

    this.worldObjects.push(graphics);

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

    this.worldObjects.push(graphics);

    const tileSize = WORLD.tileSize;

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
        this.worldPixelHeight
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
        this.worldPixelWidth,
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
          },

          align: "center"
        }
      );

      text.setOrigin(0.5);
      text.setDepth(10);

      this.worldObjects.push(text);
    }
  }

  /*
  ==================================================
  UI
  ==================================================
  */

  createInterface() {
    this.debugText = this.add.text(
      12,
      12,
      [
        "FluffPark",
        "Touch a tile"
      ],
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",

        backgroundColor:
          "rgba(0, 0, 0, 0.78)",

        padding: {
          x: 10,
          y: 8
        },

        lineSpacing: 3
      }
    );

    this.debugText
      .setOrigin(0, 0)
      .setDepth(10000);

    /*
    Separate camera for UI.

    This camera never zooms,
    so the panel always remains
    readable and fixed.
    */

    this.uiCamera = this.cameras.add(
      0,
      0,
      this.scale.width,
      this.scale.height
    );

    this.uiCamera.setZoom(1);
    this.uiCamera.setScroll(0, 0);

    this.cameras.main.ignore(
      this.debugText
    );

    this.uiCamera.ignore(
      this.worldObjects
    );
  }

  /*
  ==================================================
  INPUT
  ==================================================
  */

  setupCameraControls() {
    this.input.on(
      "pointerdown",
      (pointer) => {
        const touches =
          this.getActivePointers();

        if (touches.length >= 2) {
          this.isDragging = false;

          this.startPinch(
            touches[0],
            touches[1]
          );

          return;
        }

        this.isDragging = true;

        this.lastPointerX =
          pointer.x;

        this.lastPointerY =
          pointer.y;

        this.updateTileInfo(pointer);
      }
    );

    this.input.on(
      "pointermove",
      (pointer) => {
        const touches =
          this.getActivePointers();

        /*
        ============================================
        TWO-FINGER GESTURE
        ============================================
        */

        if (touches.length >= 2) {
          this.isDragging = false;

          if (!this.pinchActive) {
            this.startPinch(
              touches[0],
              touches[1]
            );
          } else {
            this.updatePinch(
              touches[0],
              touches[1]
            );
          }

          return;
        }

        /*
        We just went from two fingers
        back to one.
        */

        if (this.pinchActive) {
          this.pinchActive = false;
          this.isDragging = false;

          return;
        }

        /*
        ============================================
        ONE-FINGER PAN
        ============================================
        */

        if (this.isDragging) {
          const camera =
            this.cameras.main;

          const deltaX =
            pointer.x -
            this.lastPointerX;

          const deltaY =
            pointer.y -
            this.lastPointerY;

          camera.scrollX -=
            deltaX / camera.zoom;

          camera.scrollY -=
            deltaY / camera.zoom;

          this.lastPointerX =
            pointer.x;

          this.lastPointerY =
            pointer.y;

          this.clampCamera();
        }

        this.updateTileInfo(pointer);
      }
    );

    this.input.on(
      "pointerup",
      (pointer) => {
        const touches =
          this.getActivePointers();

        if (touches.length < 2) {
          this.pinchActive = false;
        }

        this.isDragging = false;

        this.updateTileInfo(pointer);
      }
    );

    this.input.on(
      "pointerupoutside",
      () => {
        this.isDragging = false;
        this.pinchActive = false;
      }
    );

    /*
    Desktop wheel zoom.
    */

    this.input.on(
      "wheel",
      (
        pointer,
        gameObjects,
        deltaX,
        deltaY
      ) => {
        const camera =
          this.cameras.main;

        const multiplier =
          deltaY > 0
            ? 0.9
            : 1.1;

        const newZoom =
          Phaser.Math.Clamp(
            camera.zoom * multiplier,
            this.getMinimumZoom(),
            MAX_ZOOM
          );

        this.zoomAtPoint(
          pointer.x,
          pointer.y,
          newZoom
        );
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
  STANDARD PINCH GESTURE
  ==================================================
  */

  startPinch(pointerA, pointerB) {
    this.previousPinchDistance =
      Phaser.Math.Distance.Between(
        pointerA.x,
        pointerA.y,
        pointerB.x,
        pointerB.y
      );

    this.previousPinchMidX =
      (pointerA.x + pointerB.x) / 2;

    this.previousPinchMidY =
      (pointerA.y + pointerB.y) / 2;

    this.pinchActive = true;
  }

  updatePinch(pointerA, pointerB) {
    const camera =
      this.cameras.main;

    const currentDistance =
      Phaser.Math.Distance.Between(
        pointerA.x,
        pointerA.y,
        pointerB.x,
        pointerB.y
      );

    if (
      currentDistance <= 0 ||
      this.previousPinchDistance <= 0
    ) {
      return;
    }

    const currentMidX =
      (pointerA.x + pointerB.x) / 2;

    const currentMidY =
      (pointerA.y + pointerB.y) / 2;

    /*
    FIRST:

    Find the world point that was underneath
    the PREVIOUS finger midpoint.
    */

    const anchor =
      camera.getWorldPoint(
        this.previousPinchMidX,
        this.previousPinchMidY
      );

    /*
    SECOND:

    Calculate zoom change from the change
    in distance between fingers.
    */

    const zoomRatio =
      currentDistance /
      this.previousPinchDistance;

    const newZoom =
      Phaser.Math.Clamp(
        camera.zoom * zoomRatio,
        this.getMinimumZoom(),
        MAX_ZOOM
      );

    camera.setZoom(newZoom);

    /*
    THIRD:

    Find which world coordinate is now
    underneath the CURRENT midpoint.
    */

    const currentWorldPoint =
      camera.getWorldPoint(
        currentMidX,
        currentMidY
      );

    /*
    FOURTH:

    Move the camera by the difference.

    This makes the old anchor point move
    exactly from the previous midpoint
    to the new midpoint.

    That is the normal pinch gesture:
    zoom + two-finger movement together.
    */

    camera.scrollX +=
      anchor.x -
      currentWorldPoint.x;

    camera.scrollY +=
      anchor.y -
      currentWorldPoint.y;

    this.clampCamera();

    /*
    Current state becomes previous state
    for the next frame.
    */

    this.previousPinchDistance =
      currentDistance;

    this.previousPinchMidX =
      currentMidX;

    this.previousPinchMidY =
      currentMidY;
  }

  /*
  ==================================================
  ZOOM AROUND A SCREEN POINT
  ==================================================
  */

  zoomAtPoint(
    screenX,
    screenY,
    newZoom
  ) {
    const camera =
      this.cameras.main;

    const anchor =
      camera.getWorldPoint(
        screenX,
        screenY
      );

    camera.setZoom(newZoom);

    const after =
      camera.getWorldPoint(
        screenX,
        screenY
      );

    camera.scrollX +=
      anchor.x -
      after.x;

    camera.scrollY +=
      anchor.y -
      after.y;

    this.clampCamera();
  }

  /*
  ==================================================
  MINIMUM ZOOM
  ==================================================
  */

  getMinimumZoom() {
    /*
    Prevent zooming out farther than the point
    where the entire map is smaller than
    the viewport.

    Without this, Phaser's camera bounds can
    start fighting the gesture and cause
    the sideways drifting you were seeing.
    */

    const camera =
      this.cameras.main;

    const fitWidth =
      camera.width /
      this.worldPixelWidth;

    const fitHeight =
      camera.height /
      this.worldPixelHeight;

    return Math.max(
      fitWidth,
      fitHeight
    );
  }

  /*
  ==================================================
  CAMERA BOUNDS
  ==================================================
  */

  clampCamera() {
    const camera =
      this.cameras.main;

    const visibleWidth =
      camera.width /
      camera.zoom;

    const visibleHeight =
      camera.height /
      camera.zoom;

    const maxX =
      this.worldPixelWidth -
      visibleWidth;

    const maxY =
      this.worldPixelHeight -
      visibleHeight;

    /*
    The minimum zoom guarantees these
    should normally remain >= 0.
    */

    camera.scrollX =
      Phaser.Math.Clamp(
        camera.scrollX,
        0,
        Math.max(0, maxX)
      );

    camera.scrollY =
      Phaser.Math.Clamp(
        camera.scrollY,
        0,
        Math.max(0, maxY)
      );
  }

  /*
  ==================================================
  TILE INFO
  ==================================================
  */

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
      this.debugText.setText([
        "FluffPark",
        `Zoom: ${camera.zoom.toFixed(2)}x`
      ]);

      return;
    }

    this.debugText.setText([
      `Tile: ${tileX}, ${tileY}`,
      `Type: ${tileType}`,
      `Zoom: ${camera.zoom.toFixed(2)}x`
    ]);
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

  scene: [
    WorldScene
  ]
};
