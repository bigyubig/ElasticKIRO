/**
 * CollisionDetector.js — Ball-vs-pipe (circle vs angled bar), wall bounces,
 * and the bottom-out (game over) check.
 */

export class CollisionDetector {
  /**
   * @param {number} canvasHeight - Canvas height in pixels used for boundary checks
   */
  constructor(canvasHeight) {
    /** @type {number} Canvas height for the bottom-out check. */
    this.canvasHeight = canvasHeight;
  }

  /**
   * Closest point on segment AB to point P.
   * @param {number} px @param {number} py
   * @param {number} ax @param {number} ay
   * @param {number} bx @param {number} by
   * @returns {{x:number, y:number}}
   * @private
   */
  _closestPointOnSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    if (lenSq === 0) return { x: ax, y: ay };
    let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: ax + t * abx, y: ay + t * aby };
  }

  /**
   * Tests the ball (circle) against a pipe (an angled bar treated as a capsule
   * of radius thickness/2). A hit requires both overlap AND that the ball is
   * approaching the bar's upward surface (velocity·normal < 0).
   *
   * @param {import('../entities/Ghosty.js').Ghosty} ball
   * @param {import('../entities/Pipe.js').Pipe} pipe
   * @returns {{hit:boolean, normal?:{x:number,y:number}, penetration?:number}}
   */
  circleVsSegment(ball, pipe) {
    const c = ball.getCenter();
    const seg = pipe.getSegment();
    const closest = this._closestPointOnSegment(
      c.x,
      c.y,
      seg.ax,
      seg.ay,
      seg.bx,
      seg.by
    );

    const dx = c.x - closest.x;
    const dy = c.y - closest.y;
    const dist = Math.hypot(dx, dy);
    const combined = ball.radius + pipe.thickness / 2;

    if (dist > combined) return { hit: false };

    const normal = pipe.getNormal();
    const approaching = ball.velocityX * normal.x + ball.velocityY * normal.y < 0;
    if (!approaching) return { hit: false };

    return {
      hit: true,
      normal,
      penetration: combined - dist,
    };
  }

  /**
   * Bounces the ball off the left, right, and top walls so it stays in view.
   * Repositions the ball inside the bounds and reverses the relevant velocity
   * component. The bottom is intentionally not handled here (it is lethal).
   *
   * @param {import('../entities/Ghosty.js').Ghosty} ball
   * @param {number} canvasWidth
   * @returns {boolean} true if any wall was hit
   */
  checkWalls(ball, canvasWidth) {
    let hit = false;

    // Left wall
    if (ball.x < 0) {
      ball.x = 0;
      if (ball.velocityX < 0) ball.velocityX = -ball.velocityX;
      hit = true;
    }

    // Right wall
    const maxX = canvasWidth - ball.width;
    if (ball.x > maxX) {
      ball.x = maxX;
      if (ball.velocityX > 0) ball.velocityX = -ball.velocityX;
      hit = true;
    }

    // Top wall
    if (ball.y < 0) {
      ball.y = 0;
      if (ball.velocityY < 0) ball.velocityY = -ball.velocityY;
      hit = true;
    }

    return hit;
  }

  /**
   * True when the ball has fully fallen past the bottom edge of the canvas.
   * @param {import('../entities/Ghosty.js').Ghosty} ball
   * @param {number} [canvasHeight=this.canvasHeight]
   * @returns {boolean}
   */
  isBelowBottom(ball, canvasHeight = this.canvasHeight) {
    const c = ball.getCenter();
    return c.y - ball.radius > canvasHeight;
  }
}

export default CollisionDetector;
