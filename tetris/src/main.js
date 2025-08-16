// ====== Utilidades ======
class RNGBag {
  constructor() {
    this.bag = [];
    this.refill();
  }
  refill() {
    this.bag = ["I", "O", "T", "S", "Z", "J", "L"];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }
  next() {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop();
  }
}

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const COLORS = {
  I: "#60d7fb",
  O: "#f9df6d",
  T: "#c77dff",
  S: "#55efc4",
  Z: "#ff7675",
  J: "#74b9ff",
  L: "#fdcb6e",
  GHOST: (figure) => {
    const color = transformHexaToRgb(figure);
    return `rgba(${color},.15)`;
  },
};

// ====== Clases del Dominio ======
class Tetromino {
  constructor(type) {
    this.type = type;
    this.matrix = Tetromino.clone(SHAPES[type]);
    this.x = 3;
    this.y = 0;
    this.color = COLORS[type];
  }
  static clone(m) {
    return m.map((r) => r.slice());
  }
  rotate(dir = 1) {
    const m = this.matrix;
    const N = m.length;
    const res = Array.from({ length: N }, () => Array(N).fill(0));
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const nx = dir === 1 ? N - 1 - y : y;
        const ny = dir === 1 ? x : N - 1 - x;
        res[ny][nx] = m[y][x];
      }
    this.matrix = res;
  }
  forEachCell(cb) {
    const N = this.matrix.length;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (this.matrix[y][x]) cb(this.x + x, this.y + y);
      }
  }
}

class Board {
  constructor(w = 10, h = 20) {
    this.w = w;
    this.h = h;
    this.grid = Array.from({ length: h }, () => Array(w).fill(null));
  }
  inside(x, y) {
    return x >= 0 && x < this.w && y < this.h;
  }
  empty(x, y) {
    return y < 0 || (this.inside(x, y) && this.grid[y][x] === null);
  }
  canPlace(piece) {
    let ok = true;
    piece.forEachCell((x, y) => {
      if (!this.empty(x, y)) ok = false;
    });
    return ok;
  }
  lock(piece) {
    piece.forEachCell((x, y) => {
      if (y >= 0) this.grid[y][x] = piece.color;
    });
    const cleared = this.clearLines();
    return cleared;
  }
  clearLines() {
    let lines = 0;
    for (let y = this.h - 1; y >= 0; y--) {
      if (this.grid[y].every((c) => c !== null)) {
        this.grid.splice(y, 1);
        this.grid.unshift(Array(this.w).fill(null));
        lines++;
        y++;
      }
    }
    return lines;
  }
}

