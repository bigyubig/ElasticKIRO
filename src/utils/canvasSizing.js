/**
 * canvasSizing.js — Canvas dimension and scale-factor utilities.
 *
 * Keeps the game canvas at the correct 4:3 aspect ratio while filling as much
 * of the viewport as possible, and exposes a scale factor so every subsystem
 * can size its elements proportionally.
 */

import CONFIG from '../config.js';

/**
 * Return the scale factor for a given canvas width relative to the design
 * baseline of 800 px.
 *
 * @param {number} width - Current canvas width in CSS pixels.
 * @returns {number} Scale factor (1.0 at 800 px wide).
 */
export function calculateScaleFactor(width) {
  return width / CONFIG.baseCanvasWidth;
}

/**
 * Resize the canvas so it fits inside the supplied viewport dimensions while
 * preserving the configured aspect ratio (default 4:3).  The canvas is scaled
 * uniformly (letter-boxed / pillar-boxed) so neither dimension overflows.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} viewportWidth  - Available width in CSS pixels.
 * @param {number} viewportHeight - Available height in CSS pixels.
 * @returns {number} The new scale factor after resizing.
 */
export function resizeCanvas(canvas, viewportWidth, viewportHeight) {
  const targetAspect = CONFIG.aspectRatio; // width / height

  let width = viewportWidth;
  let height = Math.round(width / targetAspect);

  if (height > viewportHeight) {
    height = viewportHeight;
    width = Math.round(height * targetAspect);
  }

  canvas.width = width;
  canvas.height = height;

  return calculateScaleFactor(width);
}
