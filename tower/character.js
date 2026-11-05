
const settings = {
  maxSpeed: 6.2,
  acceleration: 0.62,
  friction: 0.82,
  gravity: 0.32,
  maxFallSpeed: 10.5,
  jumpPower: 9.8,
  doubleJumpPower: 9.0
};

function createPlayer() {
  return {
    x: 100,
    y: 450,
    width: 34,
    height: 46,
    vx: 0,
    vy: 0,
    onGround: false,
    canDoubleJump: true,
    platformId: null,
    facing: 1,
    animTime: 0,
    squashX: 1,
    squashY: 1
  };
}

function updatePlayerMovement(player, frameScale) {
  if (keys.left) {
    player.vx -= settings.acceleration * frameScale;
    player.facing = -1;
  }

  if (keys.right) {
    player.vx += settings.acceleration * frameScale;
    player.facing = 1;
  }

  if (!keys.left && !keys.right) {
    player.vx *= Math.pow(settings.friction, frameScale);
  }

  player.vx = Math.max(
    -settings.maxSpeed,
    Math.min(settings.maxSpeed, player.vx)
  );

  if (Math.abs(player.vx) < 0.04) {
    player.vx = 0;
  }

  player.x += player.vx * frameScale;
  player.animTime += Math.abs(player.vx) * 0.08 * frameScale;

  player.squashX += (1 - player.squashX) * 0.2 * frameScale;
  player.squashY += (1 - player.squashY) * 0.2 * frameScale;
}

function attemptJump(player, gameStarted, gameOver) {
  if (!jumpRequested) return;

  jumpRequested = false;

  if (!gameStarted || gameOver) return;

  if (player.onGround) {
    player.vy = -settings.jumpPower;
    player.onGround = false;
    player.platformId = null;
    player.squashX = 1.15;
    player.squashY = 0.85;

    playGameSound("jump");
  } else if (player.canDoubleJump) {
    player.vy = -settings.doubleJumpPower;
    player.canDoubleJump = false;
    player.platformId = null;
    player.squashX = 0.85;
    player.squashY = 1.15;

    playGameSound("doubleJump");
  }
}

function drawPlayer(ctx, player, cameraY) {
  const screenY = player.y - cameraY;

  const runAmount = player.onGround
    ? Math.sin(player.animTime) * 3
    : 0;

  ctx.save();

  ctx.translate(
    player.x + player.width / 2,
    screenY + player.height / 2
  );

  ctx.scale(player.facing, 1);
  ctx.scale(player.squashX, player.squashY);

  // Shadow
  ctx.fillStyle = "#497b9b33";
  ctx.beginPath();
  ctx.ellipse(
    0, player.height / 2 + 3,
    15, 4, 0, 0, Math.PI * 2
  );
  ctx.fill();

  // Body
  ctx.fillStyle = "#197db7";
  ctx.beginPath();
  ctx.roundRect(-13, -10, 26, 27, 9);
  ctx.fill();

  // Face
  ctx.fillStyle = "#ffdbb8";
  ctx.beginPath();
  ctx.arc(0, -14, 13, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = "#4b5267";
  ctx.beginPath();
  ctx.arc(0, -19, 13, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -20, 5, 9);

  // Eye
  ctx.fillStyle = "#20384b";
  ctx.beginPath();
  ctx.arc(4, -14, 1.7, 0, Math.PI * 2);
  ctx.fill();

  // Scarf
  ctx.fillStyle = "#f06f9c";
  ctx.fillRect(-12, -5, 24, 5);
  ctx.fillRect(5, -1, 5, 11);

  // Animated legs
  ctx.strokeStyle = "#244d79";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-6, 16);
  ctx.lineTo(-7 + runAmount, 23);
  ctx.moveTo(6, 16);
  ctx.lineTo(7 - runAmount, 23);
  ctx.stroke();

  ctx.restore();
}
