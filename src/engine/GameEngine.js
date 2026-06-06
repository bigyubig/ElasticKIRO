/**
 * GameEngine.js — Main game loop and subsystem coordinator for Ghost Ball Bouncer.
 *
 * The ball falls under gravity; the player slides the angled pipe left/right to
 * reflect it back up. On every bounce the pipe swaps with the front of the
 * supply queue. Surviving longer raises the score; falling off the bottom ends
 * the game.
 */

import CONFIG from '../config.js';
import { StateManager, GameState } from './StateManager.js';
import { InputHandler } from './InputHandler.js';
import AudioSystem from './AudioSystem.js';
import { PhysicsEngine } from '../systems/PhysicsEngine.js';
import { EntityManager } from '../systems/EntityManager.js';
import { CollisionDetector } from '../systems/CollisionDetector.js';
import { Renderer } from '../systems/Renderer.js';
import {
  resizeCanvas,
  calculateScaleFactor,
} from '../utils/canvasSizing.js';

export class GameEngine {
  /**
   * @param {HTMLCanvasElement} canvas - The game canvas element.
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;

    /** @type {number} Scale factor relative to the baseline width. */
    this.scaleFactor = calculateScaleFactor(canvas.width || CONFIG.baseCanvasWidth);

    // ── Subsystems ──────────────────────────────────────────────────────────
    this.stateManager = new StateManager();
    this.physicsEngine = new PhysicsEngine();
    this.entityManager = new EntityManager(canvas, this.scaleFactor);
    this.collisionDetector = new CollisionDetector(canvas.height);
    this.renderer = new Renderer(canvas, this.scaleFactor);
    this.inputHandler = new InputHandler(canvas);
    this.audioSystem = new AudioSystem();

    // ── Loop state ──────────────────────────────────────────────────────────
    this.canStart = false;
    this._running = false;
    this._rafId = null;

    /** @type {HTMLImageElement|null} Cached ball sprite (re-applied on reset). */
    this._sprite = null;
    /** @type {string|null} */
    this._errorMessage = null;

    this._frame = this._frame.bind(this);
    this._handleResize = this._handleResize.bind(this);
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  /**
   * Initialize the engine: size canvas, create entities, load assets, wire input.
   * @returns {Promise<void>}
   */
  async init() {
    const vw = this._viewportWidth();
    const vh = this._viewportHeight();

    this._applyCanvasSize(vw, vh);

    // Create the ball and the pipes for the opening (menu) screen.
    this.entityManager.createBall();
    this.entityManager.initPipes();

    try {
      this._sprite = await this._loadImage(CONFIG.ghostySpritePath, CONFIG.imageLoadTimeout);
      const ball = this.entityManager.getBall();
      if (ball) ball.sprite = this._sprite;
    } catch (err) {
      this._showError(
        'Failed to load ghosty.png. Please refresh to try again. ' +
          'Press F5 or refresh the page to try again.'
      );
      this.canStart = false;
      return;
    }

    await this.audioSystem.load();

    this.inputHandler.attach((inputType) => this.handleInput(inputType));
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', this._handleResize);
    }

