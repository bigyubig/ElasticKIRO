/**
 * Renderer.js — Handles all canvas drawing operations for Ghost Ball Bouncer.
 *
 * Rendering order per frame:
 *   1. Background
 *   2. Active pipe (rotated bar)
 *   3. Supply queue preview (right margin)
 *   4. Ball
 *   5. Score / UI text
 */

import CONFIG from '../config.js';

/**
 * Text position constants for renderText().
 */
export const TextPosition = Object.freeze({
  TOP_CENTER: 'top_center',
  MIDDLE_CENTER: 'middle_center',
  BOTTOM_CENTER: 'bottom_center',
});

export class Renderer {
  /**
   * @param {HTMLCanvasElement}        canvas
   * @param {CanvasRenderingContext2D} [ctx]
   * @param {number}                   [scaleFactor=1]
   */
  constructor(canvas, ctx, scaleFactor) {
    if (typeof ctx === 'number') {
      scaleFactor = ctx;
      ctx = null;
    }

    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;
    /** @type {CanvasRenderingContext2D} */
    this.ctx = ctx || canvas.getContext('2d');
    /** @type {number} */
    this.scaleFactor = (scaleFactor !== undefined && scaleFactor !== null) ? scaleFactor : 1;
  }

  // ── Scale helpers ───────────────────────────────────────────────────────

  /** @param {number} scaleFactor */
  setScaleFactor(scaleFactor) {
    this.scaleFactor = scaleFactor;
  }

  /** @param {number} [base=36] @returns {number} */
  _scaledFontSize(base = 36) {
    return Math.round(base * this.scaleFactor);
  }

  // ── Core draw primitives ────────────────────────────────────────────────

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  clearCanvas() {
    this.renderBackground();
  }

