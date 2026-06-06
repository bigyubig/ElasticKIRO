/**
 * EntityManager.js — Owns the ball, the active pipe, and the supply queue.
 *
 * There is exactly one active pipe (player-controlled) plus a queue of upcoming
 * pipes shown on the right. On every bounce the active pipe is replaced by the
 * front of the queue, and a fresh random pipe is appended at the bottom.
 */

import CONFIG from '../config.js';
import { Ghosty } from '../entities/Ghosty.js';
import { Pipe } from '../entities/Pipe.js';

const FPS = 60;

export class EntityManager {
  /**
   * @param {HTMLCanvasElement} canvas      - The game canvas element
   * @param {number}            scaleFactor - Current scale factor
   */
  constructor(canvas, scaleFactor) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;
    /** @type {number} */
    this.scaleFactor = scaleFactor;

    /** @type {Ghosty|null} */
    this._ball = null;
    /** @type {Pipe|null} */
    this._activePipe = null;
    /** @type {Pipe[]} Upcoming pipes; index 0 is next to enter play. */
    this._queue = [];

    /** @type {number} Survival time accumulator, in frames. */
    this.elapsedFrames = 0;
  }

  // ── Scaled dimensions ──────────────────────────────────────────────────────

  /** @returns {number} */
  _pipeLength() {
    return CONFIG.pipeLength * this.scaleFactor;
  }

  /** @returns {number} */
  _pipeThickness() {
    return CONFIG.pipeThickness * this.scaleFactor;
  }

  /** @returns {number} Vertical center of the active pipe. */
  _pipeCenterY() {
    return this.canvas.height - CONFIG.pipeCenterYOffset * this.scaleFactor;
  }

  /** @returns {number} */
  _ballRadius() {
    return CONFIG.ballRadius * this.scaleFactor;
  }

  /** @returns {number} A random allowed pipe angle in degrees. */
  _randomAngle() {
    const angles = CONFIG.pipeAngles;
    return angles[Math.floor(Math.random() * angles.length)];
  }

  /**
   * Pick a random pipe color that is different from avoidColor.
   * @param {string|null} avoidColor
   * @returns {string}
   */
  _randomColor(avoidColor) {
    const colors = CONFIG.pipeColors;
    const choices = avoidColor ? colors.filter(c => c !== avoidColor) : colors;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  /**
   * Build a pipe at a given center/angle using current scaled dimensions.
   * @param {number} angle
   * @param {number} centerX
   * @param {number} centerY
   * @param {string|null} [avoidColor=null] - Color to exclude (no consecutive repeat)
   * @returns {Pipe}
   */
  _makePipe(angle, centerX, centerY, avoidColor = null) {
    const pipe = new Pipe(centerX, centerY, angle, this._pipeLength(), this._pipeThickness());
    pipe.color = this._randomColor(avoidColor);
    return pipe;
  }

  // ── Ball ───────────────────────────────────────────────────────────────────

  /**
   * Creates the ball at top-center with a small downward velocity.
   * @returns {Ghosty}
   */
  createBall() {
    const r = this._ballRadius();
    const cx = this.canvas.width / 2;
    const cy = r + 10 * this.scaleFactor;
    this._ball = new Ghosty(cx - r, cy - r, r);
    this._ball.velocityX = 0;
    this._ball.velocityY = 1.5;
    return this._ball;
  }

  /** @returns {Ghosty|null} */
  getBall() {
    return this._ball;
  }

  /** Backwards-compatible alias. @returns {Ghosty|null} */
  getGhosty() {
    return this._ball;
  }

  // ── Pipes ──────────────────────────────────────────────────────────────────

  /**
   * Creates the active pipe (centered) and fills the queue with random pipes.
   * Colors are chained so no two consecutive pipes share the same color.
   * The active pipe is activePipeLengthScale × longer than queue pipes.
   */
  initPipes() {
    this._activePipe = this._makePipe(
      this._randomAngle(),
      this.canvas.width / 2,
      this._pipeCenterY()
    );
    this._activePipe.length = this._pipeLength() * CONFIG.activePipeLengthScale;

    this._queue = [];
    let prevColor = this._activePipe.color;
    for (let i = 0; i < CONFIG.queueSize; i++) {
      const pipe = this._makePipe(this._randomAngle(), 0, 0, prevColor);
      this._queue.push(pipe);
      prevColor = pipe.color;
    }
  }

  /** @returns {Pipe|null} */
  getActivePipe() {
    return this._activePipe;
  }

  /** @returns {Pipe[]} A copy of the upcoming-pipe queue (index 0 = next). */
  getQueue() {
    return [...this._queue];
  }

  /**
   * Replaces the active pipe with the front of the queue (preserving the
   * current horizontal position so control feels continuous) and appends a
   * fresh random pipe at the bottom of the queue.
   * @returns {Pipe|null} The new active pipe.
   */
  swapPipe() {
    if (this._queue.length === 0) return this._activePipe;

    const prevCenterX = this._activePipe ? this._activePipe.centerX : this.canvas.width / 2;
    const next = this._queue.shift();

    // Active pipe is 1.5× the base length.
    next.length = this._pipeLength() * CONFIG.activePipeLengthScale;
    next.thickness = this._pipeThickness();
    next.centerY = this._pipeCenterY();
    next.centerX = prevCenterX;
    next.x = prevCenterX;
    // Re-clamp in case the new angle has a larger footprint at this position.
    next.moveBy(0, this.canvas.width);

    this._activePipe = next;

    // New tail of the queue must differ in color from the current last item.
    const tailColor = this._queue.length > 0
      ? this._queue[this._queue.length - 1].color
      : next.color;
    this._queue.push(this._makePipe(this._randomAngle(), 0, 0, tailColor));

    return this._activePipe;
  }

  /**
   * Slides the active pipe horizontally by a direction and speed.
   * @param {number} dir - -1 for left, +1 for right, 0 for none
   * @param {number} [deltaTime=1]
   */
  moveActivePipe(dir, deltaTime = 1) {
    if (!this._activePipe || dir === 0) return;
    const dx = dir * CONFIG.pipeMoveSpeed * this.scaleFactor * deltaTime;
    this._activePipe.moveBy(dx, this.canvas.width);
  }

  /**
   * Move the active pipe so its center aligns with the given canvas-relative X,
   * clamped so the bar stays fully on screen.  Used for touch/tap control.
   * @param {number} canvasX - Target canvas X in pixels
   */
  setActivePipeX(canvasX) {
    if (!this._activePipe) return;
    const dx = canvasX - this._activePipe.centerX;
    this._activePipe.moveBy(dx, this.canvas.width);
  }

  // ── Score / time ─────────────────────────────────────────────────────────

  /**
   * Advances the survival timer. Call once per frame while PLAYING.
   * @param {number} [deltaTime=1]
   */
  update(deltaTime = 1) {
    this.elapsedFrames += deltaTime;
  }

  /** @returns {number} Survival time in seconds (one-decimal precision). */
  getElapsedSeconds() {
    return Math.round((this.elapsedFrames / FPS) * 10) / 10;
  }

  /** @returns {number} The current score (survival seconds). */
  getScore() {
    return this.getElapsedSeconds();
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  /**
   * Resets to a fresh session: new ball, new active pipe + queue, timer at 0.
   */
  reset() {
    this.elapsedFrames = 0;
    this.createBall();
    this.initPipes();
  }

  // ── Scale ──────────────────────────────────────────────────────────────────

  /**
   * Updates the scale factor used when sizing new entities.
   * @param {number} scaleFactor
   */
  setScaleFactor(scaleFactor) {
    this.scaleFactor = scaleFactor;
  }
}

export default EntityManager;
