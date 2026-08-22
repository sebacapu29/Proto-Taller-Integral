"use strict";

/* =========================================================================
   Camera
   ========================================================================= */
class Camera {
  constructor() {
    this.x = 0;
    this.playerScreenX = 0.30;
    this.shakeTrauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.lookahead = 0;
  }
  addShake(amount) { this.shakeTrauma = Util.clamp(this.shakeTrauma + amount, 0, 1); }
  update(dt, playerWorldX, hordeProximity) {
    this.x = playerWorldX;
    this.lookahead = Util.lerp(this.lookahead, CONFIG.cameraLookahead, dt * 2);
    const ambientShake = hordeProximity > 0.55 ? (hordeProximity - 0.55) * 0.9 : 0;
    this.shakeTrauma = Util.clamp(Math.max(this.shakeTrauma - dt * 1.3, ambientShake), 0, 1);
    const power = this.shakeTrauma * this.shakeTrauma * 14 * CONFIG.shakeIntensity;
    this.shakeX = (Math.random() * 2 - 1) * power;
    this.shakeY = (Math.random() * 2 - 1) * power * 0.6;
  }
}
