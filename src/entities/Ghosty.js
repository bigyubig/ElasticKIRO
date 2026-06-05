/**
 * Ghosty.js — The player ghost, now a falling ball that bounces off pipes.
 *
 * The ball moves in 2D under gravity. Its position is stored as the top-left of
 * the bounding box (consistent with Entity), with a radius for circular
 * collision. Rotation is purely cosmetic (rolls based on horizontal motion).
 */

import { Entity } from './Entity.js';
import CONFIG from '../config.js';

export class Ghosty extends Entity {
  /**
   * @param {number} x        - Initial top-left x of the bounding box
   * @param {number} y        - Initial top-left y of the bounding box
   * @param {number} [radius] - Collision radius in pixels
   */
  constructor(x, y, radius = CONFIG.ballRadius) {
    super(x, y, radius * 2, radius * 2, 0, 0);

    /** @type {number} Collision radius in pixels. */
    this.radius = radius;

    /** @type {HTMLImageElement|null} Loaded sprite (set externally). */
    this.sprite = null;

    /** @type {number} Cosmetic rolling rotation in degrees. */
    this.rotation = 0;
  }

  /**
   * Center of the ball.
   * @returns {{x: number, y: number}}
   */
  getCenter() {
    return { x: this.x + this.radius, y: this.y + this.radius };
  }

  /**
   * Move the ball so its center sits at (cx, cy).
   * @param {number} cx
   * @param {number} cy
   */
  setCenter(cx, cy) {
    this.x = cx - this.radius;
    this.y = cy - this.radius;
  }

  /**
   * Clamp the velocity vector magnitude to CONFIG.maxSpeed.
   */
  clampSpeed() {
    const speed = Math.hypot(this.velocityX, this.velocityY);
    if (speed > CONFIG.maxSpeed && speed > 0) {
      const scale = CONFIG.maxSpeed / speed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }
  }

  /**
   * Advances the ball one frame: gravity, speed clamp, position integration,
   * and a cosmetic rolling rotation driven by horizontal velocity.
   * @param {number} [deltaTime=1] - Time step in frames
   */
  update(deltaTime = 1) {
    this.velocityY += CONFIG.gravity * deltaTime;
    this.clampSpeed();
    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;
    this.rotation += this.velocityX * deltaTime;
  }

  /**
   * Renders the ball centered on its bounding box with rolling rotation.
   * Falls back to a filled circle when the sprite is not yet loaded.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const c = this.getCenter();

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    if (this.sprite) {
      ctx.drawImage(
        this.sprite,
        -this.radius,
        -this.radius,
        this.radius * 2,
        this.radius * 2
      );
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export default Ghosty;
