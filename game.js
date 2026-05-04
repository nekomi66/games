const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const comboEl = document.getElementById("combo");
const startBtn = document.getElementById("startBtn");

const gravity = 0.18;
const items = [];
const slashes = [];

let score = 0;
let lives = 3;
let combo = 0;
let running = false;
let spawnTimer = 0;
let pointerDown = false;
let gameOver = false;

class FlyingItem {
  constructor(isBomb = false) {
    this.isBomb = isBomb;
    this.radius = isBomb ? 24 : 26 + Math.random() * 14;
    this.x = 100 + Math.random() * (canvas.width - 200);
    this.y = canvas.height + this.radius;
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = -(8 + Math.random() * 4);
    this.sliced = false;
    this.color = isBomb
      ? "#1e1f26"
      : ["#ff5959", "#ffd166", "#70e000", "#4cc9f0"][Math.floor(Math.random() * 4)];
    this.emoji = isBomb ? "💣" : ["🍎", "🍊", "🍉", "🍋", "🍓"][Math.floor(Math.random() * 5)];
  }

  update() {
    this.vy += gravity;
    this.x += this.vx;
    this.y += this.vy;

    if (!this.sliced && this.y - this.radius > canvas.height + 5) {
      this.sliced = true;
      if (!this.isBomb) {
        lives -= 1;
        combo = 0;
      }
    }
  }

  draw() {
    if (this.sliced) return;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.font = `${this.radius}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y + 2);
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  combo = 0;
  gameOver = false;
  items.length = 0;
  slashes.length = 0;
}

function spawnWave() {
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i += 1) {
    items.push(new FlyingItem(Math.random() < 0.15));
  }
}

function updateUI() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  comboEl.textContent = combo;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const sx = x1 + t * (x2 - x1);
  const sy = y1 + t * (y2 - y1);
  return Math.hypot(px - sx, py - sy);
}

function checkSlice(x1, y1, x2, y2) {
  items.forEach((item) => {
    if (item.sliced) return;
    const d = distanceToSegment(item.x, item.y, x1, y1, x2, y2);
    if (d <= item.radius) {
      item.sliced = true;
      if (item.isBomb) {
        lives = 0;
      } else {
        combo += 1;
        score += 10 + Math.max(0, combo - 1) * 3;
      }
    }
  });
}

function drawSlashes() {
  slashes.forEach((line) => {
    ctx.strokeStyle = `rgba(255,255,255,${line.life})`;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
    line.life -= 0.05;
  });

  while (slashes.length && slashes[0].life <= 0) {
    slashes.shift();
  }
}

function drawOverlay() {
  if (!running || gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(gameOver ? "游戏结束" : "点击开始", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "24px sans-serif";
    ctx.fillText(`最终分数: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  spawnTimer -= 1;
  if (running && spawnTimer <= 0) {
    spawnWave();
    spawnTimer = Math.max(20, 65 - Math.floor(score / 30));
  }

  items.forEach((item) => {
    item.update();
    item.draw();
  });

  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].sliced) items.splice(i, 1);
  }

  drawSlashes();

  if (running && lives <= 0) {
    running = false;
    gameOver = true;
  }

  updateUI();
  drawOverlay();
  requestAnimationFrame(gameLoop);
}

function pointerPosition(evt) {
  const rect = canvas.getBoundingClientRect();
  const touch = evt.touches ? evt.touches[0] : evt;
  return {
    x: ((touch.clientX - rect.left) * canvas.width) / rect.width,
    y: ((touch.clientY - rect.top) * canvas.height) / rect.height,
  };
}

let lastPoint = null;

function startSlash(evt) {
  pointerDown = true;
  lastPoint = pointerPosition(evt);
}

function moveSlash(evt) {
  if (!pointerDown || !lastPoint || !running) return;
  const p = pointerPosition(evt);
  slashes.push({ x1: lastPoint.x, y1: lastPoint.y, x2: p.x, y2: p.y, life: 1 });
  checkSlice(lastPoint.x, lastPoint.y, p.x, p.y);
  lastPoint = p;
}

function endSlash() {
  pointerDown = false;
  lastPoint = null;
}

canvas.addEventListener("mousedown", startSlash);
canvas.addEventListener("mousemove", moveSlash);
window.addEventListener("mouseup", endSlash);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  startSlash(e);
});
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  moveSlash(e);
});
window.addEventListener("touchend", endSlash);

startBtn.addEventListener("click", () => {
  resetGame();
  running = true;
  spawnTimer = 15;
});

gameLoop();