class Renderer {
  constructor(boardCanvas, nextCanvas) {
    this.ctx = boardCanvas.getContext("2d");
    this.nctx = nextCanvas.getContext("2d");
    this.canvas = boardCanvas;
    this.cell = Math.floor(boardCanvas.width / 10);
    this.ctx.imageSmoothingEnabled = false;
    this.nctx.imageSmoothingEnabled = false;
  }
  drawBoard(board) {
    const { ctx, cell } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < board.h; y++)
      for (let x = 0; x < board.w; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#0f142b" : "#0c1124";
        ctx.fillRect(x * cell, y * cell, cell, cell);
        const color = board.grid[y][x];
        if (color) this.block(x, y, color);
      }
  }
  block(x, y, color) {
    const { ctx, cell } = this;
    const px = x * cell,
      py = y * cell;
    ctx.fillStyle = color;
    ctx.fillRect(px, py, cell, cell);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px, py, cell, cell * 0.25);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
  }
  drawPiece(piece, ghostY = null, nextFigure) {
    if (ghostY !== null) {
      piece.forEachCell((x, y) => {
        const figureColor = COLORS.GHOST(COLORS[nextFigure]);
        const gy = y + (ghostY - piece.y);
        this.block(x, gy, figureColor);
      });
    }
    piece.forEachCell((x, y) => this.block(x, y, piece.color));
  }
  drawNext(nextType) {
    const { nctx } = this;
    nctx.clearRect(0, 0, 120, 120);
    const mat = SHAPES[nextType];
    const size = mat.length;
    const cell = Math.floor(100 / size);
    const offsetX = Math.floor((120 - size * cell) / 2);
    const offsetY = Math.floor((120 - size * cell) / 2);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        nctx.fillStyle = "#0c1124";
        nctx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
        if (mat[y][x]) {
          nctx.fillStyle = COLORS[nextType];
          nctx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
          nctx.globalAlpha = 0.25;
          nctx.fillStyle = "#fff";
          nctx.fillRect(
            offsetX + x * cell,
            offsetY + y * cell,
            cell,
            cell * 0.25
          );
          nctx.globalAlpha = 1;
          nctx.strokeStyle = "rgba(0,0,0,.25)";
          nctx.strokeRect(
            offsetX + x * cell + 0.5,
            offsetY + y * cell + 0.5,
            cell - 1,
            cell - 1
          );
        }
      }
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById("board");
    this.nextCanvas = document.getElementById("next");
    this.scoreEl = document.getElementById("score");
    this.linesEl = document.getElementById("lines");
    this.levelEl = document.getElementById("level");

    this.board = new Board(10, 20);
    this.renderer = new Renderer(this.canvas, this.nextCanvas);
    this.rng = new RNGBag();

    this.current = null;
    this.nextType = this.rng.next();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 1000;
    this.dropAccumulator = 0;
    this.running = true;

    this.musicStarted = false;
    this.music = new Audio("src/assets/music.mp3");
    this.music.loop = true;

    this.globalVolume = 0.5;
    this.music.volume = this.globalVolume;

    this._bindEvents();

    this.spawn();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    const volumeSlider = document.getElementById("volume");
    if (volumeSlider) {
      volumeSlider.addEventListener("input", (e) => {
        this.setVolume(parseFloat(e.target.value));
      });
    }
  }

  setVolume(value) {
    this.globalVolume = Math.max(0, Math.min(1, value));
    this.music.volume = this.globalVolume;
  }
  _bindEvents() {
    addEventListener("keydown", (e) => {
      if (!this.musicStarted) {
        this.music.play();
        this.musicStarted = true;
      }
      // if (e.repeat) return;
      switch (e.code) {
        case "ArrowLeft":
          this.move(-1);
          break;
        case "ArrowRight":
          this.move(1);
          break;
        case "ArrowUp":
          this.rotate(1);
          break;
        case "ArrowDown":
          this.softDrop(true);
          break;
        case "Space":
          this.hardDrop();
          break;
        case "KeyP":
          this.togglePause();
          break;
        case "KeyR":
          this.reset();
          break;
      }
    });
    addEventListener("keyup", (e) => {
      if (e.code === "ArrowDown") this.softDrop(false);
    });
  }

  spawn() {
    this.current = new Tetromino(this.nextType);
    this.nextType = this.rng.next();
    console.log(this.board.canPlace(this.current), this.current);
    if (!this.board.canPlace(this.current)) {
      this.running = false;
      this.gameOverOverlayShown = false; // permite que el overlay se dibuje en loop
      return;
    }
  }

  move(dir) {
    if (!this.running) return;
    this.current.x += dir;
    if (!this.board.canPlace(this.current)) this.current.x -= dir;
  }

  rotate(dir) {
    if (!this.running) return;
    this.current.rotate(dir);
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      this.current.x += k;
      if (this.board.canPlace(this.current)) return;
      this.current.x -= k;
    }
    this.current.rotate(-dir);
  }

  softDrop(active) {
    this.dropInterval = active ? 50 : this.levelDropMs();
  }

  hardDrop() {
    if (!this.running) return;
    while (this.stepDown()) {}
  }

  levelDropMs() {
    return Math.max(1000 - (this.level - 1) * 75, 90);
  }

  stepDown() {
    this.current.y++;
    if (!this.board.canPlace(this.current)) {
      this.current.y--;
      const cleared = this.board.lock(this.current);
      this._scoring(cleared);
      this.spawn();
      return false;
    }
    return true;
  }

  _scoring(cleared) {
    const table = [0, 100, 300, 500, 800];
    this.score += table[cleared] * this.level;
    this.lines += cleared;
    const newLevel = 1 + Math.floor(this.lines / 10);
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.dropInterval = this.levelDropMs();
    }
    this._updateHUD();
  }

  _updateHUD() {
    this.scoreEl.textContent = this.score;
    this.linesEl.textContent = this.lines;
    this.levelEl.textContent = this.level;
    this.renderer.drawNext(this.nextType);
  }

  togglePause() {
    this.running = !this.running;
    if (!this.running) {
      this._draw(true, "PAUSA — Pulsa P");
    }
  }

  volumeUp() {
    this.music.volume = Math.min(1, this.music.volume + 0.1);
  }

  volumeDown() {
    this.music.volume = Math.max(0, this.music.volume - 0.1);
  }

  reset() {
    this.board = new Board(10, 20);
    this.rng = new RNGBag();
    this.current = null;
    this.nextType = this.rng.next();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 1000;
    this.running = true;
    this.spawn();
    this._updateHUD();
  }

  ghostY() {
    const test = new Tetromino(this.current.type);
    test.matrix = Tetromino.clone(this.current.matrix);
    test.x = this.current.x;
    test.y = this.current.y;
    while (true) {
      test.y++;
      if (!this.board.canPlace(test)) {
        test.y--;
        break;
      }
    }
    return test.y;
  }

  _draw(overlay = false, message = "") {
    this.renderer.drawBoard(this.board);
    if (this.current) {
      if (this.board.canPlace(this.current)) {
        const gy = this.ghostY();
        this.renderer.drawPiece(this.current, gy, this.current.type);
      }
    }
    if (overlay) {
      const ctx = this.renderer.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
      ctx.restore();
    }
  }

  loop(t) {
    const dt = t - this.lastTime;
    this.lastTime = t;

    if (this.running) {
      this.dropAccumulator += dt;
      if (this.dropAccumulator >= this.dropInterval) {
        this.stepDown();
        this.dropAccumulator = 0;
      }
    }

    // Siempre dibujar, aunque el juego no esté corriendo
    if (!this.running && this.current && !this.gameOverOverlayShown) {
      this._draw(true, "GAME OVER — Pulsa R");
      this.gameOverOverlayShown = true; // para que no redibuje todo el tiempo
    } else if (this.running) {
      this._draw();
    }

    requestAnimationFrame((tt) => this.loop(tt));
  }
}

window.addEventListener("load", () => {
  new Game();
});

function transformHexaToRgb(hexaCode) {
  const cleanHexaCode = hexaCode.split("#")[1];
  let rgbString = "";
  for (let i = 0; i < 6; i += 2) {
    const hex = `${cleanHexaCode[i]}${cleanHexaCode[i + 1]}`;
    rgbString += Number.parseInt(hex, 16);
    if (i < 4) {
      rgbString += ",";
    }
  }
  return rgbString;
}
