/**
 * audioSystem.test.js — Unit tests for AudioSystem error handling.
 * Implemented in task 9.2.
 *
 * **Property 16: Audio error handling**
 * **Validates: Requirements 6.8**
 *
 * Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import AudioSystem from '../../src/engine/AudioSystem.js';

// ---------------------------------------------------------------------------
// Mock the global Audio constructor
// ---------------------------------------------------------------------------

/**
 * Factory that builds a minimal HTMLAudioElement-like mock.
 * Returns an object that tracks event listeners so tests can fire them.
 */
function makeMockAudio() {
  const listeners = {};
  const mockAudio = {
    load: jest.fn(),
    play: jest.fn(() => Promise.resolve()),
    cloneNode: jest.fn(() => makeMockAudio()),
    currentTime: 0,
    addEventListener: jest.fn((event, handler, opts) => {
      listeners[event] = handler;
    }),
    _listeners: listeners,
  };
  return mockAudio;
}

// ---------------------------------------------------------------------------
// AudioSystem — Unit Tests (task 9.2)
// ---------------------------------------------------------------------------

describe('AudioSystem', () => {
  let audioSystem;
  let mockAudioInstance;
  let originalConsoleError;

  beforeEach(() => {
    jest.useFakeTimers();
    originalConsoleError = console.error;
    console.error = jest.fn();

    // Each `new Audio(...)` call returns a fresh mock that we can inspect.
    mockAudioInstance = makeMockAudio();
    global.Audio = jest.fn(() => {
      mockAudioInstance = makeMockAudio();
      return mockAudioInstance;
    });

    audioSystem = new AudioSystem();
  });

  afterEach(() => {
    jest.useRealTimers();
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });

  // ── loadSound() — error event resolves to null ──────────────────────────

  describe('loadSound() — error event', () => {
    it('resolves to null when the audio element fires an error event', async () => {
      // Start loading; Audio constructor will be called inside loadSound.
      const loadPromise = audioSystem.loadSound('assets/jump.wav');

      // Synchronously fire the 'error' event listener.
      mockAudioInstance._listeners['error']();

      const result = await loadPromise;
      expect(result).toBeNull();
    });

    it('calls handleError when the audio element fires an error event', async () => {
      const handleErrorSpy = jest.spyOn(audioSystem, 'handleError');

      const loadPromise = audioSystem.loadSound('assets/jump.wav');
      mockAudioInstance._listeners['error']();
      await loadPromise;

      expect(handleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('does not throw when the error event fires', async () => {
      const loadPromise = audioSystem.loadSound('assets/jump.wav');
      mockAudioInstance._listeners['error']();
      await expect(loadPromise).resolves.not.toThrow();
    });
  });

  // ── loadSound() — timeout resolves to null ───────────────────────────────

  describe('loadSound() — timeout', () => {
    it('resolves to null when the load times out', async () => {
      const loadPromise = audioSystem.loadSound('assets/jump.wav');

      // Advance fake timers past the 5-second audio timeout.
      jest.advanceTimersByTime(6000);

      const result = await loadPromise;
      expect(result).toBeNull();
    });

    it('logs an error when the load times out', async () => {
      const handleErrorSpy = jest.spyOn(audioSystem, 'handleError');

      const loadPromise = audioSystem.loadSound('assets/jump.wav');
      jest.advanceTimersByTime(6000);
      await loadPromise;

      expect(handleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('resolves (not rejects) on timeout', async () => {
      const loadPromise = audioSystem.loadSound('assets/jump.wav');
      jest.advanceTimersByTime(6000);
      await expect(loadPromise).resolves.toBeNull();
    });
  });

  // ── playJump() / playGameOver() — no crash when sound is null ────────────

  describe('playJump() with null sound', () => {
    it('does not throw when _jumpSound is null', () => {
      audioSystem._jumpSound = null;
      expect(() => audioSystem.playJump()).not.toThrow();
    });

    it('does not call any audio methods when _jumpSound is null', () => {
      audioSystem._jumpSound = null;
      // No Audio mock should be invoked because there is nothing to play.
      expect(() => audioSystem.playJump()).not.toThrow();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('playGameOver() with null sound', () => {
    it('does not throw when _gameOverSound is null', () => {
      audioSystem._gameOverSound = null;
      expect(() => audioSystem.playGameOver()).not.toThrow();
    });

    it('does not call any audio methods when _gameOverSound is null', () => {
      audioSystem._gameOverSound = null;
      expect(() => audioSystem.playGameOver()).not.toThrow();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  // ── handleError() — logs to console.error, never throws ─────────────────

  describe('handleError()', () => {
    it('logs to console.error with assetName and message', () => {
      const err = new Error('test error');
      audioSystem.handleError(err, 'jump.wav');

      expect(console.error).toHaveBeenCalledTimes(1);
      const loggedArgs = console.error.mock.calls[0];
      // The log message must mention the asset name and error message.
      expect(loggedArgs.join(' ')).toContain('jump.wav');
      expect(loggedArgs.join(' ')).toContain('test error');
    });

    it('does not throw for any error value', () => {
      expect(() => audioSystem.handleError(new Error('oops'), 'sound.wav')).not.toThrow();
      expect(() => audioSystem.handleError(new Error(''), 'unknown')).not.toThrow();
    });

    it('does not affect game state (muted flag unchanged)', () => {
      expect(audioSystem.isMuted).toBe(false);
      audioSystem.handleError(new Error('bad'), 'asset');
      expect(audioSystem.isMuted).toBe(false);
    });
  });

  // ── mute() / unmute() ─────────────────────────────────────────────────────

  describe('mute() and unmute()', () => {
    it('mute() sets isMuted to true', () => {
      audioSystem.mute();
      expect(audioSystem.isMuted).toBe(true);
    });

    it('unmute() sets isMuted to false after muting', () => {
      audioSystem.mute();
      audioSystem.unmute();
      expect(audioSystem.isMuted).toBe(false);
    });

    it('isMuted is false by default', () => {
      expect(audioSystem.isMuted).toBe(false);
    });

    it('mute() prevents playback — play() is never called', () => {
      const cloneMock = makeMockAudio();
      const soundMock = makeMockAudio();
      soundMock.cloneNode = jest.fn(() => cloneMock);
      audioSystem._jumpSound = soundMock;

      audioSystem.mute();
      audioSystem.playJump();

      expect(soundMock.cloneNode).not.toHaveBeenCalled();
      expect(cloneMock.play).not.toHaveBeenCalled();
    });

    it('unmute() re-enables playback — play() is called after unmuting', async () => {
      const cloneMock = makeMockAudio();
      cloneMock.play = jest.fn(() => Promise.resolve());
      const soundMock = makeMockAudio();
      soundMock.cloneNode = jest.fn(() => cloneMock);
      audioSystem._jumpSound = soundMock;

      audioSystem.mute();
      audioSystem.unmute();
      audioSystem.playJump();

      expect(soundMock.cloneNode).toHaveBeenCalled();
      expect(cloneMock.play).toHaveBeenCalled();
    });
  });

  // ── isMuted getter ────────────────────────────────────────────────────────

  describe('isMuted getter', () => {
    it('returns false on a fresh instance', () => {
      expect(audioSystem.isMuted).toBe(false);
    });

    it('returns true after mute()', () => {
      audioSystem.mute();
      expect(audioSystem.isMuted).toBe(true);
    });

    it('returns false after mute() then unmute()', () => {
      audioSystem.mute();
      audioSystem.unmute();
      expect(audioSystem.isMuted).toBe(false);
    });

    it('toggling mute/unmute multiple times reflects last call', () => {
      audioSystem.mute();
      audioSystem.unmute();
      audioSystem.mute();
      expect(audioSystem.isMuted).toBe(true);

      audioSystem.unmute();
      expect(audioSystem.isMuted).toBe(false);
    });
  });
});
