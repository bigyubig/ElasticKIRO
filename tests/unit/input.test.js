/**
 * input.test.js — Unit tests for InputHandler event handling.
 * Implemented in task 8.2.
 *
 * Requirements: 1.1, 1.2, 1.3
 */

import { jest } from '@jest/globals';
import { InputHandler, InputType } from '../../src/engine/InputHandler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal canvas element backed by jsdom. */
function makeCanvas() {
  const canvas = document.createElement('canvas');
  // Set intrinsic size to match the mocked CSS layout rect so scale = 1:1.
  canvas.width = 400;
  canvas.height = 300;
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 400,
    height: 300,
    right: 400,
    bottom: 300,
  });
  return canvas;
}

function makeTouchEvent(type, clientX) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: clientX === null ? [] : [{ clientX }],
  });
  return event;
}

// ---------------------------------------------------------------------------
// InputHandler — Unit Tests  (task 8.2)
// ---------------------------------------------------------------------------

describe('InputHandler', () => {
  let canvas;
  let handler;
  let callback;

  beforeEach(() => {
    canvas = makeCanvas();
    handler = new InputHandler(canvas);
    callback = jest.fn();
  });

  afterEach(() => {
    // Always detach so listeners don't bleed between tests.
    handler.detach();
  });

  // ── attach / register ─────────────────────────────────────────────────────

  describe('attach(callback)', () => {
    it('registers the callback so subsequent events invoke it', () => {
      handler.attach(callback);
      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not invoke the callback before attach is called', () => {
      // No attach — fire an event directly, callback should not be called.
      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(callback).not.toHaveBeenCalled();
    });

    it('calling attach() multiple times does NOT register duplicate listeners', () => {
      handler.attach(callback);
      handler.attach(callback);
      handler.attach(callback);

      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      // If duplicate listeners were registered, callback would fire 3 times.
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('replaces the callback when attach is called again with a new function', () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();

      handler.attach(firstCallback);
      handler.attach(secondCallback);

      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      // The most-recently registered callback should fire.
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });
  });

  // ── Spacebar ──────────────────────────────────────────────────────────────

  describe('spacebar keydown', () => {
    it('triggers callback with InputType.SPACEBAR when Space code is dispatched', () => {
      handler.attach(callback);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', keyCode: 32 }));
      expect(callback).toHaveBeenCalledWith(InputType.SPACEBAR);
    });

    it('triggers callback with InputType.SPACEBAR via keyCode 32', () => {
      handler.attach(callback);
      window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 32 }));
      expect(callback).toHaveBeenCalledWith(InputType.SPACEBAR);
    });

    it('calls event.preventDefault() when spacebar is pressed', () => {
      handler.attach(callback);
      let defaultPrevented = false;
      const event = new KeyboardEvent('keydown', {
        code: 'Space',
        key: ' ',
        keyCode: 32,
        cancelable: true,
      });
      // Spy on preventDefault by replacing it before dispatch.
      const origPreventDefault = event.preventDefault.bind(event);
      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn(() => { defaultPrevented = true; origPreventDefault(); }),
        writable: true,
      });
      window.dispatchEvent(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('does NOT trigger callback for other keys (e.g. ArrowUp)', () => {
      handler.attach(callback);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp', keyCode: 38 }));
      expect(callback).not.toHaveBeenCalled();
    });

    it('does NOT trigger callback for Enter key', () => {
      handler.attach(callback);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', keyCode: 13 }));
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ── Click / mousedown ─────────────────────────────────────────────────────

  describe('mousedown / click', () => {
    it('triggers callback with InputType.CLICK on mousedown', () => {
      handler.attach(callback);
      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(callback).toHaveBeenCalledWith(InputType.CLICK);
    });

    it('triggers callback with InputType.CLICK on click', () => {
      handler.attach(callback);
      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(callback).toHaveBeenCalledWith(InputType.CLICK);
    });

    it('callback receives exactly one argument (the input type)', () => {
      handler.attach(callback);
      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(callback).toHaveBeenCalledTimes(1);
      const [arg] = callback.mock.calls[0];
      expect(arg).toBe(InputType.CLICK);
    });
  });

  // ── Touch ─────────────────────────────────────────────────────────────────

  describe('touchstart', () => {
    it('triggers callback with InputType.TOUCH on touchstart', () => {
      handler.attach(callback);
      canvas.dispatchEvent(new TouchEvent('touchstart', { cancelable: true }));
      expect(callback).toHaveBeenCalledWith(InputType.TOUCH);
    });

    it('callback receives InputType.TOUCH (not CLICK or SPACEBAR)', () => {
      handler.attach(callback);
      canvas.dispatchEvent(new TouchEvent('touchstart', { cancelable: true }));
      expect(callback).not.toHaveBeenCalledWith(InputType.CLICK);
      expect(callback).not.toHaveBeenCalledWith(InputType.SPACEBAR);
      expect(callback).toHaveBeenCalledWith(InputType.TOUCH);
    });

    it('sets touchTargetX to canvas-relative X on touchstart', () => {
      handler.attach(callback);
      // Canvas is 400 px wide (CSS), canvas.width = 400 — scale = 1.
      // clientX 100 → canvas X 100 (left quarter).
      canvas.dispatchEvent(makeTouchEvent('touchstart', 100));
      expect(handler.getTouchTargetX()).toBeCloseTo(100, 0);
    });

    it('sets touchTargetX to canvas-relative X on right side', () => {
      handler.attach(callback);
      // clientX 300 → canvas X 300.
      canvas.dispatchEvent(makeTouchEvent('touchstart', 300));
      expect(handler.getTouchTargetX()).toBeCloseTo(300, 0);
    });

    it('updates touchTargetX on touchmove and clears it on touchend', () => {
      handler.attach(callback);
      canvas.dispatchEvent(makeTouchEvent('touchstart', 100));
      canvas.dispatchEvent(makeTouchEvent('touchmove', 300));
      expect(handler.getTouchTargetX()).toBeCloseTo(300, 0);

      canvas.dispatchEvent(makeTouchEvent('touchend', null));
      expect(handler.getTouchTargetX()).toBeNull();
    });

    it('getTouchTargetX is null before any touch', () => {
      handler.attach(callback);
      expect(handler.getTouchTargetX()).toBeNull();
    });
  });

  // ── detach ────────────────────────────────────────────────────────────────

  describe('detach()', () => {
    it('removes all listeners so the callback is no longer called after detach', () => {
      handler.attach(callback);
      handler.detach();

      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      canvas.dispatchEvent(new TouchEvent('touchstart'));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', keyCode: 32 }));

      expect(callback).not.toHaveBeenCalled();
    });

    it('can be called multiple times without throwing', () => {
      handler.attach(callback);
      expect(() => {
        handler.detach();
        handler.detach();
        handler.detach();
      }).not.toThrow();
    });

    it('allows re-attaching after detach', () => {
      handler.attach(callback);
      handler.detach();

      const newCallback = jest.fn();
      handler.attach(newCallback);
      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(callback).not.toHaveBeenCalled();
      expect(newCallback).toHaveBeenCalledWith(InputType.CLICK);
    });
  });

  // ── InputType enum ────────────────────────────────────────────────────────

  describe('InputType enum', () => {
    it('defines CLICK, SPACEBAR, and TOUCH values', () => {
      expect(InputType.CLICK).toBeDefined();
      expect(InputType.SPACEBAR).toBeDefined();
      expect(InputType.TOUCH).toBeDefined();
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(InputType)).toBe(true);
    });
  });
});
