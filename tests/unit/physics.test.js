/**
 * physics.test.js — Tests for PhysicsEngine (gravity, speed clamp, reflection).
 */

import fc from 'fast-check';
import { PhysicsEngine } from '../../src/systems/PhysicsEngine.js';

// ── Gravity ────────────────────────────────────────────────────────────────

describe('PhysicsEngine — gravity', () => {
  it('velocityY increases by exactly gravity * deltaTime after applyGravity', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 50, noNaN: true }),
        fc.integer({ min: 1, max: 100 }),
        (initialVelocity, deltaTime) => {
          const engine = new PhysicsEngine();
          const entity = { velocityX: 0, velocityY: initialVelocity };
          engine.applyGravity(entity, deltaTime);
          const expected = initialVelocity + engine.gravity * deltaTime;
          return Math.abs(entity.velocityY - expected) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple applyGravity calls accumulate like a single larger step', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 50, noNaN: true }),
        fc.integer({ min: 1, max: 20 }),
        (initialVelocity, frames) => {
          const engine = new PhysicsEngine();
          const a = { velocityY: initialVelocity };
          for (let i = 0; i < frames; i++) engine.applyGravity(a, 1);
          const b = { velocityY: initialVelocity };
          engine.applyGravity(b, frames);
          return Math.abs(a.velocityY - b.velocityY) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Speed clamp ──────────────────────────────────────────────────────────────

describe('PhysicsEngine — clampSpeed', () => {
  it('never leaves the speed magnitude above maxSpeed', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: -100, max: 100, noNaN: true }),
        (vx, vy) => {
          const engine = new PhysicsEngine();
          const entity = { velocityX: vx, velocityY: vy };
          engine.clampSpeed(entity);
          const speed = Math.hypot(entity.velocityX, entity.velocityY);
          return speed <= engine.maxSpeed + 0.0001;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('preserves direction when clamping', () => {
    const engine = new PhysicsEngine();
    const entity = { velocityX: 30, velocityY: 40 }; // speed 50, direction 3:4
    engine.clampSpeed(entity);
    const ratio = entity.velocityX / entity.velocityY;
    expect(ratio).toBeCloseTo(30 / 40, 5);
    expect(Math.hypot(entity.velocityX, entity.velocityY)).toBeCloseTo(engine.maxSpeed, 5);
  });

  it('leaves velocities already within bounds unchanged', () => {
    const engine = new PhysicsEngine();
    const entity = { velocityX: 1, velocityY: -2 };
    engine.clampSpeed(entity);
    expect(entity.velocityX).toBeCloseTo(1, 5);
    expect(entity.velocityY).toBeCloseTo(-2, 5);
  });
});

// ── Position integration (2D) ────────────────────────────────────────────────

describe('PhysicsEngine — updatePosition (2D)', () => {
  it('moves x and y by velocity * deltaTime', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: -10, max: 10, noNaN: true }),
        fc.float({ min: -10, max: 10, noNaN: true }),
        fc.integer({ min: 1, max: 60 }),
        (x, y, vx, vy, dt) => {
          const engine = new PhysicsEngine();
          const entity = { x, y, velocityX: vx, velocityY: vy };
          engine.updatePosition(entity, dt);
          return (
            Math.abs(entity.x - (x + vx * dt)) < 0.001 &&
            Math.abs(entity.y - (y + vy * dt)) < 0.001
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Reflection ───────────────────────────────────────────────────────────────

describe('PhysicsEngine — reflect', () => {
  it('a downward ball hitting a flat (horizontal) pipe bounces straight up', () => {
    const engine = new PhysicsEngine({ restitution: 1 });
    // Use speed above minBounceUpSpeed so the floor does not interfere.
    const entity = { velocityX: 0, velocityY: 15 };
    engine.reflect(entity, { x: 0, y: -1 }, 1);
    expect(entity.velocityX).toBeCloseTo(0, 5);
    expect(entity.velocityY).toBeLessThan(0); // now moving up
    expect(Math.abs(entity.velocityY)).toBeCloseTo(15, 5);
  });

  it('always produces an upward (negative-y) velocity after a bounce', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }), // moving downward
        fc.constantFrom(-40, -25, -12, 0, 12, 25, 40),
        (vx, vy, angleDeg) => {
          const engine = new PhysicsEngine();
          const a = (angleDeg * Math.PI) / 180;
          const normal = { x: Math.sin(a), y: -Math.cos(a) };
          const entity = { velocityX: vx, velocityY: vy };
          engine.reflect(entity, normal);
          return entity.velocityY < 0;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('a left-tilted pipe pushes the ball toward the right and vice versa', () => {
    const engine = new PhysicsEngine({ restitution: 1 });

    // Pipe tilted +25deg. Ball falling straight down.
    const aPos = (25 * Math.PI) / 180;
    const right = { velocityX: 0, velocityY: 5 };
    engine.reflect(right, { x: Math.sin(aPos), y: -Math.cos(aPos) }, 1);

    // Pipe tilted -25deg.
    const aNeg = (-25 * Math.PI) / 180;
    const left = { velocityX: 0, velocityY: 5 };
    engine.reflect(left, { x: Math.sin(aNeg), y: -Math.cos(aNeg) }, 1);

    // Opposite tilts send the ball in opposite horizontal directions.
    expect(Math.sign(right.velocityX)).toBe(-Math.sign(left.velocityX));
    expect(right.velocityX).not.toBeCloseTo(0, 2);
  });

  it('respects restitution by reducing the resulting speed (above minBounceUpSpeed)', () => {
    // Use a fast-moving ball so restitution cuts the speed without
    // triggering the minimum-bounce-up-speed floor.
    const engine = new PhysicsEngine();
    const entity = { velocityX: 0, velocityY: 20 };
    engine.reflect(entity, { x: 0, y: -1 }, 0.5);
    // 20 * 0.5 = 10, well above minBounceUpSpeed (5).
    expect(Math.abs(entity.velocityY)).toBeCloseTo(10, 5);
  });
});
