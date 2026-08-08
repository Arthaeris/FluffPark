import {
  WORLD,
  TILE_COLORS,
  worldMap,
  MAP_LABELS,
  getTileType
} from "./data.js";

const MAX_SCALE = 3;

class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");

    this.worldContainer = null;
    this.debugText = null;

    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this.pinchActive = false;
    this.pinchStartDistance = 0;
    this.pinchStartScale = 1;

    // Fixed zoom point for the entire pinch gesture.
    this.pinchScreenX = 0;
    this.pinchScreenY = 0;
    this.pinchLocalX = 0;
    this.pinchLocalY = 0;

    this.worldPixelWidth = 0;
    this.worldPixelHeight = 0;
  }

  create() {
    this.worldPixelWidth =
      WORLD.width * WORLD.tileSize;

    this.worldPixelHeight =
      WORLD.height * WORLD.tileSize;

    /*
    The Phaser camera stays at 1× forever.

    We move and scale this container instead.
    */
    this.worldContainer =
      this.add.container(0, 0);

    this.drawWorld();
    this.drawMapLabels();

    /*
    Start at a useful zoom and position.
    */
    const startingScale = Math.max(
      this.getMinimumScale(),
      0.5
    );

    this.worldContainer.setScale(
      startingScale
    );

    /*
    Initially center the map horizontally,
    with the view around the lower/middle area.
    */
    this.worldContainer.x =
      (
        this.scale.width -
        this.worldPixelWidth *
          startingScale
      ) / 2;

    this.worldContainer.y =
      this.scale.height * 0.5 -
      this.worldPixelHeight *
        startingScale *
        0.7;

    this.clampWorldPosition();

    this.createInterface();
    this.setupControls();

    this.scale.on(
      "resize",
      () => {
        const minimum =
          this.getMinimumScale();

        if (
          this.worldContainer.scaleX <
          minimum
        ) {
          this.setScaleAroundScreenPoint(
            this.scale.width / 2,
            this.scale.height / 2,
            minimum
          );
        }

        this.clampWorldPosition();
      }
    );
  }

  /*
  ==================================================
  WORLD DRAWING
  ==================================================
  */

  drawWorld() {
    const graphics =
      this.add.graphics();

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

    /*
    Temporary tile grid.
    */
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

    this.worldContainer.add(
      graphics
    );
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

      this.worldContainer.add(
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
    /*
    This is NOT inside worldContainer.

    Therefore it never moves and never scales.
    */
    this.debugText =
      this.add.text(
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
  }

  /*
  ==================================================
  CONTROLS
  ==================================================
  */

  setupControls() {
    this.input.on(
      "pointerdown",
      (pointer) => {
        const pointers =
          this.getActivePointers();

        /*
        TWO FINGERS:
        begin pinch.
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

          return;
        }

        /*
        ONE FINGER:
        begin normal pan.
        */
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
        ============================================
        PINCH
        ============================================
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
        If a pinch just ended,
        do not let the remaining finger
        suddenly drag the map.
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
          const dx =
            pointer.x -
            this.lastPointerX;

          const dy =
            pointer.y -
            this.lastPointerY;

          this.worldContainer.x += dx;
          this.worldContainer.y += dy;

          this.lastPointerX =
            pointer.x;

          this.lastPointerY =
            pointer.y;

          this.clampWorldPosition();
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
    Desktop mouse-wheel zoom.
    */
    this.input.on(
      "wheel",
      (
        pointer,
        gameObjects,
        deltaX,
        deltaY
      ) => {
        const oldScale =
          this.worldContainer.scaleX;

        const multiplier =
          deltaY > 0
            ? 0.9
            : 1.1;

        const newScale =
          Phaser.Math.Clamp(
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
      (pointer) =>
        pointer.isDown
    );
  }

  /*
  ==================================================
  PINCH
  ==================================================
  */

  beginPinch(
    pointerA,
    pointerB
  ) {
    const distance =
      Phaser.Math.Distance.Between(
        pointerA.x,
        pointerA.y,
        pointerB.x,
        pointerB.y
      );

    if (
      distance <= 0
    ) {
      return;
    }

    this.pinchStartDistance =
      distance;

    this.pinchStartScale =
      this.worldContainer.scaleX;

    /*
    The midpoint at the instant the pinch begins.
    THIS NEVER CHANGES DURING THE GESTURE.
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
    Convert that screen position into a coordinate
    inside the unscaled world.

    This is the exact location we keep stationary.
    */

    this.pinchLocalX =
      (
        this.pinchScreenX -
        this.worldContainer.x
      ) /
      this.worldContainer.scaleX;

    this.pinchLocalY =
      (
        this.pinchScreenY -
        this.worldContainer.y
      ) /
      this.worldContainer.scaleY;

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

    /*
    ONLY distance matters.

    Finger movement left/right/up/down is ignored.
    It cannot pan the map.
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

    const newScale =
      Phaser.Math.Clamp(
        this.pinchStartScale *
          ratio,

        this.getMinimumScale(),
        MAX_SCALE
      );

    /*
    Scale the world.
    */
    this.worldContainer.setScale(
      newScale
    );

    /*
    Then put the SAME map coordinate back under
    the SAME screen coordinate where the pinch began.

    Nothing else moves.
    */

    this.worldContainer.x =
      this.pinchScreenX -
      this.pinchLocalX *
        newScale;

    this.worldContainer.y =
      this.pinchScreenY -
      this.pinchLocalY *
        newScale;

    /*
    Do NOT clamp here.

    Clamping while fingers are actively zooming
    is exactly what caused edge bouncing before.

    We allow the zoom operation itself to remain
    completely stable.

    Position is constrained after the gesture.
    */
  }

  /*
  ==================================================
  GENERIC SCALE AROUND SCREEN POINT
  ==================================================
  */

  setScaleAroundScreenPoint(
    screenX,
    screenY,
    newScale
  ) {
    const oldScale =
      this.worldContainer.scaleX;

    const localX =
      (
        screenX -
        this.worldContainer.x
      ) /
      oldScale;

    const localY =
      (
        screenY -
        this.worldContainer.y
      ) /
      oldScale;

    this.worldContainer.setScale(
      newScale
    );

    this.worldContainer.x =
      screenX -
      localX *
        newScale;

    this.worldContainer.y =
      screenY -
      localY *
        newScale;
  }

  /*
  ==================================================
  MINIMUM SCALE
  ==================================================
  */

  getMinimumScale() {
    /*
    At maximum zoom-out:

    world width == screen width
    */

    return (
      this.scale.width /
      this.worldPixelWidth
    );
  }

  /*
  ==================================================
  PAN LIMITS
  ==================================================
  */

  clampWorldPosition() {
    const screenWidth =
      this.scale.width;

    const screenHeight =
      this.scale.height;

    const scaledWorldWidth =
      this.worldPixelWidth *
      this.worldContainer.scaleX;

    const scaledWorldHeight =
      this.worldPixelHeight *
      this.worldContainer.scaleY;

    /*
    Your requested rule:

    A world edge may move as far as
    the center of the screen.

    LEFT EDGE:
    may move to screen center.

    RIGHT EDGE:
    may move to screen center.
    */

    const maxX =
      screenWidth / 2;

    const minX =
      screenWidth / 2 -
      scaledWorldWidth;

    const maxY =
      screenHeight / 2;

    const minY =
      screenHeight / 2 -
      scaledWorldHeight;

    this.worldContainer.x =
      Phaser.Math.Clamp(
        this.worldContainer.x,
        minX,
        maxX
      );

    this.worldContainer.y =
      Phaser.Math.Clamp(
        this.worldContainer.y,
        minY,
        maxY
      );
  }

  /*
  ==================================================
  TILE INFO
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

    const scale =
      this.worldContainer.scaleX;

    /*
    Convert screen coordinates into
    coordinates inside the map container.
    */

    const localX =
      (
        pointer.x -
        this.worldContainer.x
      ) /
      scale;

    const localY =
      (
        pointer.y -
        this.worldContainer.y
      ) /
      scale;

    const tileX =
      Math.floor(
        localX /
        WORLD.tileSize
      );

    const tileY =
      Math.floor(
        localY /
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
          `Zoom: ${scale.toFixed(2)}x`
        ]
      );

      return;
    }

    this.debugText.setText(
      [
        `Tile: ${tileX}, ${tileY}`,
        `Type: ${tileType}`,
        `Zoom: ${scale.toFixed(2)}x`
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
