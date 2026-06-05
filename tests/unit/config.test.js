/**
 * config.test.js — Smoke tests for game configuration constants.
 * Verifies that CONFIG exports the expected keys and values.
 */

import { describe, it, expect } from '@jest/globals';
import CONFIG from '../../src/config.js';

describe('CONFIG', () => {
  it('exports a CONFIG object', () => {
    expect(CONFIG).toBeDefined();
    expect(typeof CONFIG).toBe('object');
  });

  it('has correct physics constants', () => {
    expect(CONFIG.gravity).toBeGreaterThan(0);
    expect(CONFIG.restitution).toBeGreaterThan(0);
    expect(CONFIG.restitution).toBeLessThanOrEqual(1);
    expect(CONFIG.maxSpeed).toBeGreaterThan(0);
    expect(CONFIG.ballRadius).toBeGreaterThan(0);
    expect(CONFIG.minBounceUpSpeed).toBeGreaterThan(0);
  });

  it('has correct pipe/gameplay constants', () => {
    expect(CONFIG.pipeLength).toBeGreaterThan(0);
    expect(CONFIG.pipeThickness).toBeGreaterThan(0);
    expect(CONFIG.pipeMoveSpeed).toBeGreaterThan(0);
    expect(CONFIG.pipeCenterYOffset).toBeGreaterThan(0);
    expect(Array.isArray(CONFIG.pipeAngles)).toBe(true);
    expect(CONFIG.pipeAngles.length).toBeGreaterThan(0);
    expect(CONFIG.queueSize).toBe(5);
  });

  it('has correct visual constants', () => {
    expect(CONFIG.baseCanvasWidth).toBe(800);
    expect(CONFIG.aspectRatio).toBeCloseTo(800 / 600, 10);
    expect(CONFIG.backgroundColor).toBe('#87CEEB');
    expect(Array.isArray(CONFIG.pipeColors)).toBe(true);
    expect(CONFIG.pipeColors.length).toBe(4);
  });

  it('has correct asset paths', () => {
    expect(CONFIG.ghostySpritePath).toBe('assets/ghosty.png');
    expect(CONFIG.jumpSoundPath).toBe('assets/jump.wav');
    expect(CONFIG.gameOverSoundPath).toBe('assets/game_over.wav');
  });

  it('has correct timeout values', () => {
    expect(CONFIG.imageLoadTimeout).toBe(10000);
    expect(CONFIG.audioLoadTimeout).toBe(5000);
  });
});
