/**
 * entities.test.js — Tests for the ball (Ghosty), the angled Pipe, and the
 * EntityManager's active-pipe + supply-queue behavior.
 */

import fc from 'fast-check';
import { Ghosty } from '../../src/entities/Ghosty.js';
import { Pipe } from '../../src/entities/Pipe.js';
import { EntityManager } from '../../src/systems/EntityManager.js';
import CONFIG from '../../src/config.js';

function makeCanvas(width = 900, height = 600) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// ── Ball (Ghosty) ────────────────────────────────────────────────────────────

describe('Ghosty (ball) — geometry helpers', () => {
  it('getCenter returns the bounding-box center', () => {
    const ball = new Ghosty(100, 200, 20);
    expect(ball.getCenter()).toEqual({ x: 120, y: 220 });
  });

  it('setCenter positions the bounding box so the center matches', () => {
    const ball = new Ghosty(0, 0, 20);
    ball.setCenter(300, 400);
    expect(ball.getCenter().x).toBeCloseTo(300, 5);
    expect(ball.getCenter().y).toBeCloseTo(400, 5);
  });
});

describe('Ghosty (ball) — update applies gravity and integrates both axes', () => {
  it('moves by velocity each frame and accelerates downward', () => {
    const ball = new Ghosty(100, 100, 20);
    ball.velocityX = 2;
    ball.velocityY = 0;
    ball.update(1);
    expect(ball.velocityY).toBeCloseTo(CONFIG.gravity, 5);
    expect(ball.x).toBeCloseTo(102, 5);
    expect(ball.y).toBeCloseTo(100 + CONFIG.gravity, 5);
  });

  it('clamps speed to maxSpeed', () => {
    const ball = new Ghosty(0, 0, 20);
    ball.velocityX = 100;
    ball.velocityY = 0;
    ball.clampSpeed();
    expect(Math.hypot(ball.velocityX, ball.velocityY)).toBeCloseTo(CONFIG.maxSpeed, 5);
  });
});

// ── Pipe (angled paddle) ─────────────────────────────────────────────────────

describe('Pipe — segment and normal', () => {
  it('getSegment returns horizontal endpoints for a flat pipe', () => {
    const pipe = new Pipe(100, 200, 0, 160, 18);
    const seg = pipe.getSegment();
    expect(seg.ax).toBeCloseTo(20, 5);
    expect(seg.bx).toBeCloseTo(180, 5);
    expect(seg.ay).toBeCloseTo(200, 5);
    expect(seg.by).toBeCloseTo(200, 5);
  });

  it('getNormal points straight up for a flat pipe', () => {
    const pipe = new Pipe(100, 200, 0, 160, 18);
    const n = pipe.getNormal();
    expect(n.x).toBeCloseTo(0, 5);
    expect(n.y).toBeCloseTo(-1, 5);
  });

  it('normal always has a non-positive y component (upward-facing)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...CONFIG.pipeAngles), (angle) => {
        const pipe = new Pipe(100, 200, angle, 160, 18);
        return pipe.getNormal().y <= 0.0001;
      }),
      { numRuns: 50 }
    );
  });

  it('segment endpoints are symmetric about the center', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CONFIG.pipeAngles),
        fc.integer({ min: 100, max: 800 }),
        (angle, cx) => {
          const pipe = new Pipe(cx, 200, angle, 160, 18);
          const seg = pipe.getSegment();
          const midX = (seg.ax + seg.bx) / 2;
          const midY = (seg.ay + seg.by) / 2;
          return Math.abs(midX - cx) < 0.001 && Math.abs(midY - 200) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Pipe — moveBy clamps the bar inside the canvas', () => {
  it('clamps to the right edge', () => {
    const canvasWidth = 900;
    const pipe = new Pipe(450, 560, 0, 160, 18);
    pipe.moveBy(10000, canvasWidth);
    // Flat pipe half-extent = length/2 = 80.
    expect(pipe.centerX).toBeCloseTo(canvasWidth - 80, 5);
  });

  it('clamps to the left edge', () => {
    const pipe = new Pipe(450, 560, 0, 160, 18);
    pipe.moveBy(-10000, 900);
    expect(pipe.centerX).toBeCloseTo(80, 5);
  });

  it('moves normally when within bounds', () => {
    const pipe = new Pipe(450, 560, 0, 160, 18);
    pipe.moveBy(30, 900);
    expect(pipe.centerX).toBeCloseTo(480, 5);
  });
});

// ── EntityManager — active pipe + supply queue ───────────────────────────────

describe('EntityManager — pipes and queue', () => {
  it('initPipes creates an active pipe and a full queue', () => {
    const em = new EntityManager(makeCanvas(), 1);
    em.initPipes();
    expect(em.getActivePipe()).not.toBeNull();
    expect(em.getQueue().length).toBe(CONFIG.queueSize);
  });

  it('swapPipe promotes the front of the queue and keeps the queue size', () => {
    const em = new EntityManager(makeCanvas(), 1);
    em.initPipes();
    const nextAngle = em.getQueue()[0].angle;
    em.swapPipe();
    expect(em.getActivePipe().angle).toBe(nextAngle);
    expect(em.getQueue().length).toBe(CONFIG.queueSize);
  });

  it('swapPipe preserves the active pipe horizontal position', () => {
    const em = new EntityManager(makeCanvas(), 1);
    em.initPipes();
    em.getActivePipe().centerX = 321;
    em.swapPipe();
    expect(em.getActivePipe().centerX).toBeCloseTo(321, 0);
  });

  it('moveActivePipe slides the active pipe and respects direction', () => {
    const em = new EntityManager(makeCanvas(), 1);
    em.initPipes();
    const start = em.getActivePipe().centerX;
    em.moveActivePipe(1, 1);
    expect(em.getActivePipe().centerX).toBeGreaterThan(start);
    const afterRight = em.getActivePipe().centerX;
    em.moveActivePipe(-1, 1);
    expect(em.getActivePipe().centerX).toBeLessThan(afterRight);
  });

  it('moveActivePipe with direction 0 does nothing', () => {
    const em = new EntityManager(makeCanvas(), 1);
    em.initPipes();
    const start = em.getActivePipe().centerX;
    em.moveActivePipe(0, 1);
    expect(em.getActivePipe().centerX).toBe(start);
  });
});

describe('EntityManager — survival time and reset', () => {
  it('update accumulates frames and getElapsedSeconds reflects them', () => {
    const em = new EntityManager(makeCanvas(), 1);
    em.reset();
    for (let i = 0; i < 60; i++) em.update(1);
    expect(em.getElapsedSeconds()).toBeCloseTo(1, 5);
    expect(em.getScore()).toBeCloseTo(1, 5);
  });

  it('reset zeroes the timer and rebuilds ball + pipes', () => {
    const em = new EntityManager(makeCanvas(), 1);
    em.reset();
    em.update(100);
    em.reset();
    expect(em.elapsedFrames).toBe(0);
    expect(em.getBall()).not.toBeNull();
    expect(em.getActivePipe()).not.toBeNull();
    expect(em.getQueue().length).toBe(CONFIG.queueSize);
  });
});
