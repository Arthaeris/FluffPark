import {
  WORLD,
  TILE_COLORS,
  worldMap,
  MAP_LABELS,
  getTileType,
  SHIBA,
  SHIBA_SIDE_WALK,
  SHIBA_LIE,
  SHIBA_SIT
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

    this.pinchScreenX = 0;
    this.pinchScreenY = 0;
    this.pinchLocalX = 0;
    this.pinchLocalY = 0;

    this.worldPixelWidth = 0;
    this.worldPixelHeight = 0;

    this.shiba = null;
    this.shibaFrameIndex = 0;
    this.shibaDirection = 1;
    this.shibaSpeed = 26;

    this.shibaMinX = 0;
    this.shibaMaxX = 0;
    this.shibaY = 0;

    this.shibaWalkTextureKeys = [];
    this.shibaLieTextureKey = "shiba-lie";
    this.shibaSitTextureKey = "shiba-sit";
  }

  create() {
    this.worldPixelWidth =
      WORLD.width * WORLD.tileSize;

    this.worldPixelHeight =
      WORLD.height * WORLD.tileSize;

    this.worldContainer =
      this.add.container(0, 0);

    this.drawWorld();
    this.drawMapLabels();

    this.createShibaTextures();
    this.createShiba();

    const startingScale = Math.max(
      this.getMinimumScale(),
      0.5
    );

    this.worldContainer.setScale(
      startingScale
    );

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

  update(time, delta) {
    this.updateShiba(delta);
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
  SHIBA TEXTURES
  ==================================================
  */

  createShibaTextures() {
    this.shibaWalkTextureKeys = [];

    for (
      let frameIndex = 0;
      frameIndex <
      SHIBA_SIDE_WALK.length;
      frameIndex++
    ) {
      const key =
        `shiba-walk-${frameIndex}`;

      this.createDogTextureFromAscii(
        key,
        SHIBA_SIDE_WALK[
          frameIndex
        ],
        SHIBA.colors
      );

      this.shibaWalkTextureKeys.push(
        key
      );
    }

    this.createDogTextureFromAscii(
      this.shibaLieTextureKey,
      SHIBA_LIE,
      SHIBA.colors
    );

    this.createDogTextureFromAscii(
      this.shibaSitTextureKey,
      SHIBA_SIT,
      SHIBA.colors
    );
  }

  createDogTextureFromAscii(
    key,
    frame,
    colors
  ) {
    const size =
      SHIBA.spriteSize;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = size;
    canvas.height = size;

    const ctx =
      canvas.getContext("2d");

    ctx.imageSmoothingEnabled =
      false;

    /*
    No generated outline anymore.

    The ASCII sprite itself decides exactly
    where every outline / interior black pixel goes.

    Legend:
    O = outline
    B = base coat
    C = cream coat
    . = transparent
    */

    for (
      let y = 0;
      y < size;
      y++
    ) {
      for (
        let x = 0;
        x < size;
        x++
      ) {
        const char =
          frame[y]?.[x] ??
          ".";

        if (
          char === "."
        ) {
          continue;
        }

        if (
          char === "O"
        ) {
          ctx.fillStyle =
            colors.outline;
        } else if (
          char === "B"
        ) {
          ctx.fillStyle =
            colors.base;
        } else if (
          char === "C"
        ) {
          ctx.fillStyle =
            colors.cream;
        } else {
          /*
          Unknown character:
          ignore rather than drawing garbage.
          */
          continue;
        }

        ctx.fillRect(
          x,
          y,
          1,
          1
        );
      }
    }

    this.textures.addCanvas(
      key,
      canvas
    );
  }

  /*
  ==================================================
  SHIBA INSTANCE
  ==================================================
  */

  createShiba() {
    /*
    Starter Park:
    x = 190..321
    y = 300..354
    */

    this.shibaMinX =
      205 *
      WORLD.tileSize;

    this.shibaMaxX =
      305 *
      WORLD.tileSize;

    this.shibaY =
      330 *
      WORLD.tileSize;

    this.shiba =
      this.add.image(
        this.shibaMinX,
        this.shibaY,
        this.shibaWalkTextureKeys[0]
      );

    /*
    Keep this much closer to native pixel size.

    1× = 32×32 world pixels
       = 2×2 world tiles.

    That should look much cleaner than the
    previous 2× enlargement.
    */

    this.shiba.setScale(
      1
    );

    this.shiba.setOrigin(
      0.5,
      1
    );

    this.shiba.setDepth(
      50
    );

    /*
    The authored sprite faces LEFT.

    Direction +1 means walking right,
    so mirror it initially.
    */

    this.shiba.setFlipX(
      true
    );

    this.worldContainer.add(
      this.shiba
    );

    this.time.addEvent({
      delay:
        SHIBA.walkFrameDuration,

      loop:
        true,

      callback:
        () => {
          if (
            !this.shiba
          ) {
            return;
          }

          this.shibaFrameIndex =
            (
              this.shibaFrameIndex +
              1
            ) %
            this.shibaWalkTextureKeys
              .length;

          this.shiba.setTexture(
            this.shibaWalkTextureKeys[
              this.shibaFrameIndex
            ]
          );
        }
    });
  }

  updateShiba(delta) {
    if (
      !this.shiba
    ) {
      return;
    }

    const seconds =
      delta / 1000;

    this.shiba.x +=
      this.shibaSpeed *
      this.shibaDirection *
      seconds;

    /*
    Turn at right edge.
    */

    if (
      this.shiba.x >=
      this.shibaMaxX
    ) {
      this.shiba.x =
        this.shibaMaxX;

      this.shibaDirection =
        -1;

      /*
      Sprite already faces left.
      */
      this.shiba.setFlipX(
        false
      );
    }

    /*
    Turn at left edge.
    */

    if (
      this.shiba.x <=
      this.shibaMinX
    ) {
      this.shiba.x =
        this.shibaMinX;

      this.shibaDirection =
        1;

      /*
      Mirror to face right.
      */
      this.shiba.setFlipX(
        true
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
  }

  /*
  ==================================================
  INPUT
  ==================================================
  */

  setupControls() {
    this.input.on(
      "pointerdown",
      (pointer) => {
        const pointers =
          this.getActivePointers();

        if (
          pointers.length >=
          2
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

        if (
          pointers.length >=
          2
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

        if (
          this.pinchActive
        ) {
          this.pinchActive =
            false;

          this.isDragging =
            false;

          return;
        }

        if (
          this.isDragging
        ) {
          const dx =
            pointer.x -
            this.lastPointerX;

          const dy =
            pointer.y -
            this.lastPointerY;

          this.worldContainer.x +=
            dx;

          this.worldContainer.y +=
            dy;

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
          pointers.length <
          2
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

    this.input.on(
      "wheel",
      (
        pointer,
        gameObjects,
        deltaX,
        deltaY
      ) => {
        const oldScale =
          this.worldContainer
            .scaleX;

        const multiplier =
          deltaY > 0
            ? 0.9
            : 1.1;

        const newScale =
          Phaser.Math.Clamp(
            oldScale *
              multiplier,

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
      this.worldContainer
        .scaleX;

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

    this.pinchLocalX =
      (
        this.pinchScreenX -
        this.worldContainer.x
      ) /
      this.worldContainer
        .scaleX;

    this.pinchLocalY =
      (
        this.pinchScreenY -
        this.worldContainer.y
      ) /
      this.worldContainer
        .scaleY;

    this.pinchActive =
      true;
  }

  updatePinch(
    pointerA,
    pointerB
  ) {
    if (
      !this.pinchActive ||
      this.pinchStartDistance <=
      0
    ) {
      return;
    }

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

    this.worldContainer.setScale(
      newScale
    );

    this.worldContainer.x =
      this.pinchScreenX -
      this.pinchLocalX *
        newScale;

    this.worldContainer.y =
      this.pinchScreenY -
      this.pinchLocalY *
        newScale;
  }

  /*
  ==================================================
  SCALE HELPER
  ==================================================
  */

  setScaleAroundScreenPoint(
    screenX,
    screenY,
    newScale
  ) {
    const oldScale =
      this.worldContainer
        .scaleX;

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
      this.worldContainer
        .scaleX;

    const scaledWorldHeight =
      this.worldPixelHeight *
      this.worldContainer
        .scaleY;

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
      this.worldContainer
        .scaleX;

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