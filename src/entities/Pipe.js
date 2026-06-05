/**
 * Pipe.js — Angled paddle the player slides left/right along the bottom.
 *
 * A pipe is a rotated bar defined by its center, tilt angle, length, and
 * thickness. The ball reflects off the bar's upward-facing surface, so the
 * tilt angle determines the bounce direction.
 */

import { Entity } from './Entity.js';
import CONFIG from '../config.js';

const DEG_TO_RAD = Math.PI / 180;

export class Pipe extends Entity {
  /**
   * @param {number} centerX   - Horizontal center of the bar
   * @param {number} centerY   - Vertical center of the bar
   * @param {number} angle     - Tilt angle in degrees (0 = horizontal)
   * @param {number} length    - Length of the bar in pixels
   * @param {number} thickness - Thickness of the bar in pixels
   */
  constructor(centerX, centerY, angle, length, thickness) {
    // Base Entity x/y/width/height describe the axis-aligned bounding box;
    // they are derived lazily, so we only need the rotated description here.
    super(centerX, centerY, length, thickness, 0, 0);

    /** @type {number} Horizontal center of the bar */
    this.centerX = centerX;
    /** @type {number} Vertical center of the bar */
    this.centerY = centerY;
    /** @type {number} Tilt angle in degrees */
    this.angle = angle;
    /** @type {number} Length of the bar */
    this.length = length;
    /** @type {number} Thickness of the bar */
    this.thickness = thickness;
    /** @type {string} Fill color (set by EntityManager) */
    this.color = CONFIG.pipeColors[0];
  }

  /**
   * Unit direction vector pointing along the length of the bar.
   * @returns {{x: number, y: number}}
   */
  getDirection() {
    const a = this.angle * DEG_TO_RAD;
    return { x: Math.cos(a), y: Math.sin(a) };
  }

  /**
   * Returns the two endpoints of the bar's centerline.
   * @returns {{ax:number, ay:number, bx:number, by:number}}
   */
  getSegment() {
    const d = this.getDirection();
    const hx = (d.x * this.length) / 2;
    const hy = (d.y * this.length) / 2;
    return {
      ax: this.centerX - hx,
      ay: this.centerY - hy,
      bx: this.centerX + hx,
      by: this.centerY + hy,
    };
  }

  /**
   * Returns the upward-facing unit normal of the bar (y component <= 0),
   * used to reflect the ball so it always bounces up.
   * @returns {{x: number, y: number}}
   */
  getNormal() {
    const a = this.angle * DEG_TO_RAD;
    // Perpendicular to (cos, sin) with a non-positive y component.
    return { x: Math.sin(a), y: -Math.cos(a) };
  }

  /**
   * Half of the bar's horizontal footprint (accounts for length and thickness
   * once rotated), used to keep the whole bar inside the view.
   * @returns {number}
   * @private
   */
  _halfWidthExtent() {
    const a = this.angle * DEG_TO_RAD;
    return (
      (this.length / 2) * Math.abs(Math.cos(a)) +
      (this.thickness / 2) * Math.abs(Math.sin(a))
    );
  }

  /**
   * Slide the bar horizontally by dx, clamping so it stays fully on screen.
   * @param {number} dx          - Horizontal delta in pixels
   * @param {number} canvasWidth - Canvas width for clamping
   */
  moveBy(dx, canvasWidth) {
    const halfW = this._halfWidthExtent();
    let next = this.centerX + dx;
    const min = halfW;
    const max = canvasWidth - halfW;
    if (next < min) next = min;
    if (next > max) next = max;
    this.centerX = next;
    this.x = next;
  }

  /**
   * No autonomous movement; the player drives the bar via moveBy().
   * @param {number} [deltaTime=1]
   */
  // eslint-disable-next-line no-unused-vars
  update(deltaTime = 1) {}

  /**
   * Renders the bar as a rotated rounded rectangle.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} [color] - Optional fill color override (for queue previews)
   */
  render(ctx, color) {
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.angle * DEG_TO_RAD);

    ctx.fillStyle = color || this.color;
    const x = -this.length / 2;
    const y = -this.thickness / 2;
    const r = Math.min(this.thickness / 2, 8);

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, this.length, this.thickness, r);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, this.length, this.thickness);
    }

    ctx.restore();
  }
}

export default Pipe;
