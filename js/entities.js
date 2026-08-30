"use strict";

/* =========================================================================
   Entity base
   ========================================================================= */
class Entity {
  // lane: null = independiente del carril (afecta/es visible en los tres);
  // un número (0..CONFIG.laneCount-1) ata la entidad a un carril puntual.
  constructor(worldX, width, height, lane) {
    this.worldX = worldX;
    this.width = width;
    this.height = height;
    this.lane = (lane === undefined) ? null : lane;
  }
  screenX(camera) { return this.worldX - camera.x + camera.playerScreenX; }
}

/* =========================================================================
   Collectible
   ========================================================================= */
class Collectible extends Entity {
  constructor(worldX, type, lane) {
    super(worldX, 26, 26, lane);
    this.type = type; // 'fuel' | 'battery'
    this.collected = false;
    this.phase = Math.random() * Math.PI * 2;
  }
  reset() { this.collected = false; }
}

/* =========================================================================
   Obstacle
   ========================================================================= */
class Obstacle extends Entity {
  constructor(worldX, type, lane) {
    const sizes = {
      vehicle: [110, 58], pit: [90, 20], barrier: [60, 46],
      debris: [70, 34], log: [80, 26], slope: [100, 30]
    };
    const s = sizes[type] || [60, 40];
    super(worldX, s[0], s[1], lane);
    this.type = type;
    this.resolved = false; // ya generó su efecto una vez
  }
  reset() { this.resolved = false; }
}

/* =========================================================================
   FrontZombie - zombi individual que aparece de frente, atado a un carril.
   Empieza quieto en su posición de aparición y sólo camina hacia el
   jugador (worldX decreciente) una vez que éste entra en rango de
   activación; se esquiva cambiando de carril / saltando, o se elimina con
   un disparo hacia adelante.
   ========================================================================= */
class FrontZombie extends Entity {
  constructor(worldX, lane) {
    super(worldX, 30, 50, lane);
    this.spawnX = worldX;
    this.alive = true;
    this.activated = false;
    this.deathTimer = 0; // breve fade al morir, antes de dejar de dibujarse
  }
  reset() {
    this.worldX = this.spawnX;
    this.alive = true;
    this.activated = false;
    this.deathTimer = 0;
  }
}

/* =========================================================================
   Ramp
   ========================================================================= */
class Ramp extends Entity {
  constructor(worldX, width, lane) {
    super(worldX, width || 220, 40, lane);
    this.used = false;
  }
  reset() { this.used = false; }
}

/* =========================================================================
   Switch (interruptor de piso o elevado)
   ========================================================================= */
class SwitchEntity extends Entity {
  constructor(worldX, opts) {
    opts = opts || {};
    // opts.lane: si se omite queda null (interactuable desde cualquier
    // carril); el interruptor de piso usa esto para seguir siendo
    // reintentable sin exigir un carril exacto.
    super(worldX, opts.width || 30, opts.height || 40, opts.lane);
    this.elevated = !!opts.elevated;
    this.elevatedHeight = opts.elevatedHeight || 120; // altura sobre el suelo
    this.activateByTouch = !!opts.activateByTouch;
    this.activated = false;
    this.linkedDoor = opts.linkedDoor || null;
    this.onActivate = opts.onActivate || null;
    this.radius = opts.radius || 90;
  }
  reset() { this.activated = false; }
}

/* =========================================================================
   Door - siempre abarca los tres carriles (barrera de ancho completo)
   ========================================================================= */
class Door extends Entity {
  constructor(worldX) {
    super(worldX, 26, 130, null);
    this.state = "CLOSED"; // CLOSED, OPENING, OPEN, CLOSING
    this.openness = 0; // 0..1
    this.openTimer = 0;
    this.failedFlashTimer = 0;
  }
  reset() {
    this.state = "CLOSED"; this.openness = 0; this.openTimer = 0; this.failedFlashTimer = 0;
  }
  trigger() {
    if (this.state === "CLOSED") this.state = "OPENING";
  }
  update(dt) {
    if (this.state === "OPENING") {
      this.openness = Math.min(1, this.openness + dt * CONFIG.doorOpenSpeed);
      if (this.openness >= 1) { this.state = "OPEN"; this.openTimer = CONFIG.doorOpenDuration; }
    } else if (this.state === "OPEN") {
      this.openTimer -= dt;
      if (this.openTimer <= 0) this.state = "CLOSING";
    } else if (this.state === "CLOSING") {
      this.openness = Math.max(0, this.openness - dt * CONFIG.doorOpenSpeed);
      if (this.openness <= 0) { this.state = "CLOSED"; this.openTimer = 0; }
    }
    if (this.failedFlashTimer > 0) this.failedFlashTimer -= dt;
  }
  isBlocking() { return this.openness < 0.65; }
}
