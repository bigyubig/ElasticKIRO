/**
 * game-loop.test.js — Integration tests for the Ghost Ball Bouncer loop.
 *
 * Drives GameEngine.update()/handleInput() manually (no requestAnimationFrame)
 * and mocks Image/Audio so the engine can initialize under jsdom.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GameEngine } from '../../src/engine/GameEngine.js';
import { GameState } from '../../src/engine/StateManager.js';

// A fake Image that resolves its load on the next tick.
class FakeImage {
  set src(value) {
    this._src = value;
    setTimeout(() => {
      if (typeof this.onload === 'function') this.onload();
    }, 0);
  }
  get src() {
    return this._src;
  }
}

/** Build a GameEngine, stub audio, and run init(). */
async function makeEngine() {
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  canvas.width = 900;
  canvas.height = 600;
  document.body.appendChild(canvas);

  const engine = new GameEngine(canvas);
  engine.audioSystem.load = jest.fn(async () => {});
  engine.audioSystem.playJump = jest.fn();
  engine.audioSystem.playGameOver = jest.fn();

  await engine.init();
  return engine;
}

describe('Game Loop Integration', () => {
  let originalImage;

  beforeEach(() => {
    originalImage = global.Image;
    global.Image = FakeImage;
  });

  afterEach(() => {
    global.Image = originalImage;
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  it('cycles menu -> playing -> game over -> playing', async () => {
    const engine = await makeEngine();

    expect(engine.getState()).toBe(GameState.MENU);

    engine.handleInput();
    expect(engine.getState()).toBe(GameState.PLAYING);

    // Force the ball below the bottom -> game over.
    const ball = engine.entityManager.getBall();
    ball.setCenter(450, engine.canvas.height + 200);
    engine.update();
    expect(engine.getState()).toBe(GameState.GAME_OVER);
    expect(engine.audioSystem.playGameOver).toHaveBeenCalled();

    engine.handleInput();
    expect(engine.getState()).toBe(GameState.PLAYING);
    expect(engine.getScore()).toBe(0);
  });

  it('starts from menu without swapping or rebuilding the active pipe', async () => {
    const engine = await makeEngine();
    const activePipe = engine.entityManager.getActivePipe();
    const activeAngle = activePipe.angle;

    engine.handleInput('spacebar');

    expect(engine.getState()).toBe(GameState.PLAYING);
    expect(engine.entityManager.getActivePipe()).toBe(activePipe);
    expect(engine.entityManager.getActivePipe().angle).toBe(activeAngle);
  });

  it('accumulates survival time as score while playing', async () => {
    const engine = await makeEngine();
    engine.handleInput();

    // Keep the ball safely on-screen so it survives.
    engine.collisionDetector.isBelowBottom = () => false;
    for (let i = 0; i < 60; i++) engine.update();

    expect(engine.getScore()).toBeCloseTo(1, 5);
  });

  it('bounces the ball up and swaps the pipe on contact', async () => {
    const engine = await makeEngine();
    engine.handleInput();

    const ball = engine.entityManager.getBall();
    const pipe = engine.entityManager.getActivePipe();
    const queueBefore = engine.entityManager.getQueue();
    const expectedNextAngle = queueBefore[0].angle;

    // Position the ball right on the (flat-ish) pipe, moving down.
    pipe.angle = 0;
    const seg = pipe.getSegment();
    ball.setCenter(pipe.centerX, seg.ay - ball.radius + 2);
    ball.velocityX = 0;
    ball.velocityY = 5;

    engine.update();

    // Ball now moves upward, the pipe was swapped, queue stays full.
    expect(ball.velocityY).toBeLessThan(0);
    expect(engine.audioSystem.playJump).toHaveBeenCalled();
    expect(engine.entityManager.getActivePipe().angle).toBe(expectedNextAngle);
    expect(engine.entityManager.getQueue().length).toBe(queueBefore.length);
  });

  it('left/right held input slides the active pipe', async () => {
    const engine = await makeEngine();
    engine.handleInput();
    engine.collisionDetector.isBelowBottom = () => false;

    const startX = engine.entityManager.getActivePipe().centerX;

    // Simulate holding the right key.
    engine.inputHandler._rightDown = true;
    engine.update();
    expect(engine.entityManager.getActivePipe().centerX).toBeGreaterThan(startX);

    // Now hold left.
    engine.inputHandler._rightDown = false;
    engine.inputHandler._leftDown = true;
    const afterRight = engine.entityManager.getActivePipe().centerX;
    engine.update();
    expect(engine.entityManager.getActivePipe().centerX).toBeLessThan(afterRight);
  });

  it('does not update simulation while in MENU', async () => {
    const engine = await makeEngine();
    expect(engine.getState()).toBe(GameState.MENU);
    const ball = engine.entityManager.getBall();
    const y0 = ball.y;
    engine.update();
    expect(ball.y).toBe(y0); // unchanged until PLAYING
  });
});
