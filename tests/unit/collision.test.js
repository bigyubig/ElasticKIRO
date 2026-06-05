/**
 * collision.test.js — Tests for CollisionDetector:
 * circle-vs-angled-pipe, wall bounces, and the bottom-out check.
 */

import { CollisionDetector } from '../../src/systems/CollisionDetector.js';
import { Ghosty } from '../../src/entities/Ghosty.js';
import { Pipe } from '../../src/entities/Pipe.js';

function makeBall(cx, cy, radius = 20, vx = 0, vy = 0) {
  const ball = new Ghosty(cx - radius, cy - radius, radius);
  ball.velocityX = vx;
  ball.velocityY = vy;
  return ball;
}

function flatPipe(centerX = 100, centerY = 200, length = 160, thickness = 18) {
  return new Pipe(centerX, centerY, 0, length, thickness);
}

describe('CollisionDetector — circleVsSegment', () => {
  const detector = new CollisionDetector(600);

  it('detects a hit when a downward ball overlaps the pipe', () => {
    const pipe = flatPipe();
    const ball = makeBall(100, 175, 20, 0, 5); // 25px above flat surface, falling
    const result = detector.circleVsSegment(ball, pipe);
    expect(result.hit).toBe(true);
    expect(result.normal.y).toBeLessThan(0); // upward-facing
    expect(result.penetration).toBeGreaterThan(0);
  });

  it('reports no hit when the ball is too far from the pipe', () => {
    const pipe = flatPipe();
    const ball = makeBall(100, 140, 20, 0, 5); // 60px above, falling
    expect(detector.circleVsSegment(ball, pipe).hit).toBe(false);
  });

  it('reports no hit when the ball overlaps but is moving away (upward)', () => {
    const pipe = flatPipe();
    const ball = makeBall(100, 175, 20, 0, -5); // overlapping but rising
    expect(detector.circleVsSegment(ball, pipe).hit).toBe(false);
  });

  it('reports no hit when the ball is horizontally beyond the bar ends', () => {
    const pipe = flatPipe(100, 200, 160, 18); // spans x in [20, 180]
    const ball = makeBall(400, 200, 20, 0, 5); // far to the right
    expect(detector.circleVsSegment(ball, pipe).hit).toBe(false);
  });
});

describe('CollisionDetector — checkWalls', () => {
  const detector = new CollisionDetector(600);
  const canvasWidth = 900;

  it('bounces off the left wall and repositions inside', () => {
    const ball = makeBall(-5, 300, 20, -4, 0); // x = -25 (top-left), moving left
    const hit = detector.checkWalls(ball, canvasWidth);
    expect(hit).toBe(true);
    expect(ball.x).toBe(0);
    expect(ball.velocityX).toBeGreaterThan(0);
  });

  it('bounces off the right wall and repositions inside', () => {
    const radius = 20;
    const ball = makeBall(canvasWidth + 5, 300, radius, 4, 0);
    const hit = detector.checkWalls(ball, canvasWidth);
    expect(hit).toBe(true);
    expect(ball.x).toBe(canvasWidth - ball.width);
    expect(ball.velocityX).toBeLessThan(0);
  });

  it('bounces off the top wall and repositions inside', () => {
    const ball = makeBall(300, -5, 20, 0, -4);
    const hit = detector.checkWalls(ball, canvasWidth);
    expect(hit).toBe(true);
    expect(ball.y).toBe(0);
    expect(ball.velocityY).toBeGreaterThan(0);
  });

  it('returns false and leaves a ball well inside untouched', () => {
    const ball = makeBall(400, 300, 20, 3, 3);
    const hit = detector.checkWalls(ball, canvasWidth);
    expect(hit).toBe(false);
    expect(ball.velocityX).toBe(3);
    expect(ball.velocityY).toBe(3);
  });
});

describe('CollisionDetector — isBelowBottom', () => {
  const canvasHeight = 600;
  const detector = new CollisionDetector(canvasHeight);

  it('is true when the ball has fully fallen past the bottom', () => {
    const ball = makeBall(300, canvasHeight + 50, 20);
    expect(detector.isBelowBottom(ball, canvasHeight)).toBe(true);
  });

  it('is false when the ball is still on screen', () => {
    const ball = makeBall(300, 300, 20);
    expect(detector.isBelowBottom(ball, canvasHeight)).toBe(false);
  });

  it('is false when only partially past the bottom edge', () => {
    const ball = makeBall(300, canvasHeight, 20); // center at bottom edge
    expect(detector.isBelowBottom(ball, canvasHeight)).toBe(false);
  });
});
