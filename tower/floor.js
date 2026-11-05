
let platforms = [];
let nextPlatformId = 1;

// --------------------------------------------------
// PLATFORM SETTINGS
// --------------------------------------------------

const FLOOR_SETTINGS = {
  startY: 550,

  // More platforms at the beginning.
  initialPlatforms: 35,

  // Keep platforms closer together so they are easier
  // to reach with the normal jump.
  minGap: 55,
  maxGap: 82,

  // Generate plenty of platforms above the camera.
  generateAhead: 2400,

  // Platform sizes.
  minWidth: 95,
  maxWidth: 155,

  // Difficulty increases with altitude.
  difficultyAltitude: 3000
};

// --------------------------------------------------
// CREATE A PLATFORM
// --------------------------------------------------

function createPlatform(x, y, width, type = "normal") {
  return {
    id: nextPlatformId++,
    x,
    y,
    width,
    height: 16,
    type,
    gone: false,
    crumbleTimer: null,

    moveDir: Math.random() < 0.5 ? -1 : 1,
    moveSpeed: 0.7 + Math.random() * 0.6,
    moveRange: 25 + Math.random() * 35,

    baseX: x,
    dx: 0
  };
}

// --------------------------------------------------
// CREATE THE STARTING FLOOR AND EXTRA PLATFORMS
// --------------------------------------------------

function createInitialPlatforms() {
  platforms = [];
  nextPlatformId = 1;

  const screenWidth = Math.max(320, window.innerWidth);
  const startWidth = Math.max(900, screenWidth * 1.5);
  const startX = (screenWidth - startWidth) / 2;

  platforms.push(
    createPlatform(
      startX,
      FLOOR_SETTINGS.startY,
      startWidth,
      "start"
    )
  );

  let y = FLOOR_SETTINGS.startY;

  for (let i = 0; i < FLOOR_SETTINGS.initialPlatforms; i++) {
    const gap =
      FLOOR_SETTINGS.minGap +
      Math.random() *
      (FLOOR_SETTINGS.maxGap - FLOOR_SETTINGS.minGap);

    y -= gap;
    createPlatformAbove(y);
  }
}

// --------------------------------------------------
// CREATE PLATFORMS ABOVE THE PLAYER
// --------------------------------------------------

function createPlatformAbove(y) {
  const screenWidth = Math.max(320, window.innerWidth);

  // Platforms are wider to make landing easier.
  const width =
    FLOOR_SETTINGS.minWidth +
    Math.random() *
    (FLOOR_SETTINGS.maxWidth - FLOOR_SETTINGS.minWidth);

  const maxX = Math.max(0, screenWidth - width);
  const x = Math.random() * maxX;

  const altitude = Math.max(
    0,
    FLOOR_SETTINGS.startY - y
  );

  const difficulty = Math.min(
    1,
    altitude / FLOOR_SETTINGS.difficultyAltitude
  );

  // Start with mostly normal platforms.
  // Moving and crumbling platforms become more common higher up.
  const roll = Math.random();

  const movingChance = 0.08 + difficulty * 0.16;
  const crumbleChance = 0.07 + difficulty * 0.13;

  let type = "normal";

  if (roll < movingChance) {
    type = "moving";
  } else if (roll < movingChance + crumbleChance) {
    type = "crumble";
  }

  const platform = createPlatform(x, y, width, type);

  if (type === "moving") {
    // Keep the moving platform within the screen.
    platform.moveRange = Math.min(
      platform.moveRange,
      x,
      Math.max(0, screenWidth - width - x)
    );

    platform.moveSpeed *= 1 + difficulty * 0.4;
  }

  platforms.push(platform);

  return platform;
}

// --------------------------------------------------
// GENERATE MORE PLATFORMS ABOVE THE CAMERA
// --------------------------------------------------