    this.canStart = true;
  }

  // ── Loop control ─────────────────────────────────────────────────────────

  start() {
    if (!this.canStart || this._running) return;
    this._running = true;
    if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(this._frame);
    }
  }

  stop() {
    this._running = false;
    if (this._rafId != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
    }
    this._rafId = null;
  }

  /** @private */
  _frame() {
    if (!this._running) return;
    this.update(1);
    this.render();
    if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(this._frame);
    }
  }

  // ── Simulation ─────────────────────────────────────────────────────────────

  /**
   * Advance the simulation by one (or more) frames. Only mutates while PLAYING.
   * @param {number} [deltaTime=1]
   */
  update(deltaTime = 1) {
    if (!this.stateManager.isPlaying()) return;

    const ball = this.entityManager.getBall();
    if (!ball) return;

    // 1. Player moves the active pipe.
    // Touch: position-based (finger drags / taps pipe directly to that X).
    // Keyboard: direction-based (hold left/right arrow or A/D).
    const touchX = this.inputHandler.getTouchTargetX();
    if (touchX !== null) {
      this.entityManager.setActivePipeX(touchX);
    } else {
      this.entityManager.moveActivePipe(this.inputHandler.getMoveDirection(), deltaTime);
    }

    // 2. Ball physics: gravity, clamp, integrate.
    this.physicsEngine.applyGravity(ball, deltaTime);
    this.physicsEngine.clampSpeed(ball);
    this.physicsEngine.updatePosition(ball, deltaTime);

    // 3. Walls keep the ball in view (bottom is handled separately, below).
    this.collisionDetector.checkWalls(ball, this.canvas.width);

    // 4. Pipe bounce + swap.
    const pipe = this.entityManager.getActivePipe();
    if (pipe) {
      const result = this.collisionDetector.circleVsSegment(ball, pipe);
      if (result.hit) {
        // Push the ball out of penetration along the surface normal.
        ball.x += result.normal.x * result.penetration;
        ball.y += result.normal.y * result.penetration;
        this.physicsEngine.reflect(ball, result.normal);
        this.entityManager.swapPipe();
        this.audioSystem.playJump();
      }
    }

    // 5. Survival time = score.
    this.entityManager.update(deltaTime);

    // 6. Bottom-out = game over.
    if (this.collisionDetector.isBelowBottom(ball, this.canvas.height)) {
      this.stateManager.transitionTo(GameState.GAME_OVER);
      this.stateManager.updateHighScore(this.entityManager.getScore());
      this.audioSystem.playGameOver();
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  render() {
    this.renderer.renderBackground();

    const pipe = this.entityManager.getActivePipe();
    if (pipe) this.renderer.renderPipe(pipe);
    this.renderer.renderQueue(this.entityManager.getQueue());

    const ball = this.entityManager.getBall();
    if (ball) this.renderer.renderGhosty(ball);

    const state = this.stateManager.getCurrentState();
    if (state === GameState.MENU) {
      this.renderer.drawMenu();
    } else if (state === GameState.PLAYING) {
      this.renderer.renderScore(
        this.entityManager.getScore(),
        this.stateManager.getHighScore()
      );
    } else if (state === GameState.GAME_OVER) {
      this.renderer.drawGameOver(
        this.entityManager.getScore(),
        this.stateManager.getHighScore()
      );
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Handle a discrete action input depending on the current state.
   * - MENU: start the game.
   * - GAME_OVER: reset and start a new game.
   * @param {string} [inputType]
   */
  // eslint-disable-next-line no-unused-vars
  handleInput(inputType) {
    const state = this.stateManager.getCurrentState();

    if (state === GameState.MENU) {
      this.stateManager.transitionTo(GameState.PLAYING);
    } else if (state === GameState.GAME_OVER) {
      this.reset();
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  /**
   * Reset to a fresh PLAYING session.
   */
  reset() {
    this.entityManager.reset();

    const ball = this.entityManager.getBall();
    if (ball && this._sprite) ball.sprite = this._sprite;

    if (!this.stateManager.isPlaying()) {
      this.stateManager.transitionTo(GameState.PLAYING);
    }
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  /** @returns {string} */
  getState() {
    return this.stateManager.getCurrentState();
  }

  /** @returns {number} */
  getScore() {
    return this.entityManager.getScore();
  }

  /** @returns {string|null} */
  getErrorMessage() {
    return this._errorMessage;
  }

  // ── Responsive resize ───────────────────────────────────────────────────────

  /** @private */
  _handleResize() {
    const vw = this._viewportWidth();
    const vh = this._viewportHeight();
    this._applyCanvasSize(vw, vh);
  }

  /** @private */
  _applyCanvasSize(viewportWidth, viewportHeight) {
    this.scaleFactor = resizeCanvas(this.canvas, viewportWidth, viewportHeight);
    this.renderer.setScaleFactor(this.scaleFactor);
    this.entityManager.setScaleFactor(this.scaleFactor);
    this.collisionDetector.canvasHeight = this.canvas.height;
  }

  // ── Asset loading helpers ──────────────────────────────────────────────────

  /**
   * Load an image with a timeout guard.
   * @param {string} path
   * @param {number} timeout
   * @returns {Promise<HTMLImageElement>}
   * @private
   */
  _loadImage(path, timeout) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`Image load timed out: ${path}`));
      }, timeout);

      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(img);
      };

      img.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Failed to load image: ${path}`));
      };

      img.src = path;
    });
  }

  // ── Error display ──────────────────────────────────────────────────────────

  /** @param {string} message @private */
  _showError(message) {
    this._errorMessage = message;
    if (typeof document !== 'undefined' && document.getElementById) {
      const el = document.getElementById('errorMessage');
      if (el) {
        el.textContent = message;
        el.style.display = 'block';
      }
    }
  }

  /** @private */
  _hideError() {
    this._errorMessage = null;
    if (typeof document !== 'undefined' && document.getElementById) {
      const el = document.getElementById('errorMessage');
      if (el) {
        el.textContent = '';
        el.style.display = 'none';
      }
    }
  }

  // ── Viewport helpers ───────────────────────────────────────────────────────

  /** @returns {number} @private */
  _viewportWidth() {
    return typeof window !== 'undefined' && window.innerWidth
      ? window.innerWidth
      : this.canvas.width;
  }

  /** @returns {number} @private */
  _viewportHeight() {
    return typeof window !== 'undefined' && window.innerHeight
      ? window.innerHeight
      : this.canvas.height;
  }
}

export default GameEngine;
