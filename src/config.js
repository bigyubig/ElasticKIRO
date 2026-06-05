/**
 * config.js — Single source of truth for all game constants.
 * Never hardcode physics values, colors, or asset paths outside this file.
 *
 * Game: Ghost Ball Bouncer — a ghost-ball falls under gravity and is reflected
 * upward off an angled, player-controlled pipe at the bottom. The pipe swaps
 * from a 5-pipe supply queue on every bounce. Survival time is the score.
 */

const CONFIG = {
  // ── Physics ──────────────────────────────────────────────────────────────
  gravity: 0.15,              // px/frame² — downward acceleration applied each frame
  restitution: 0.98,          // 0..1      — fraction of speed kept after a pipe bounce
  maxSpeed: 16,               // px/frame  — terminal speed magnitude for the ball
  ballRadius: 20,             // px        — collision radius of the ghost ball (at 1× scale)
  minBounceUpSpeed: 10,       // px/frame  — minimum upward speed guaranteed after every bounce

  // ── Pipe (player-controlled angled paddle) ────────────────────────────────
  pipeLength: 160,            // px        — base length of the angled bar (at 1× scale)
  activePipeLengthScale: 1.5, // ×         — active pipe is this much longer than queue pipes
  pipeThickness: 18,          // px        — thickness of the bar (at 1× scale)
  pipeMoveSpeed: 7,           // px/frame  — horizontal speed when holding left/right
  pipeCenterYOffset: 90,      // px        — distance of pipe center from the bottom edge
  pipeAngles: [-40, -25, -12, 0, 12, 25, 40], // degrees — allowed pipe tilt angles
  queueSize: 5,               // pipes     — number of upcoming pipes shown on the right
  pipeColors: ['#e53935', '#43A047', '#FDD835', '#1E88E5'], // red/green/yellow/blue

  // ── Visual ───────────────────────────────────────────────────────────────
  baseCanvasWidth: 800,       // px        — baseline width (800×600 design resolution)
  aspectRatio: 800 / 600,     // width / height — 4:3 landscape
  backgroundColor: '#87CEEB', // sky blue background

  // ── Asset Paths ──────────────────────────────────────────────────────────
  ghostySpritePath: 'assets/ghosty.png',
  jumpSoundPath: 'assets/jump.wav',
  gameOverSoundPath: 'assets/game_over.wav',

  // ── Timeouts ─────────────────────────────────────────────────────────────
  imageLoadTimeout: 10000,    // ms — max wait for image assets before showing error
  audioLoadTimeout: 5000,     // ms — max wait for audio assets before logging and continuing
};

export default CONFIG;