function generatePlatformsAbove(topWorldY) {
  const activePlatforms = platforms.filter(
    platform => !platform.gone
  );

  let highestY = activePlatforms.length
    ? Math.min(...activePlatforms.map(platform => platform.y))
    : topWorldY;

  const altitude = Math.max(
    0,
    FLOOR_SETTINGS.startY - topWorldY
  );

  const difficulty = Math.min(
    1,
    altitude / FLOOR_SETTINGS.difficultyAltitude
  );

  // Keep creating platforms far above the visible screen.
  while (
    highestY > topWorldY - FLOOR_SETTINGS.generateAhead
  ) {
    // Keep jumps reasonably close, with slightly larger gaps
    // as the player climbs higher.
    const minGap =
      FLOOR_SETTINGS.minGap + difficulty * 5;

    const maxGap =
      FLOOR_SETTINGS.maxGap + difficulty * 12;

    const gap =
      minGap + Math.random() * (maxGap - minGap);

    highestY -= gap;

    createPlatformAbove(highestY);
  }
}

// --------------------------------------------------
// UPDATE MOVING AND CRUMBLING PLATFORMS
// --------------------------------------------------

function updatePlatforms(frameScale, elapsedMs) {
  for (const platform of platforms) {
    if (platform.gone || platform.type === "start") {
      continue;
    }

    platform.dx = 0;

    if (platform.type === "moving") {
      const oldX = platform.x;

      platform.x +=
        platform.moveDir *
        platform.moveSpeed *
        frameScale;

      const minX = platform.baseX - platform.moveRange;
      const maxX = platform.baseX + platform.moveRange;

      if (platform.x >= maxX) {
        platform.x = maxX;
        platform.moveDir = -1;
      }

      if (platform.x <= minX) {
        platform.x = minX;
        platform.moveDir = 1;
      }

      platform.dx = platform.x - oldX;
    }

    if (
      platform.type === "crumble" &&
      platform.crumbleTimer !== null
    ) {
      platform.crumbleTimer -= elapsedMs;

      if (platform.crumbleTimer <= 0) {
        platform.gone = true;
      }
    }
  }
}

// --------------------------------------------------
// DRAW THE ICE PLATFORMS
// --------------------------------------------------

function drawPlatforms(ctx, cameraY) {
  for (const platform of platforms) {
    if (platform.gone) continue;

    const screenY = platform.y - cameraY;

    // Draw only platforms close to the visible screen.
    if (
      screenY < -50 ||
      screenY > window.innerHeight + 50
    ) {
      continue;
    }

    let color = "#d9f5ff";
    let edgeColor = "#64bde9";

    if (platform.type === "start") {
      color = "#a8e5ff";
      edgeColor = "#329fd6";
    } else if (platform.type === "moving") {
      color = "#9bdcff";
      edgeColor = "#167ec2";
    } else if (platform.type === "crumble") {
      color = "#c5edff";
      edgeColor = "#438fc7";
    }

    // Flashing effect when a crumbling platform is about to disappear.
    if (
      platform.type === "crumble" &&
      platform.crumbleTimer !== null &&
      platform.crumbleTimer < 180 &&
      Math.floor(platform.crumbleTimer / 45) % 2 === 0
    ) {
      color = "#7fcaff";
    }

    ctx.save();

    // Platform shadow.
    ctx.fillStyle = "#245c842c";
    ctx.beginPath();
    ctx.roundRect(
      platform.x,
      screenY + 5,
      platform.width,
      platform.height,
      7
    );
    ctx.fill();

    // Main ice tile.
    ctx.fillStyle = color;
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(
      platform.x,
      screenY,
      platform.width,
      platform.height,
      7
    );
    ctx.fill();
    ctx.stroke();

    // White icy highlight.
    ctx.fillStyle = "#ffffffd9";
    ctx.beginPath();
    ctx.roundRect(
      platform.x + 5,
      screenY + 2,
      Math.max(10, platform.width - 10),
      3,
      2
    );
    ctx.fill();

    // Small sparkling ice crystals.
    ctx.fillStyle = "#ffffff";

    for (let i = 0; i < 3; i++) {
      const glintX =
        platform.x +
        15 +
        i * Math.max(15, (platform.width - 30) / 2);

      ctx.beginPath();
      ctx.arc(
        glintX,
        screenY + 9,
        1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }
}
