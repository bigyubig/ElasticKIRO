/**
 * fps.test.js — Performance proxy for the frame budget.
 * Implemented in task 18.
 *
 * jsdom has no real requestAnimationFrame cadence, so this measures the CPU
 * cost of a single update()+render() step. To sustain >= 55 FPS the per-frame
 * work must stay well under the ~16.6ms budget of a 60 Hz display.
 *
 * Requirements: 10.1, 10.2
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GameEngine } from '../../src/engine/GameEngine.js';
import { GameState } from '../../src/engine/StateManager.js';

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

const FRAME_BUDGET_MS = 1000 / 60; // ~16.6ms

describe('Performance - Frame Rate', () => {
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

  it('keeps average frame cost well under the 60 FPS budget over 10s of frames', async () => {
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

    engine.handleInput(); // -> playing
    // Keep the simulation alive so we measure steady-state cost.
    engine.collisionDetector.isBelowBottom = () => false;
    // The fake Image instance is not a real drawable; use the placeholder path.
    engine.entityManager.getBall().sprite = null;
    expect(engine.getState()).toBe(GameState.PLAYING);

    const totalFrames = 600; // 10 seconds at 60 FPS
    const start = performance.now();
    for (let i = 0; i < totalFrames; i++) {
      engine.update(1);
      engine.render();
    }
    const elapsed = performance.now() - start;
    const avgPerFrame = elapsed / totalFrames;

    // Generous threshold: even with overhead, logic+mocked-render must be
    // comfortably below the real-time frame budget.
    expect(avgPerFrame).toBeLessThan(FRAME_BUDGET_MS);
  });
});
