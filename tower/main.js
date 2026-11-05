
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const difficultyElement = document.getElementById("difficulty");
const doubleJumpElement = document.getElementById("doubleJump");
const floorCountElement = document.getElementById("floorCount");
const altitudeElement = document.getElementById("altitude");

const overlay = document.getElementById("overlay");
const panelTitle = document.getElementById("panelTitle");
const panelText = document.getElementById("panelText");
const startBtn = document.getElementById("startBtn");
const soundBtn = document.getElementById("soundBtn");

let player;
let gameStarted = false;
let gameOver = false;

let cameraY = 0;
let score = 0;
let bestScore = 0;
let lastTime = 0;

let scoredPlatformIds = new Set();
let particles = [];
let snowflakes = [];

let audioContext = null;
let soundEnabled = true;

// --------------------------------------------------
// SAVE BEST SCORE
// --------------------------------------------------

try {
  bestScore = Number(localStorage.getItem("icetower-best") || 0);

  if (!Number.isFinite(bestScore) || bestScore < 0) {
    bestScore = 0;
  }
} catch (error) {
  bestScore = 0;
}

bestElement.textContent = bestScore;

// --------------------------------------------------
// SOUND EFFECTS
// --------------------------------------------------

function initializeAudio() {
  if (!soundEnabled) return;

  if (audioContext) {
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return;
  }

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  try {
    audioContext = new AudioContextClass();
    audioContext.resume().catch(() => {});
  } catch (error) {
    audioContext = null;
  }
}

function playGameSound(type) {
  if (!soundEnabled || !audioContext) return;
  if (audioContext.state !== "running") return;

  const sounds = {
    jump: { start: 440, end: 660, duration: 0.10 },
    doubleJump: { start: 620, end: 880, duration: 0.14 },
    land: { start: 300, end: 180, duration: 0.08 },
    gameOver: { start: 400, end: 120, duration: 0.35 }
  };

  const sound = sounds[type];
  if (!sound) return;

  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(sound.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      sound.end,
      now + sound.duration
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + sound.duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + sound.duration + 0.02);
  } catch (error) {
    // Sound errors should not stop the game.
  }
}

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    initializeAudio();
  }

  soundBtn.textContent = soundEnabled
    ? "🔊 Sound: ON"
    : "🔇 Sound: OFF";
});

// --------------------------------------------------
// CANVAS
// --------------------------------------------------

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  createSnowflakes();
}

window.addEventListener("resize", resizeCanvas);

// --------------------------------------------------
// SNOW ANIMATION
// --------------------------------------------------

function createSnowflakes() {
  snowflakes = [];

  for (let i = 0; i < 100; i++) {
    snowflakes.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 1 + Math.random() * 3,
      speed: 0.5 + Math.random() * 1.5
    });
  }
}

// --------------------------------------------------
// ALTITUDE, LEVEL, AND FLOOR
// --------------------------------------------------

function getAltitude() {
  if (!player) return 0;

  return Math.max(0, Math.floor(550 - player.y));
}

// The score determines the level.
function getLevelNumber(value) {
  if (value >= 10000) return 8;
  if (value >= 5000) return 7;
  if (value >= 2000) return 6;
  if (value >= 1000) return 5;
  if (value >= 500) return 4;
  if (value >= 250) return 3;
  if (value >= 100) return 2;

  return 1;
}

// The floor number follows the current level.
function getFloorNumber() {
  return getLevelNumber(score);
}

function getLevelName(value) {
  const level = getLevelNumber(value);

  if (level === 8) {
    return "Level 8 - Impossible";
  }

  return "Level " + level;
}

function updateHUD() {
  scoreElement.textContent = score;
  difficultyElement.textContent = getLevelName(score);

  doubleJumpElement.textContent =
    player && player.canDoubleJump ? "READY" : "USED";

  floorCountElement.textContent = getFloorNumber();
  altitudeElement.textContent = getAltitude();
}

// --------------------------------------------------
// PARTICLES
// --------------------------------------------------

function spawnParticles(x, y, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3,
      life: 350 + Math.random() * 250,
      size: 2 + Math.random() * 4
    });
  }
}

