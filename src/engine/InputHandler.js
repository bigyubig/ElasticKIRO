/**
 * InputHandler.js — Normalizes input for the bouncer game.
 *
 * Two kinds of input:
 *   1. Continuous movement — ArrowLeft/ArrowRight (and A/D) are tracked as
 *      held-down state, polled each frame via isLeftDown()/isRightDown().
 *   2. Discrete action — click, first touch, or Space fire the action callback,
 *      used to start the game and to restart after game over.
 */

/**
 * Enum of discrete action input types.
 * @enum {string}
 */
export const InputType = Object.freeze({
  CLICK: 'click',
  SPACEBAR: 'spacebar',
  TOUCH: 'touch',
});

export class InputHandler {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas to attach pointer/touch listeners to.
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} */
    this._canvas = canvas;

    /** @type {((inputType: string) => void) | null} */
    this._callback = null;

    /** @type {boolean} */
    this._attached = false;

    /** @type {boolean} Whether a left-movement key is currently held. */
    this._leftDown = false;
    /** @type {boolean} Whether a right-movement key is currently held. */
    this._rightDown = false;

    /**
     * Canvas-relative X of the current touch, or null when no finger is down.
     * Drives pipe position directly (position-based touch control).
     * @type {number|null}
     */
    this._touchTargetX = null;

    this._handleClick = this._handleClick.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
    this._handleKeyup = this._handleKeyup.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);
    this._handleWindowTouchStart = this._handleWindowTouchStart.bind(this);
    this._handleWindowTouchMove = this._handleWindowTouchMove.bind(this);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Register the discrete-action callback and start listening for input.
   * @param {(inputType: string) => void} callback
   */
  attach(callback) {
    this._callback = callback;

    if (this._attached) return;
    this._attached = true;

    this._canvas.addEventListener('mousedown', this._handleClick);
    this._canvas.addEventListener('click', this._handleClick);
    this._canvas.addEventListener('touchstart', this._handleTouchStart, { passive: false });
    this._canvas.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    this._canvas.addEventListener('touchend', this._handleTouchEnd);
    this._canvas.addEventListener('touchcancel', this._handleTouchEnd);
    window.addEventListener('keydown', this._handleKeydown);
    window.addEventListener('keyup', this._handleKeyup);

    // Whole-screen touch: lets the player tap anywhere (including the
    // letterbox bars around the canvas) to control and start the game on
    // mobile. Touches that land on the canvas are skipped here because the
    // canvas listeners above already handle them.
    window.addEventListener('touchstart', this._handleWindowTouchStart, { passive: false });
    window.addEventListener('touchmove', this._handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', this._handleTouchEnd);
    window.addEventListener('touchcancel', this._handleTouchEnd);
  }

  /**
   * Remove all listeners and clear the callback + key state.
   */
  detach() {
    if (!this._attached) return;
    this._attached = false;
    this._callback = null;
    this._leftDown = false;
    this._rightDown = false;

    this._canvas.removeEventListener('mousedown', this._handleClick);
    this._canvas.removeEventListener('click', this._handleClick);
    this._canvas.removeEventListener('touchstart', this._handleTouchStart);
    this._canvas.removeEventListener('touchmove', this._handleTouchMove);
    this._canvas.removeEventListener('touchend', this._handleTouchEnd);
    this._canvas.removeEventListener('touchcancel', this._handleTouchEnd);
    window.removeEventListener('keydown', this._handleKeydown);
    window.removeEventListener('keyup', this._handleKeyup);
    window.removeEventListener('touchstart', this._handleWindowTouchStart);
    window.removeEventListener('touchmove', this._handleWindowTouchMove);
    window.removeEventListener('touchend', this._handleTouchEnd);
    window.removeEventListener('touchcancel', this._handleTouchEnd);
  }

  /** @returns {boolean} Whether a left-movement key is held. */
  isLeftDown() {
    return this._leftDown;
  }

  /** @returns {boolean} Whether a right-movement key is held. */
  isRightDown() {
    return this._rightDown;
  }

  /**
   * Net horizontal direction from held keys.
   * @returns {number} -1 (left), +1 (right), or 0 (none/both).
   */
  getMoveDirection() {
    return (this._rightDown ? 1 : 0) - (this._leftDown ? 1 : 0);
  }

  /**
   * Canvas-relative X coordinate of the current touch, or null when no touch
   * is active.  The value is clamped to [0, canvas.width] so out-of-canvas
   * touches (e.g. letterbox areas) still resolve to a valid position.
   * @returns {number|null}
   */
  getTouchTargetX() {
    return this._touchTargetX;
  }

  // ── Private event handlers ────────────────────────────────────────────────

  /** @param {MouseEvent} _event */
  _handleClick(_event) {
    this._emit(InputType.CLICK);
  }

  /** @param {KeyboardEvent} event */
  _handleKeydown(event) {
    if (this._isLeftKey(event)) {
      event.preventDefault();
      this._leftDown = true;
      return;
    }
    if (this._isRightKey(event)) {
      event.preventDefault();
      this._rightDown = true;
      return;
    }
    if (this._isSpace(event)) {
      event.preventDefault();
      this._emit(InputType.SPACEBAR);
    }
  }

  /** @param {KeyboardEvent} event */
  _handleKeyup(event) {
    if (this._isLeftKey(event)) {
      this._leftDown = false;
    } else if (this._isRightKey(event)) {
      this._rightDown = false;
    }
  }

  /** @param {TouchEvent} event */
  _handleTouchStart(event) {
    event.preventDefault();
    this._updateTouchTargetX(event);
    this._emit(InputType.TOUCH);
  }

  /** @param {TouchEvent} event */
  _handleTouchMove(event) {
    event.preventDefault();
    this._updateTouchTargetX(event);
  }

  _handleTouchEnd() {
    this._touchTargetX = null;
  }

  /**
   * Window-level touchstart — ignores touches that land on the canvas so a
   * touch is never processed twice (canvas listener already handled it).
   * @param {TouchEvent} event @private
   */
  _handleWindowTouchStart(event) {
    if (event.target === this._canvas) return;
    this._handleTouchStart(event);
  }

  /**
   * Window-level touchmove — see _handleWindowTouchStart for the guard.
   * @param {TouchEvent} event @private
   */
  _handleWindowTouchMove(event) {
    if (event.target === this._canvas) return;
    this._handleTouchMove(event);
  }

  /**
   * Convert the first touch point to a canvas-relative X coordinate and store
   * it in _touchTargetX.  Works for both in-canvas and out-of-canvas touches:
   * - In-canvas: scales clientX through the CSS→canvas transform.
   * - Out-of-canvas (letterbox bars): clamps to the nearest canvas edge.
   *
   * @param {TouchEvent} event @private
   */
  _updateTouchTargetX(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;

    const rect = this._canvas.getBoundingClientRect();
    if (rect.width > 0) {
      const clamped = Math.max(rect.left, Math.min(rect.right, touch.clientX));
      this._touchTargetX = (clamped - rect.left) * (this._canvas.width / rect.width);
    } else {
      // Fallback when the canvas has no layout size (e.g. unit tests).
      this._touchTargetX = touch.clientX;
    }
  }

  /** @param {KeyboardEvent} event @returns {boolean} @private */
  _isLeftKey(event) {
    return (
      event.code === 'ArrowLeft' ||
      event.key === 'ArrowLeft' ||
      event.code === 'KeyA' ||
      event.key === 'a' ||
      event.key === 'A'
    );
  }

  /** @param {KeyboardEvent} event @returns {boolean} @private */
  _isRightKey(event) {
    return (
      event.code === 'ArrowRight' ||
      event.key === 'ArrowRight' ||
      event.code === 'KeyD' ||
      event.key === 'd' ||
      event.key === 'D'
    );
  }

  /** @param {KeyboardEvent} event @returns {boolean} @private */
  _isSpace(event) {
    return event.code === 'Space' || event.key === ' ' || event.keyCode === 32;
  }

  /** @param {string} inputType @private */
  _emit(inputType) {
    if (typeof this._callback === 'function') {
      this._callback(inputType);
    }
  }
}

export default InputHandler;
