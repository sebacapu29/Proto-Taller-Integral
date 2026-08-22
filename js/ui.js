"use strict";

/* =========================================================================
   UI - HUD minimalista dibujado en canvas
   ========================================================================= */
class UI {
  constructor() {
    this.toasts = []; // {text, life, maxLife}
  }
  pushToast(text, life) {
    if (this.toasts.some(t => t.text === text && t.life > 0)) return;
    this.toasts.push({ text, life: life || 2, maxLife: life || 2 });
  }
  update(dt) {
    this.toasts.forEach(t => t.life -= dt);
    this.toasts = this.toasts.filter(t => t.life > 0);
  }
  bar(ctx, x, y, w, h, pct, color, label) {
    ctx.fillStyle = "rgba(5,6,8,0.65)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(216,210,196,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    const fillW = Math.max(0, (w - 4) * Util.clamp(pct, 0, 1));
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y + 2, fillW, h - 4);
    ctx.fillStyle = "rgba(216,210,196,0.85)";
    ctx.font = "10px Consolas, monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w + 8, y + h / 2);
  }
  render(ctx, w, h, game) {
    const p = game.player;
    ctx.save();
    ctx.textBaseline = "alphabetic";

    // Combustible / batería
    this.bar(ctx, 14, 14, 120, 12, p.fuel / CONFIG.fuelMax,
      p.fuel < CONFIG.lowFuelThreshold ? "#b23a2f" : "#e2a244", "COMBUSTIBLE");
    this.bar(ctx, 14, 34, 120, 12, p.battery / CONFIG.batteryMax,
      p.battery < CONFIG.lowBatteryThreshold ? "#b23a2f" : "#6f8fb2", "BATERÍA");

    // Faro estado
    ctx.font = "11px Consolas, monospace";
    ctx.fillStyle = p.headlightOn ? "#e2a244" : "#7a746a";
    ctx.fillText("FARO: " + (p.headlightOn ? "ON" : "OFF") + "  [F]", 14, 66);

    // Marcha (avanzando normal/turbo, retrocediendo, o detenida)
    const turboActive = p.turboHeld && !p.stalled;
    let marchaLabel, marchaColor;
    if (p.moveDirection === 0) { marchaLabel = "DETENIDA"; marchaColor = "#b23a2f"; }
    else if (p.moveDirection < 0) { marchaLabel = "RETROCEDIENDO"; marchaColor = "#8a8478"; }
    else if (p.stalled) { marchaLabel = "SIN COMBUSTIBLE"; marchaColor = "#b23a2f"; }
    else { marchaLabel = turboActive ? "TURBO" : "NORMAL"; marchaColor = turboActive ? "#e2a244" : "#8a8478"; }
    ctx.fillStyle = marchaColor;
    ctx.fillText(
      "MARCHA: " + marchaLabel + "  [← → SHIFT]",
      14, 82
    );

    // Horda distancia
    const prox = game.horde.proximity01();
    ctx.fillStyle = prox > 0.7 ? "#e05a4a" : "#c8c2b4";
    ctx.textAlign = "right";
    ctx.fillText("HORDA: " + Math.max(0, Math.round(game.horde.distance)) + "m", w - 14, 24);
    // barra de proximidad horda
    const hbw = 140;
    ctx.textAlign = "left";
    this.bar(ctx, w - 14 - hbw - 46, 32, hbw, 10, prox, prox > 0.7 ? "#b23a2f" : "#8a5a3a", "");

    // Indicador contextual E
    if (game.contextHintVisible) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold 13px Consolas, monospace";
      ctx.fillStyle = "#0a0a0a";
      const cx = w * 0.5, cy = h * 0.68;
      ctx.fillStyle = "rgba(226,162,68,0.92)";
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#151109";
      ctx.fillText("E", cx, cy + 4);
      ctx.restore();
    }

    // Toasts / mensajes breves
    let ty = 58;
    ctx.textAlign = "center";
    for (const t of this.toasts) {
      const a = Util.clamp(t.life / Math.min(0.5, t.maxLife), 0, 1);
      ctx.globalAlpha = Math.min(1, a + 0.15);
      ctx.font = "bold 13px Consolas, monospace";
      ctx.fillStyle = "#e2a244";
      ctx.fillText(t.text, w / 2, ty);
      ctx.globalAlpha = 1;
      ty += 18;
    }

    // Progreso del nivel (barra fina superior)
    const progress = Util.clamp(p.worldX / game.level.length, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, h - 4, w, 4);
    ctx.fillStyle = "rgba(226,162,68,0.55)";
    ctx.fillRect(0, h - 4, w * progress, 4);

    ctx.restore();
  }
}
