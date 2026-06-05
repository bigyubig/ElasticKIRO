/**
 * AudioSystem.js — Loads and plays game sound effects.
 *
 * Audio assets are loaded with timeout handling. Load failures are logged
 * and silently skipped — the game continues without audio rather than
 * blocking gameplay. Never throws; all errors are handled gracefully.
 *
 * Implemented in task 9.1.
 */

import CONFIG from '../config.js';

/**
 * AudioSystem manages sound effect loading and playback for the game.
 *
 * Usage:
 *   const audio = new AudioSystem();
 *   await audio.load();        // preloads all assets
 *   audio.playJump();          // plays jump sound
 *   audio.playGameOver();      // plays game-over sound
 *   audio.mute() / audio.unmute()
 */
class AudioSystem {
  constructor() {
    /** @type {HTMLAudioElement|null} */
    this._jumpSound = null;

    /** @type {HTMLAudioElement|null} */
    this._gameOverSound = null;

    /** @type {boolean} */
    this._muted = false;
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  /**
   * Preload all audio assets. Each asset has an independent timeout guard;
   * failures are caught and logged without propagating.
   *
   * @returns {Promise<void>} Always resolves (never rejects).
   */
  async load() {
    const [jumpResult, gameOverResult] = await Promise.allSettled([
      this.loadSound(CONFIG.jumpSoundPath),
      this.loadSound(CONFIG.gameOverSoundPath),
    ]);

    // loadSound already returns null on failure, so just assign directly.
    this._jumpSound = jumpResult.status === 'fulfilled' ? jumpResult.value : null;
    this._gameOverSound = gameOverResult.status === 'fulfilled' ? gameOverResult.value : null;
  }

  /**
   * Load a single audio file with a timeout guard.
   * Resolves to an HTMLAudioElement on success, or null on any failure.
   *
   * @param {string} path - Asset path relative to the page (e.g. 'assets/jump.wav').
   * @returns {Promise<HTMLAudioElement|null>}
   */
  loadSound(path) {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(path);
        const assetName = path.split('/').pop();

        const timeoutId = setTimeout(() => {
          const err = new Error(`Audio load timed out after ${CONFIG.audioLoadTimeout}ms`);
          this.handleError(err, assetName);
          resolve(null);
        }, CONFIG.audioLoadTimeout);

        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeoutId);
          resolve(audio);
        }, { once: true });

        audio.addEventListener('error', () => {
          clearTimeout(timeoutId);
          const err = new Error(`Failed to load audio: ${assetName}`);
          this.handleError(err, assetName);
          resolve(null);
        }, { once: true });

        // Trigger loading.
        audio.load();
      } catch (err) {
        this.handleError(err, path);
        resolve(null);
      }
    });
  }

  // ─── Playback ─────────────────────────────────────────────────────────────

  /**
   * Play the jump / flap sound effect.
   * Clones the audio element to allow overlapping playback.
   */
  playJump() {
    this._play(this._jumpSound, 'jump');
  }

  /**
   * Play the game-over sound effect.
   * Clones the audio element to allow overlapping playback.
   */
  playGameOver() {
    this._play(this._gameOverSound, 'game_over');
  }

  /**
   * Internal helper — clone and play an audio element.
   * All playback errors are caught and logged; never throws.
   *
   * @param {HTMLAudioElement|null} audioElement
   * @param {string} assetName
   */
  _play(audioElement, assetName) {
    if (this._muted || audioElement === null) return;

    try {
      // Clone so concurrent plays don't restart each other.
      const clone = audioElement.cloneNode();
      clone.currentTime = 0;
      const playPromise = clone.play();

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          this.handleError(err, assetName);
        });
      }
    } catch (err) {
      this.handleError(err, assetName);
    }
  }

  // ─── Error Handling ───────────────────────────────────────────────────────

  /**
   * Log an audio error without interrupting the game.
   * Never throws. Game state is never affected.
   *
   * @param {Error} error
   * @param {string} assetName
   */
  handleError(error, assetName) {
    console.error(`[AudioSystem] Error with "${assetName}":`, error.message);
  }

  // ─── Mute Control ─────────────────────────────────────────────────────────

  /**
   * Mute all audio playback.
   */
  mute() {
    this._muted = true;
  }

  /**
   * Unmute audio playback.
   */
  unmute() {
    this._muted = false;
  }

  /**
   * @returns {boolean} Whether audio is currently muted.
   */
  get isMuted() {
    return this._muted;
  }
}

export default AudioSystem;
