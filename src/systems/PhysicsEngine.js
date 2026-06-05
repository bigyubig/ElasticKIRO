/**
 * PhysicsEngine.js — Gravity, velocity integration, speed clamping, and
 * reflection of the ball off an angled surface.
 */

import CONFIG from '../config.js';

/**
 * @typedef {Object} PhysicsConfig
 * @property {number} gravity     - Gravitational acceleration (px/frame²)
 * @property {number} maxSpeed    - Maximum speed magnitude (px/frame)
 * @property {number} restitution - Fraction of speed kept after a bounce (0..1)
 */

export class PhysicsEngine {
  /**
   * @param {Partial<PhysicsConfig>} [config={}] - Optional overrides.
   */
  constructor(config = {}) {
    this.gravity = config.gravity ?? CONFIG.gravity;
    this.maxSpeed = config.maxSpeed ?? CONFIG.maxSpeed;
    this.restitution = config.restitution ?? CONFIG.restitution;
    this.minBounceUpSpeed = config.minBounceUpSpeed ?? CONFIG.minBounceUpSpeed;
  }

  /**
   * Applies gravitational acceleration to an entity's vertical velocity.
   * @param {import('../entities/Entity.js').Entity} entity
   * @param {number} [deltaTime=1]
   */
  applyGravity(entity, deltaTime = 1) {
    entity.velocityY += this.gravity * deltaTime;
  }

  /**
   * Clamps an entity's velocity vector magnitude to maxSpeed.
   * @param {import('../entities/Entity.js').Entity} entity
   */
  clampSpeed(entity) {
    const speed = Math.hypot(entity.velocityX, entity.velocityY);
    if (speed > this.maxSpeed && speed > 0) {
      const scale = this.maxSpeed / speed;
      entity.velocityX *= scale;
      entity.velocityY *= scale;
    }
  }

  /**
   * Integrates an entity's position by its current velocity along both axes.
   * @param {import('../entities/Entity.js').Entity} entity
   * @param {number} [deltaTime=1]
   */
  updatePosition(entity, deltaTime = 1) {
    entity.x += entity.velocityX * deltaTime;
    entity.y += entity.velocityY * deltaTime;
  }

  /**
   * Reflects an entity's velocity about a surface normal, scaled by restitution.
   * The result is forced to have an upward (negative-y) component so the ball
   * always bounces up, never gets knocked straight down.
   *
   * v' = v - 2 (v·n) n, then scaled by restitution.
   *
   * @param {import('../entities/Entity.js').Entity} entity
   * @param {{x:number, y:number}} normal       - Unit surface normal
   * @param {number} [restitution=this.restitution]
   */
  reflect(entity, normal, restitution = this.restitution) {
    // Normalize the incoming normal defensively.
    const nLen = Math.hypot(normal.x, normal.y) || 1;
    const nx = normal.x / nLen;
    const ny = normal.y / nLen;

    const dot = entity.velocityX * nx + entity.velocityY * ny;
    let rvx = entity.velocityX - 2 * dot * nx;
    let rvy = entity.velocityY - 2 * dot * ny;

    rvx *= restitution;
    rvy *= restitution;

    // Guarantee an upward result, and enforce a minimum upward speed so a
    // slow-speed hit still gives the ball a meaningful lift.
    if (rvy >= 0) {
      rvy = -Math.abs(rvy) - 0.001;
    }
    if (-rvy < this.minBounceUpSpeed) {
      rvy = -this.minBounceUpSpeed;
    }

    entity.velocityX = rvx;
    entity.velocityY = rvy;

    this.clampSpeed(entity);
  }
}

export default PhysicsEngine;
