"use strict";

/* =========================================================================
   Lighting - oscuridad ambiente + cono de faro
   ========================================================================= */
class Lighting {
  constructor() {
    this.overlay = document.createElement("canvas");
    this.octx = this.overlay.getContext("2d");
    this.flickerPhase = 0;
  }
  resize(w, h) { this.overlay.width = w; this.overlay.height = h; }
  darknessAtProgress(worldX) {
    const L = CONFIG.levelLength;
    const kf = [
      [0, 0.06], [0.05 * L, 0.10], [0.20 * L, 0.55], [0.54 * L, 0.55],
      [0.55 * L, 0.95], [0.62 * L, 0.95], [0.64 * L, 0.55], [0.75 * L, 0.62],
      [0.90 * L, 0.85], [L, 0.85]
    ];
    for (let i = 0; i < kf.length - 1; i++) {
      if (worldX >= kf[i][0] && worldX <= kf[i + 1][0]) {
        const t = (worldX - kf[i][0]) / Math.max(1, (kf[i + 1][0] - kf[i][0]));
        return Util.lerp(kf[i][1], kf[i + 1][1], t);
      }
    }
    return worldX < kf[0][0] ? kf[0][1] : kf[kf.length - 1][1];
  }
  isUnstableZone(worldX) {
    const L = CONFIG.levelLength;
    return worldX >= 0.55 * L && worldX <= 0.62 * L;
  }
  render(ctx, w, h, opts) {
    const { headlightOn, headlightX, headlightY, batteryLow, batteryOn, darkness, unstable, angleFacing } = opts;
    this.flickerPhase += 0.016;
    const octx = this.octx;
    octx.clearRect(0, 0, w, h);
    let alpha = 0.12 + darkness * 0.72;
    if (unstable) {
      alpha += Math.sin(this.flickerPhase * 27) * 0.05 + (Math.random() - 0.5) * 0.05;
    }
    alpha = Util.clamp(alpha, 0.08, 0.94);
    octx.globalCompositeOperation = "source-over";
    octx.fillStyle = `rgba(3,4,10,${alpha})`;
    octx.fillRect(0, 0, w, h);

    if (headlightOn && batteryOn) {
      let intensity = CONFIG.lightIntensity;
      if (batteryLow) intensity *= 0.55 + Math.sin(this.flickerPhase * 18) * 0.35 + (Math.random() - 0.5) * 0.25;
      if (unstable) intensity *= 0.5 + Math.random() * 0.6;
      intensity = Util.clamp(intensity, 0, 1);

      octx.globalCompositeOperation = "destination-out";
      const length = CONFIG.lightLength;
      const grad = octx.createRadialGradient(headlightX, headlightY, 4, headlightX, headlightY, length);
      grad.addColorStop(0, `rgba(0,0,0,${intensity})`);
      grad.addColorStop(0.45, `rgba(0,0,0,${intensity * 0.75})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      octx.fillStyle = grad;
      octx.beginPath();
      octx.moveTo(headlightX, headlightY);
      const a0 = angleFacing - CONFIG.lightAngle;
      const a1 = angleFacing + CONFIG.lightAngle;
      octx.arc(headlightX, headlightY, length, a0, a1);
      octx.closePath();
      octx.fill();

      // halo cercano suave (mejora contraste cercano)
      const halo = octx.createRadialGradient(headlightX, headlightY, 0, headlightX, headlightY, 70);
      halo.addColorStop(0, `rgba(0,0,0,${intensity})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      octx.fillStyle = halo;
      octx.beginPath(); octx.arc(headlightX, headlightY, 70, 0, Math.PI * 2); octx.fill();
    }

    ctx.drawImage(this.overlay, 0, 0);
  }
  renderVignette(ctx, w, h, hordeProximity) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.9);
    const redTint = hordeProximity > 0.6 ? (hordeProximity - 0.6) * 0.9 : 0;
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(${20 + redTint * 140},0,${4},0.75)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}