function updateParticles(frameScale, elapsedMs) {
  for (const particle of particles) {
    particle.x += particle.vx * frameScale;
    particle.y += particle.vy * frameScale;
    particle.vy += 0.08 * frameScale;
    particle.life -= elapsedMs;
  }

  particles = particles.filter(particle => particle.life > 0);
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.min(1, particle.life / 250);
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(
      particle.x,
      particle.y - cameraY,
      particle.size,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

// --------------------------------------------------
// BACKGROUND AND MOUNTAINS
// --------------------------------------------------

function drawMountainLayer(color, parallax, peakHeight, offset) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const shift = (cameraY * parallax) % (width * 0.8);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);

  for (let x = -width; x <= width * 2; x += width / 4) {
    const adjustedX = x - shift;
    const wave = Math.sin(x * 0.004 + offset) * 40;
    const peakY = height - peakHeight - wave;

    ctx.lineTo(adjustedX, peakY);
    ctx.lineTo(adjustedX + width / 8, height);
  }

  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
}

function drawBackground(elapsedMs) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const altitude = getAltitude();

  let topColor;
  let middleColor;
  let bottomColor;
  let mountain1;
  let mountain2;
  let mountain3;

  if (altitude < 500) {
    topColor = "#74c8f2";
    middleColor = "#c7efff";
    bottomColor = "#f3fcff";

    mountain1 = "#a6d9f0";
    mountain2 = "#80c3e2";
    mountain3 = "#d9f3ff";
  } else if (altitude < 1500) {
    topColor = "#397dbb";
    middleColor = "#8dcaf0";
    bottomColor = "#e5f7ff";

    mountain1 = "#659cc9";
    mountain2 = "#8ec8e8";
    mountain3 = "#d4f1ff";
  } else if (altitude < 3000) {
    topColor = "#414b89";
    middleColor = "#8aabd9";
    bottomColor = "#e4efff";

    mountain1 = "#606eae";
    mountain2 = "#8da9d2";
    mountain3 = "#d7e6ff";
  } else {
    topColor = "#202b60";
    middleColor = "#596fa8";
    bottomColor = "#c8e6ff";

    mountain1 = "#394c87";
    mountain2 = "#657fb8";
    mountain3 = "#b4d6f4";
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, height);

  gradient.addColorStop(0, topColor);
  gradient.addColorStop(0.55, middleColor);
  gradient.addColorStop(1, bottomColor);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawMountainLayer(mountain1, 0.12, 240, 0.15);
  drawMountainLayer(mountain2, 0.24, 320, 0.3);
  drawMountainLayer(mountain3, 0.36, 400, 0.48);

  if (altitude >= 1500) {
    ctx.fillStyle = "#ffffffbb";

    for (let i = 0; i < 45; i++) {
      const x = (i * 137.5) % width;
      const y = (i * 67.3) % (height * 0.72);
      const size = i % 4 === 0 ? 2 : 1;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Falling snow.
  ctx.fillStyle = "#ffffffc9";

  const frameScale = Math.min(elapsedMs / 16.67, 2.5);

  for (const flake of snowflakes) {
    flake.y += flake.speed * frameScale;
    flake.x += Math.sin(flake.y * 0.015) * 0.35 * frameScale;

    if (flake.y > height) {
      flake.y = -5;
      flake.x = Math.random() * width;
    }

    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --------------------------------------------------
// START AND RESTART
// --------------------------------------------------

function startGame() {
  initializeAudio();

  createInitialPlatforms();

  player = createPlayer();

  player.x = Math.max(
    0,
    Math.min(
      window.innerWidth - player.width,
      window.innerWidth * 0.2
    )
  );

  player.y = 550 - player.height;

  cameraY = Math.max(
    0,
    player.y - window.innerHeight * 0.55
  );

  score = 0;
  scoredPlatformIds = new Set();
  particles = [];

  gameOver = false;
  gameStarted = true;
  jumpRequested = false;

  keys.left = false;
  keys.right = false;

  panelTitle.textContent = "❄️ IceTower";

  panelText.textContent =
    "Climb the frozen tower! Land on blue ice tiles, " +
    "explore higher floors, and use your double jump " +
    "to reach the top.";

  startBtn.textContent = "Start Climbing";
  overlay.style.display = "none";

  updateHUD();
}

startBtn.addEventListener("click", startGame);

// --------------------------------------------------
// GAME OVER
// --------------------------------------------------

function finishGame() {
  if (gameOver) return;

  gameOver = true;
  gameStarted = false;

  playGameSound("gameOver");

  if (score > bestScore) {
    bestScore = score;
    bestElement.textContent = bestScore;

    try {
      localStorage.setItem("icetower-best", String(bestScore));
    } catch (error) {
      // Continue if storage is unavailable.
    }
  }

  panelTitle.textContent = "❄️ Game Over!";

  panelText.textContent =
    "Your score: " + score +
    " points. You reached Floor " + getFloorNumber() +
    " at " + getAltitude() +
    " meters! Try again and climb higher.";

  startBtn.textContent = "Play Again";
  overlay.style.display = "flex";
}

// --------------------------------------------------
// UPDATE GAME
// --------------------------------------------------

function updateGame(elapsedMs) {
  if (!gameStarted || gameOver) return;

  const frameScale = Math.min(elapsedMs / 16.67, 2.5);

  updatePlatforms(frameScale, elapsedMs);
  updatePlayerMovement(player, frameScale);
  attemptJump(player, gameStarted, gameOver);

  const previousY = player.y;
  const previousBottom = previousY + player.height;
  const wasGrounded = player.onGround;
  const previousPlatformId = player.platformId;

  player.vy += settings.gravity * frameScale;
  player.vy = Math.min(player.vy, settings.maxFallSpeed);
  player.y += player.vy * frameScale;

  player.onGround = false;

  // Keep the player inside the screen horizontally.
  if (player.x < 0) {
    player.x = 0;
    player.vx = Math.max(0, player.vx);
  }

  if (player.x + player.width > window.innerWidth) {
    player.x = Math.max(
      0,
      window.innerWidth - player.width
    );

    player.vx = Math.min(0, player.vx);
  }

  // Check for platform landing while falling.
  if (player.vy >= 0) {
    const currentBottom = player.y + player.height;

    for (const platform of platforms) {
      if (platform.gone) continue;

      const playerLeft = player.x + 4;
      const playerRight = player.x + player.width - 4;

      const horizontalOverlap =
        playerRight > platform.x &&
        playerLeft < platform.x + platform.width;

      const crossedTop =
        previousBottom <= platform.y + 3 &&
        currentBottom >= platform.y &&
        previousY + player.height <= platform.y + 12;

      if (horizontalOverlap && crossedTop) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.onGround = true;
        player.platformId = platform.id;
        player.canDoubleJump = true;

        if (platform.type === "moving") {
          player.x += platform.dx;

          player.x = Math.max(
            0,
            Math.min(
              window.innerWidth - player.width,
              player.x
            )
          );
        }

        if (
          platform.type === "crumble" &&
          platform.crumbleTimer === null
        ) {
          platform.crumbleTimer = 500;
        }

        if (
          !wasGrounded ||
          previousPlatformId !== platform.id
        ) {
          playGameSound("land");

          spawnParticles(
            player.x + player.width / 2,
            platform.y,
            6
          );
        }

        break;
      }
    }
  }

  if (!player.onGround) {
    player.platformId = null;
  }

  // Give one point for each newly reached non-start platform.
  if (player.onGround && player.platformId !== null) {
    const platform = platforms.find(
      p => p.id === player.platformId && !p.gone
    );

    if (
      platform &&
      platform.type !== "start" &&
      !scoredPlatformIds.has(platform.id)
    ) {
      scoredPlatformIds.add(platform.id);
      score += 1;
    }
  }

  // Floor and level update from the score.
  updateHUD();

  // Generate more platforms above the camera.
  generatePlatformsAbove(cameraY);

  // Smooth camera movement.
  const targetCamera = player.y - window.innerHeight * 0.45;

  if (targetCamera < cameraY) {
    cameraY += (targetCamera - cameraY) * 0.10 * frameScale;
  }

  // Remove old platforms below the screen.
  platforms = platforms.filter(
    p =>
      p.type === "start" ||
      p.y - cameraY < window.innerHeight + 400
  );

  updateParticles(frameScale, elapsedMs);

  if (player.y - cameraY > window.innerHeight + 100) {
    finishGame();
  }
}

// --------------------------------------------------
// RENDER
// --------------------------------------------------

function renderGame(elapsedMs) {
  drawBackground(elapsedMs);
  drawPlatforms(ctx, cameraY);

  if (player) {
    drawPlayer(ctx, player, cameraY);
  }

  drawParticles();
}

// --------------------------------------------------
// GAME LOOP
// --------------------------------------------------

function gameLoop(timestamp) {
  const elapsedMs = lastTime === 0
    ? 16.67
    : Math.min(timestamp - lastTime, 50);

  lastTime = timestamp;

  updateGame(elapsedMs);
  renderGame(elapsedMs);

  requestAnimationFrame(gameLoop);
}

// --------------------------------------------------
// INITIALIZE
// --------------------------------------------------

resizeCanvas();
createInitialPlatforms();

player = createPlayer();

player.x = Math.max(
  0,
  Math.min(
    window.innerWidth - player.width,
    window.innerWidth * 0.2
  )
);

player.y = 550 - player.height;

updateHUD();

requestAnimationFrame(gameLoop);