  renderBackground() {
    this.ctx.fillStyle = CONFIG.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Alias kept for compatibility */
  drawBackground() {
    this.renderBackground();
  }

  // ── Pipes ──────────────────────────────────────────────────────────────

  /**
   * Draw the active pipe (rotated bar).
   * @param {import('../entities/Pipe').Pipe} pipe
   */
  renderPipe(pipe) {
    if (pipe) pipe.render(this.ctx);
  }

  /**
   * Draw an array of pipes (kept for compatibility).
   * @param {import('../entities/Pipe').Pipe[]} pipes
   */
  renderPipes(pipes) {
    for (const pipe of pipes) this.renderPipe(pipe);
  }

  /** Alias kept for compatibility */
  drawPipes(pipes) {
    this.renderPipes(pipes);
  }

  /**
   * Draw the supply queue preview down the right margin. Index 0 (next to enter
   * play) is drawn at the bottom; the column fills upward. The "NEXT" label
   * sits directly above the bottom-most (next-up) pipe.
   * @param {import('../entities/Pipe').Pipe[]} queue
   */
  renderQueue(queue) {
    if (!queue || queue.length === 0) return;

    const ctx = this.ctx;
    const sf = this.scaleFactor;
    const previewLen = 70 * sf;
    const previewThick = 12 * sf;
    const rowSpacing = 46 * sf;
    const cx = this.canvas.width - 18 * sf - previewLen / 2;
    const bottomY = this.canvas.height - 28 * sf;

    for (let i = 0; i < queue.length; i++) {
      const pipe = queue[i];
      const cy = bottomY - i * rowSpacing;
      // All queue pipes render at their own color; next-to-enter is fully opaque.
      this._drawBar(cx, cy, pipe.angle, previewLen, previewThick, pipe.color, i === 0 ? 1 : 0.65);

      // "NEXT" label placed just above the bottom-most item (index 0).
      if (i === 0) {
        ctx.save();
        ctx.font = `bold ${Math.round(12 * sf)}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('NEXT', cx, cy - previewThick / 2 - 3 * sf);
        ctx.restore();
      }
    }
  }

  /**
   * Draw a single rotated bar.
   * @private
   */
  _drawBar(cx, cy, angleDeg, length, thickness, color, alpha = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate((angleDeg * Math.PI) / 180);
    ctx.fillStyle = color;
    const x = -length / 2;
    const y = -thickness / 2;
    const r = Math.min(thickness / 2, 6);
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, length, thickness, r);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, length, thickness);
    }
    ctx.restore();
  }

  // ── Ball ───────────────────────────────────────────────────────────────

  /**
   * Draw the ball.
   * @param {import('../entities/Ghosty').Ghosty} ball
   */
  renderGhosty(ball) {
    if (ball) ball.render(this.ctx);
  }

  /** Alias kept for compatibility */
  drawGhosty(ball) {
    this.renderGhosty(ball);
  }

  /** Alias for clarity */
  renderBall(ball) {
    this.renderGhosty(ball);
  }

  // ── Score / UI ─────────────────────────────────────────────────────────

  /**
   * Format a survival-time score (seconds) for display.
   * @param {number} score
   * @returns {string}
   * @private
   */
  _formatTime(score) {
    const n = typeof score === 'number' ? score : 0;
    return `${n.toFixed(1)}s`;
  }

  /**
   * Draw the current survival time near the top, with optional best below.
   * @param {number} score
   * @param {number} [highScore]
   */
  renderScore(score, highScore) {
    const ctx = this.ctx;
    const fontSize = this._scaledFontSize(36);

    ctx.save();
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, Math.round(3 * this.scaleFactor));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const x = this.canvas.width / 2;
    const y = Math.round(this.canvas.height * 0.05);

    const text = this._formatTime(score);
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);

    if (highScore !== undefined && highScore !== null) {
      const smallSize = this._scaledFontSize(20);
      ctx.font = `${smallSize}px Arial, sans-serif`;
      const by = y + fontSize + Math.round(4 * this.scaleFactor);
      ctx.strokeText(`Best: ${this._formatTime(highScore)}`, x, by);
      ctx.fillText(`Best: ${this._formatTime(highScore)}`, x, by);
    }

    ctx.restore();
  }

  /** Alias kept for compatibility */
  drawScore(score, highScore) {
    this.renderScore(score, highScore);
  }

  /**
   * @param {string} text
   * @param {string} position
   */
  renderText(text, position) {
    const ctx = this.ctx;
    const fontSize = this._scaledFontSize(24);

    ctx.save();
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, Math.round(2 * this.scaleFactor));
    ctx.textAlign = 'center';

    const x = this.canvas.width / 2;
    let y;

    switch (position) {
      case TextPosition.TOP_CENTER:
        ctx.textBaseline = 'top';
        y = Math.round(this.canvas.height * 0.1);
        break;
      case TextPosition.BOTTOM_CENTER:
        ctx.textBaseline = 'bottom';
        y = Math.round(this.canvas.height * 0.9);
        break;
      case TextPosition.MIDDLE_CENTER:
      default:
        ctx.textBaseline = 'middle';
        y = this.canvas.height / 2;
        break;
    }

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ── Composite screen renders ────────────────────────────────────────────

  /**
   * Draw the game-over overlay showing final time and best.
   * @param {number} score
   * @param {number} highScore
   */
  renderGameOver(score, highScore) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();

    const headingSize = this._scaledFontSize(48);
    ctx.save();
    ctx.font = `bold ${headingSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ff4444';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, Math.round(3 * this.scaleFactor));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('Game Over', cw / 2, ch * 0.35);
    ctx.fillText('Game Over', cw / 2, ch * 0.35);
    ctx.restore();

    const scoreSize = this._scaledFontSize(28);
    ctx.save();
    ctx.font = `${scoreSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, Math.round(2 * this.scaleFactor));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(`Time: ${this._formatTime(score)}`, cw / 2, ch * 0.48);
    ctx.fillText(`Time: ${this._formatTime(score)}`, cw / 2, ch * 0.48);
    ctx.strokeText(`Best: ${this._formatTime(highScore)}`, cw / 2, ch * 0.56);
    ctx.fillText(`Best: ${this._formatTime(highScore)}`, cw / 2, ch * 0.56);
    ctx.restore();

    const hintSize = this._scaledFontSize(20);
    ctx.save();
    ctx.font = `${hintSize}px Arial, sans-serif`;
    ctx.fillStyle = '#dddddd';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, Math.round(1 * this.scaleFactor));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('Tap or press Space to restart', cw / 2, ch * 0.68);
    ctx.fillText('Tap or press Space to restart', cw / 2, ch * 0.68);
    ctx.restore();
  }

  /** Alias kept for compatibility */
  drawGameOver(score, highScore) {
    this.renderGameOver(score, highScore);
  }

  /**
   * Draw the waiting / menu screen.
   */
  renderWaitingScreen() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    const titleSize = this._scaledFontSize(40);
    ctx.save();
    ctx.font = `bold ${titleSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, Math.round(3 * this.scaleFactor));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('ElasticKIRO', cw / 2, ch * 0.32);
    ctx.fillText('ElasticKIRO', cw / 2, ch * 0.32);
    ctx.restore();

    const hintSize = this._scaledFontSize(22);
    ctx.save();
    ctx.font = `${hintSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, Math.round(2 * this.scaleFactor));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('Tap or press Space to start', cw / 2, ch * 0.52);
    ctx.fillText('Tap or press Space to start', cw / 2, ch * 0.52);
    ctx.strokeText('Use \u2190 / \u2192 (or A / D) to move the pipe', cw / 2, ch * 0.6);
    ctx.fillText('Use \u2190 / \u2192 (or A / D) to move the pipe', cw / 2, ch * 0.6);
    ctx.restore();
  }

  /** Alias kept for compatibility */
  drawWaitingScreen() {
    this.renderWaitingScreen();
  }

  /** Alias for the menu/waiting screen. */
  drawMenu() {
    this.renderWaitingScreen();
  }
}

export default Renderer;
