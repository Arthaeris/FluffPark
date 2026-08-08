import {
  WORLD,
  TILE_COLORS,
  worldMap,
  MAP_LABELS,
  getTileType
} from "./data.js";

const MIN_ZOOM = 0.06;
const MAX_ZOOM = 3;

class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");

    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this.pinchActive = false;
    this.pinchStartDistance = 0;
    this.pinchStartZoom = 1;
    this.pinchAnchorX = 0;
    this.pinchAnchorY = 0;

    this.debugText = null;
    this.uiCamera = null;

    this.worldObjects = [];
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

    camera.centerOn(
      worldPixelWidth / 2,
      worldPixelHeight * 0.72
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
  WORLD RENDERING
  ==================================================
  */

  drawWorld() {
    const graphics =
      this.add.graphics();

    this.worldObjects.push(graphics);

    const tileSize =
      WORLD.tileSize;

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
    const graphics =
      this.add.graphics();

    this.worldObjects.push(graphics);

    const tileSize =
      WORLD.tileSize;

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
    for (
      const label of MAP_LABELS
    ) {
      const text =
        this.add.text(
          label.x *
            WORLD.tileSize,
          label.y *
            WORLD.tileSize,
          label.text,
          {
            fontFamily:
              "Arial",

            fontSize:
              "18px",

            color:
              "#ffffff",

            backgroundColor:
              "rgba(0, 0, 0, 0.45)",

            padding: {
              x: 5,
              y: 3
            },

            align:
              "center"
          }
        );

      text.setOrigin(
        0.5,
        0.5
      );

      text.setDepth(10);

      this.worldObjects.push(
        text
      );
    }
  }

  /*
  ==================================================
  FIXED USER INTERFACE
  ==================================================
  */

  createInterface() {
    this.debugText =
      this.add.text(
        12,
        12,
        [
          "FluffPark",
          "Touch a tile"
        ],
        {
          fontFamily:
            "Arial",

          fontSize:
            "16px",

          color:
            "#ffffff",

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
    The main camera renders the world.

    The UI camera renders only interface objects.

    Because the UI camera always stays at zoom 1,
    the information panel never shrinks or grows.
    */

    this.uiCamera =
      this.cameras.add(
        0,
        0,
        this.scale.width,
        this.scale.height
      );

    this.uiCamera.setZoom(1);
    this.uiCamera.setScroll(0, 0);

    /*
    Main world camera:
    don't render the UI panel.
    */

    this.cameras.main.ignore(
      this.debugText
    );

    /*
    UI camera:
    don't render anything belonging to the world.
    */

    this.uiCamera.ignore(
      this.worldObjects
    );
  }

  /*
  ==================================================
  CAMERA CONTROLS
  ==================================================
  */

  setupCameraControls() {
    this.input.on(
      "pointerdown",
      (pointer) => {
        const pointers =
          this.getActivePointers();

        /*
        If a second finger has gone down,
        begin a pinch instead of dragging.
        */

        if (pointers.length >= 2) {
          this.isDragging =
            false;

          this.beginPinch(
            pointers[0],
            pointers[1]
          );

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
      "pointermove",
      (pointer) => {
        const pointers =
          this.getActivePointers();

        /*
        PINCH ZOOM
        */

        if (pointers.length >= 2) {
          this.isDragging =
            false;

          if (!this.pinchActive) {
            this.beginPinch(
              pointers[0],
              pointers[1]
            );
          }

          this.updatePinch(
            pointers[0],
            pointers[1]
          );

          return;
        }

        /*
        Pinch ended.
        */

        if (this.pinchActive) {
          this.pinchActive =
            false;

          this.isDragging =
            false;

          return;
        }

        /*
        NORMAL ONE-FINGER DRAG
        */

        if (this.isDragging) {
          const camera =
            this.cameras.main;

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
      "pointerup",
      (pointer) => {
        const pointers =
          this.getActivePointers();

        if (pointers.length < 2) {
          this.pinchActive =
            false;
        }

        this.isDragging =
          false;

        this.updateTileInfo(
          pointer
        );
      }
    );

    this.input.on(
      "pointerupoutside",
      () => {
        this.isDragging =
          false;

        this.pinchActive =
          false;
      }
    );

    /*
    Desktop wheel support.
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
            camera.zoom *
              multiplier,

            MIN_ZOOM,
            MAX_ZOOM
          );

        this.zoomAtScreenPoint(
          pointer.x,
          pointer.y,
          newZoom
        );
      }
    );
  }

  /*
  ==================================================
  TOUCH POINTER HELPERS
  ==================================================
  */

  getActivePointers() {
    return this.input.manager.pointers.filter(
      (pointer) =>
        pointer.isDown
    );
  }

  /*
  ==================================================
  PINCH ZOOM
  ==================================================
  */

  beginPinch(
    pointerA,
    pointerB
  ) {
    const camera =
      this.cameras.main;

    const midpointX =
      (
        pointerA.x +
        pointerB.x
      ) / 2;

    const midpointY =
      (
        pointerA.y +
        pointerB.y
      ) / 2;

    this.pinchStartDistance =
      Phaser.Math.Distance.Between(
        pointerA.x,
        pointerA.y,
        pointerB.x,
        pointerB.y
      );

    this.pinchStartZoom =
      camera.zoom;

    /*
    This is the important bit:

    Remember exactly which world coordinate
    was underneath the midpoint of the two fingers
    when the gesture began.
    */

    const anchor =
      camera.getWorldPoint(
        midpointX,
        midpointY
      );

    this.pinchAnchorX =
      anchor.x;

    this.pinchAnchorY =
      anchor.y;

    this.pinchActive =
      true;
  }

  updatePinch(
    pointerA,
    pointerB
  ) {
    if (
      !this.pinchActive ||
      this.pinchStartDistance <= 0
    ) {
      return;
    }

    const camera =
      this.cameras.main;

    const currentDistance =
      Phaser.Math.Distance.Between(
        pointerA.x,
        pointerA.y,
        pointerB.x,
        pointerB.y
      );

    const ratio =
      currentDistance /
      this.pinchStartDistance;

    const newZoom =
      Phaser.Math.Clamp(
        this.pinchStartZoom *
          ratio,

        MIN_ZOOM,
        MAX_ZOOM
      );

    /*
    Current midpoint between fingers.
    */

    const midpointX =
      (
        pointerA.x +
        pointerB.x
      ) / 2;

    const midpointY =
      (
        pointerA.y +
        pointerB.y
      ) / 2;

    camera.setZoom(
      newZoom
    );

    /*
    Keep the original world point underneath
    the current midpoint.

    This allows BOTH pinch zooming and
    two-finger panning naturally.
    */

    camera.scrollX =
      this.pinchAnchorX -
      midpointX /
        newZoom;

    camera.scrollY =
      this.pinchAnchorY -
      midpointY /
        newZoom;
  }

  /*
  ==================================================
  MOUSE-WHEEL / GENERIC POINT ZOOM
  ==================================================
  */

  zoomAtScreenPoint(
    screenX,
    screenY,
    newZoom
  ) {
    const camera =
      this.cameras.main;

    /*
    Remember the world position under
    the pointer before changing zoom.
    */

    const anchor =
      camera.getWorldPoint(
        screenX,
        screenY
      );

    camera.setZoom(
      newZoom
    );

    /*
    Reposition the camera so that exact world
    location remains underneath the pointer.
    */

    camera.scrollX =
      anchor.x -
      screenX /
        newZoom;

    camera.scrollY =
      anchor.y -
      screenY /
        newZoom;
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
  type:
    Phaser.AUTO,

  parent:
    "game",

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
