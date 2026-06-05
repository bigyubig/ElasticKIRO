/**
 * renderer.test.js — Unit tests for Renderer rendering configuration.
 * Implemented in task 10.4.
 *
 * Requirements: 7.6, 7.3, 7.10
 *
 * Uses jest-canvas-mock (configured via setupFiles in package.json) which
 * automatically mocks CanvasRenderingContext2D on every document.createElement('canvas').
 */

import { jest } from '@jest/globals';
import { Renderer, TextPosition } from '../../src/systems/Renderer.js';
import CONFIG from '../../src/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a canvas element with explicit dimensions.
 * jest-canvas-mock intercepts getContext('2d') and returns a trackable mock.
 */
function makeCanvas(width = 900, height = 600) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// ---------------------------------------------------------------------------
// 1. Constructor
// ---------------------------------------------------------------------------

describe('Renderer — constructor', () => {
  it('stores the canvas reference', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    expect(renderer.canvas).toBe(canvas);
  });

  it('derives ctx from canvas.getContext("2d") when no ctx is passed', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    expect(renderer.ctx).toBeDefined();
    expect(renderer.ctx).not.toBeNull();
  });

  it('accepts an explicit ctx as second argument', () => {
    const canvas = makeCanvas();
    const ctx = canvas.getContext('2d');
    const renderer = new Renderer(canvas, ctx, 1);
    expect(renderer.ctx).toBe(ctx);
  });

  it('sets scaleFactor when passed as second argument (canvas, scaleFactor)', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 2);
    expect(renderer.scaleFactor).toBe(2);
  });

  it('sets scaleFactor when passed as third argument (canvas, ctx, scaleFactor)', () => {
    const canvas = makeCanvas();
    const ctx = canvas.getContext('2d');
    const renderer = new Renderer(canvas, ctx, 1.5);
    expect(renderer.scaleFactor).toBe(1.5);
  });

  it('defaults scaleFactor to 1 when not provided', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas);
    expect(renderer.scaleFactor).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. setScaleFactor()
// ---------------------------------------------------------------------------

describe('Renderer — setScaleFactor()', () => {
  it('updates scaleFactor to the new value', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    renderer.setScaleFactor(2.5);
    expect(renderer.scaleFactor).toBe(2.5);
  });

  it('can be called multiple times and always stores the latest value', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    renderer.setScaleFactor(0.5);
    renderer.setScaleFactor(1.25);
    renderer.setScaleFactor(3);
    expect(renderer.scaleFactor).toBe(3);
  });

  it('accepts fractional scale factors', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    renderer.setScaleFactor(0.75);
    expect(renderer.scaleFactor).toBeCloseTo(0.75);
  });
});

// ---------------------------------------------------------------------------
// 3. clearCanvas() / renderBackground()
// ---------------------------------------------------------------------------

describe('Renderer — clearCanvas()', () => {
  it('sets ctx.fillStyle to CONFIG.backgroundColor (#87CEEB)', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    // Capture the fillStyle at the time fillRect is called (before any restore)
    let capturedFillStyle;
    jest.spyOn(renderer.ctx, 'fillRect').mockImplementation(() => {
      capturedFillStyle = renderer.ctx.fillStyle;
    });
    renderer.clearCanvas();
    expect(capturedFillStyle.toLowerCase()).toBe(CONFIG.backgroundColor.toLowerCase());
  });

  it('calls ctx.fillRect with full canvas dimensions', () => {
    const canvas = makeCanvas(900, 600);
    const renderer = new Renderer(canvas, 1);
    const fillRectSpy = jest.spyOn(renderer.ctx, 'fillRect');

    renderer.clearCanvas();

    expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 900, 600);
  });

  it('background color is #87CEEB (sky blue as defined in CONFIG)', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    let capturedFillStyle;
    jest.spyOn(renderer.ctx, 'fillRect').mockImplementation(() => {
      capturedFillStyle = renderer.ctx.fillStyle;
    });
    renderer.clearCanvas();
    expect(capturedFillStyle.toLowerCase()).toBe('#87ceeb');
  });

  it('covers the full canvas when called with different canvas sizes', () => {
    const canvas = makeCanvas(1800, 1200);
    const renderer = new Renderer(canvas, 2);
    const fillRectSpy = jest.spyOn(renderer.ctx, 'fillRect');

    renderer.clearCanvas();

    expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 1800, 1200);
  });
});

