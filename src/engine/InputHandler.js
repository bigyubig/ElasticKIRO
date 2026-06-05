/**
 * InputHandler.js — Normalizes input for the bouncer game.
 *
 * Two kinds of input:
 *   1. Continuous movement — ArrowLeft/ArrowRight (and A/D) are tracked as
 *      held-down state, polled each frame via isLeftDown()/isRightDown().
 *   2. Discrete action — click, touch, or Space fire the action callback,
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

    this._handleClick = this._handleClick.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
    this._handleKeyup = this._handleKeyup.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
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
    window.addEventListener('keydown', this._handleKeydown);
    window.addEventListener('keyup', this._handleKeyup);
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
    window.removeEventListener('keydown', this._handleKeydown);
    window.removeEventListener('keyup', this._handleKeyup);
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
    this._emit(InputType.TOUCH);
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
