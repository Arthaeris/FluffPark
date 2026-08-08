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
    this.pinchStartDistance = 0;
    this.pinchStartZoom = 1;
    this.pinchScreenX = 0;
    this.pinchScreenY = 0;
    this.pinchWorldX = 0;
    this.pinchWorldY = 0;

    this.debugText = null;
    this.uiCamera = null;

    this.worldObjects = [];

    this.worldPixelWidth = 0;
    this.worldPixelHeight = 0;
  }

  create() {
    this.worldPixelWidth =
      WORLD.width * WORLD.tileSize;

    this.worldPixelHeight =
      WORLD.height * WORLD.tileSize;

    const camera = this.cameras.main;

    /*
    IMPORTANT:
    We intentionally do NOT use camera.setBounds().

    The camera is allowed to move partly outside
    the world.
    */

    this.drawWorld();
    this.drawMapLabels();

    /*
    Start somewhere around the southern half
    of the world.
    */

    camera.setZoom(0.5);

    camera.centerOn(
      this.worldPixelWidth / 2,
      this.worldPixelHeight * 0.7
    );

    this.clampCamera();

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

      /*
      If the screen orientation or size changes,
      make sure the current zoom is still legal.
      */

      const minimumZoom =
        this.getMinimumZoom();

      if (
        this.cameras.main.zoom <
        minimumZoom
      ) {
        this.cameras.main.setZoom(
          minimumZoom
        );
      }

      this.clampCamera();
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

    this.worldObjects.push(
      graphics
    );

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

        graphics.fillStyle(
          color
        );

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

    this.worldObjects.push(
      graphics
    );

    const tileSize =
      WORLD.tileSize;

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

      text.setDepth(
        10
      );

      this.worldObjects.push(
        text
      );
    }
  }

  /*
  ==================================================
  FIXED UI
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
      .setOrigin(
        0,
        0
      )
      .setDepth(
        10000
      );

    /*
    Separate UI camera.

    This camera never zooms or scrolls,
    so the info box remains the same size.
    */

    this.uiCamera =
      this.cameras.add(
        0,
        0,
        this.scale.width,
        this.scale.height
      );

    this.uiCamera.setZoom(
      1
    );

    this.uiCamera.setScroll(
      0,
      0
    );

    /*
    Main camera sees only world.
    */

    this.cameras.main.ignore(
      this.debugText
    );

    /*
    UI camera sees only UI.
    */

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
        const pointers =
          this.getActivePointers();

        /*
        Second finger has appeared:
        begin fixed-point pinch zoom.
        */

        if (
          pointers.length >= 2
        ) {
          this.isDragging =
            false;

          this.beginPinch(
            pointers[0],
            pointers[1]
          );

          return;
        }

        /*
        One finger:
        begin panning.
        */

        this.isDragging =
          true;

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
        ============================================
        TWO-FINGER FIXED-POINT ZOOM
        ============================================

        The location between the fingers at the
        MOMENT THE PINCH BEGINS is the zoom center.

        Moving both fingers around afterwards does
        NOT pan the map.

        Only their changing distance changes zoom.
        */

        if (
          pointers.length >= 2
        ) {
          this.isDragging =
            false;

          if (
            !this.pinchActive
          ) {
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
        A pinch has just ended.
        Don't immediately turn the remaining
        finger into a drag.
        */

        if (
          this.pinchActive
        ) {
          this.pinchActive =
            false;

          this.isDragging =
            false;

          return;
        }

        /*
        ============================================
        ONE-FINGER PAN
        ============================================
        */

        if (
          this.isDragging
        ) {
          const camera =
            this.cameras.main;

          const deltaX =
            pointer.x -
            this.lastPointerX;

          const deltaY =
            pointer.y -
            this.lastPointerY;

          camera.scrollX -=
            deltaX /
            camera.zoom;

          camera.scrollY -=
            deltaY /
            camera.zoom;

          this.lastPointerX =
            pointer.x;

          this.lastPointerY =
            pointer.y;

          this.clampCamera();
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

        if (
          pointers.length < 2
        ) {
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

    /*
    Initial distance between fingers.
    */

    this.pinchStartDistance =
      Phaser.Math.Distance.Between(
        pointerA.x,
        pointerA.y,
        pointerB.x,
        pointerB.y
      );

    if (
      this.pinchStartDistance <= 0
    ) {
      return;
    }

    this.pinchStartZoom =
      camera.zoom;

    /*
    Screen midpoint BETWEEN THE FINGERS
    AT PINCH START.
    */

    this.pinchScreenX =
      (
        pointerA.x +
        pointerB.x
      ) / 2;

    this.pinchScreenY =
      (
        pointerA.y +
        pointerB.y
      ) / 2;

    /*
    Exact world point under that midpoint.
    */

    const worldPoint =
      camera.getWorldPoint(
        this.pinchScreenX,
        this.pinchScreenY
      );

    this.pinchWorldX =
      worldPoint.x;

    this.pinchWorldY =
      worldPoint.y;

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

    /*
    Only finger DISTANCE matters now.

    The moving midpoint is deliberately ignored.
    */

    const currentDistance =
      Phaser.Math.Distance.Between(
        pointerA.x,
        pointerA.y,
        pointerB.x,
        pointerB.y
      );

    if (
      currentDistance <= 0
    ) {
      return;
    }

    const ratio =
      currentDistance /
      this.pinchStartDistance;

    const newZoom =
      Phaser.Math.Clamp(
        this.pinchStartZoom *
          ratio,

        this.getMinimumZoom(),
        MAX_ZOOM
      );

    camera.setZoom(
      newZoom
    );

    /*
    Recalculate scroll so the exact world point
    that was between the fingers WHEN THE PINCH
    STARTED remains at that exact screen location.

    This is the entire zoom behavior.

    No moving midpoint.
    No two-finger panning.
    No camera bounds fighting the zoom.
    */

    camera.scrollX =
      this.pinchWorldX -
      this.pinchScreenX /
      newZoom;

    camera.scrollY =
      this.pinchWorldY -
      this.pinchScreenY /
      newZoom;

    this.clampCamera();
  }

  /*
  ==================================================
  DESKTOP POINT ZOOM
  ==================================================
  */

  zoomAtPoint(
    screenX,
    screenY,
    newZoom
  ) {
    const camera =
      this.cameras.main;

    const worldPoint =
      camera.getWorldPoint(
        screenX,
        screenY
      );

    camera.setZoom(
      newZoom
    );

    camera.scrollX =
      worldPoint.x -
      screenX /
      newZoom;

    camera.scrollY =
      worldPoint.y -
      screenY /
      newZoom;

    this.clampCamera();
  }

  /*
  ==================================================
  MINIMUM ZOOM
  ==================================================
  */

  getMinimumZoom() {
    /*
    Exactly as specified:

    The farthest zoom-out occurs when
    the WORLD WIDTH equals SCREEN WIDTH.

    Height does not determine minimum zoom.
    */

    const camera =
      this.cameras.main;

    return (
      camera.width /
      this.worldPixelWidth
    );
  }

  /*
  ==================================================
  CAMERA LIMITS
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

    /*
    The world is allowed to move partly
    outside the screen.

    At the maximum permitted overscroll,
    a world edge may reach the CENTER
    of the viewport.

    Therefore half the visible screen can
    show empty/out-of-bounds space.
    */

    const minScrollX =
      -visibleWidth / 2;

    const maxScrollX =
      this.worldPixelWidth -
      visibleWidth / 2;

    const minScrollY =
      -visibleHeight / 2;

    const maxScrollY =
      this.worldPixelHeight -
      visibleHeight / 2;

    camera.scrollX =
      Phaser.Math.Clamp(
        camera.scrollX,
        minScrollX,
        maxScrollX
      );

    camera.scrollY =
      Phaser.Math.Clamp(
        camera.scrollY,
        minScrollY,
        maxScrollY
      );
  }

  /*
  ==================================================
  TILE INFORMATION
  ==================================================
  */

  updateTileInfo(
    pointer
  ) {
    if (
      !this.debugText
    ) {
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

    if (
      !tileType
    ) {
      this.debugText.setText(
        [
          `Tile: ${tileX}, ${tileY}`,
          "Type: Out of Bounds",
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
    pixelArt:
      true,

    antialias:
      false
  },

  scale: {
    mode:
      Phaser.Scale.RESIZE,

    autoCenter:
      Phaser.Scale.CENTER_BOTH
  },

  input: {
    activePointers:
      3
  },

  scene: [
    WorldScene
  ]
};