describe('Renderer — renderBackground()', () => {
  it('sets fillStyle to CONFIG.backgroundColor', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    let capturedFillStyle;
    jest.spyOn(renderer.ctx, 'fillRect').mockImplementation(() => {
      capturedFillStyle = renderer.ctx.fillStyle;
    });
    renderer.renderBackground();
    expect(capturedFillStyle.toLowerCase()).toBe(CONFIG.backgroundColor.toLowerCase());
  });

  it('calls fillRect starting at (0, 0)', () => {
    const canvas = makeCanvas(900, 600);
    const renderer = new Renderer(canvas, 1);
    const fillRectSpy = jest.spyOn(renderer.ctx, 'fillRect');

    renderer.renderBackground();

    const [x, y] = fillRectSpy.mock.calls[fillRectSpy.mock.calls.length - 1];
    expect(x).toBe(0);
    expect(y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. drawScore() / renderScore()
// ---------------------------------------------------------------------------

describe('Renderer — drawScore() / renderScore()', () => {
  it('drawScore() calls ctx.fillText (score appears on canvas)', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.drawScore(42);

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('fillText receives the formatted survival time', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.drawScore(7);

    // Survival time is formatted with one decimal and a trailing "s".
    const calledWithScore = fillTextSpy.mock.calls.some(([text]) => text === '7.0s');
    expect(calledWithScore).toBe(true);
  });

  it('renders score "0" without throwing', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    expect(() => renderer.drawScore(0)).not.toThrow();
  });

  it('renderScore() also calls ctx.fillText', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.renderScore(5);

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('also calls ctx.strokeText for text outline', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const strokeTextSpy = jest.spyOn(renderer.ctx, 'strokeText');

    renderer.drawScore(10);

    expect(strokeTextSpy).toHaveBeenCalled();
  });

  it('sets textAlign to center during rendering', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    // Capture textAlign at the moment text is actually drawn
    let capturedTextAlign;
    jest.spyOn(renderer.ctx, 'fillText').mockImplementation(() => {
      capturedTextAlign = renderer.ctx.textAlign;
    });
    renderer.drawScore(3);
    expect(capturedTextAlign).toBe('center');
  });

  it('optionally renders high score when provided', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.drawScore(5, 20);

    // Should have at least two fillText calls: score + high score
    expect(fillTextSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Renderer — renderQueue()', () => {
  function makeQueue(n = 5) {
    return Array.from({ length: n }, (_, i) => ({ angle: CONFIG.pipeAngles[i % CONFIG.pipeAngles.length] }));
  }

  it('does not throw when drawing the supply queue', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    expect(() => renderer.renderQueue(makeQueue())).not.toThrow();
  });

  it('does nothing for an empty queue', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillRectSpy = jest.spyOn(renderer.ctx, 'fillRect');
    renderer.renderQueue([]);
    expect(fillRectSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. drawMenu() / renderWaitingScreen()
// ---------------------------------------------------------------------------

describe('Renderer — drawMenu() / renderWaitingScreen()', () => {
  it('drawMenu() calls ctx.fillText', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.drawMenu();

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('renderWaitingScreen() calls ctx.fillText', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.renderWaitingScreen();

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('drawMenu() renders the game title text', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.drawMenu();

    const textArgs = fillTextSpy.mock.calls.map(([text]) => text);
    const hasTitle = textArgs.some(t => typeof t === 'string' && t.length > 0);
    expect(hasTitle).toBe(true);
  });

  it('drawMenu() does not throw on small canvas', () => {
    const canvas = makeCanvas(200, 355);
    const renderer = new Renderer(canvas, 0.5);
    expect(() => renderer.drawMenu()).not.toThrow();
  });

  it('drawMenu() calls ctx.strokeText for outlined text', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const strokeTextSpy = jest.spyOn(renderer.ctx, 'strokeText');

    renderer.drawMenu();

    expect(strokeTextSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. drawGameOver() / renderGameOver()
// ---------------------------------------------------------------------------

describe('Renderer — drawGameOver() / renderGameOver()', () => {
  it('drawGameOver() calls ctx.fillText', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.drawGameOver(10, 20);

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('renderGameOver() calls ctx.fillText', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.renderGameOver(5, 15);

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('fillText includes the score value', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.drawGameOver(42, 50);

    const textArgs = fillTextSpy.mock.calls.map(([text]) => String(text));
    const hasScore = textArgs.some(t => t.includes('42'));
    expect(hasScore).toBe(true);
  });

  it('fillText includes the high score value', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.drawGameOver(10, 99);

    const textArgs = fillTextSpy.mock.calls.map(([text]) => String(text));
    const hasHighScore = textArgs.some(t => t.includes('99'));
    expect(hasHighScore).toBe(true);
  });

  it('drawGameOver() calls ctx.fillRect for the semi-transparent overlay', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillRectSpy = jest.spyOn(renderer.ctx, 'fillRect');

    renderer.drawGameOver(5, 10);

    expect(fillRectSpy).toHaveBeenCalled();
  });

  it('drawGameOver() does not throw when score is 0', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    expect(() => renderer.drawGameOver(0, 0)).not.toThrow();
  });

  it('drawGameOver() calls ctx.strokeText for outlined text', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const strokeTextSpy = jest.spyOn(renderer.ctx, 'strokeText');

    renderer.drawGameOver(3, 7);

    expect(strokeTextSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7. CONFIG color values match rendering expectations
// ---------------------------------------------------------------------------

describe('Renderer — color configuration', () => {
  it('CONFIG.backgroundColor is #87CEEB', () => {
    expect(CONFIG.backgroundColor).toBe('#87CEEB');
  });

  it('CONFIG.pipeColors contains 4 colors', () => {
    expect(Array.isArray(CONFIG.pipeColors)).toBe(true);
    expect(CONFIG.pipeColors.length).toBe(4);
  });

  it('clearCanvas() uses the same color as CONFIG.backgroundColor', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    let capturedFillStyle;
    jest.spyOn(renderer.ctx, 'fillRect').mockImplementation(() => {
      capturedFillStyle = renderer.ctx.fillStyle;
    });
    renderer.clearCanvas();
    expect(capturedFillStyle.toLowerCase()).toBe(CONFIG.backgroundColor.toLowerCase());
  });
});

// ---------------------------------------------------------------------------
// 8. TextPosition enum
// ---------------------------------------------------------------------------

describe('TextPosition enum', () => {
  it('defines TOP_CENTER, MIDDLE_CENTER, and BOTTOM_CENTER', () => {
    expect(TextPosition.TOP_CENTER).toBeDefined();
    expect(TextPosition.MIDDLE_CENTER).toBeDefined();
    expect(TextPosition.BOTTOM_CENTER).toBeDefined();
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(TextPosition)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. renderText() helper
// ---------------------------------------------------------------------------

describe('Renderer — renderText()', () => {
  it('calls ctx.fillText for TOP_CENTER position', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.renderText('Hello', TextPosition.TOP_CENTER);

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('calls ctx.fillText for MIDDLE_CENTER position', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.renderText('Hello', TextPosition.MIDDLE_CENTER);

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('calls ctx.fillText for BOTTOM_CENTER position', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.renderText('Hello', TextPosition.BOTTOM_CENTER);

    expect(fillTextSpy).toHaveBeenCalled();
  });

  it('renders the provided text string', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer(canvas, 1);
    const fillTextSpy = jest.spyOn(renderer.ctx, 'fillText');

    renderer.renderText('Test Message', TextPosition.MIDDLE_CENTER);

    const calledWithText = fillTextSpy.mock.calls.some(([text]) => text === 'Test Message');
    expect(calledWithText).toBe(true);
  });
});
