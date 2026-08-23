"use strict";

/* =========================================================================
   Scooter - representación visual/física del vehículo
   ========================================================================= */
class Scooter {
  constructor() {
    this.jumpVy = 0;
    this.jumpOffset = 0; // 0 = en el piso, negativo = en el aire
    this.grounded = true;
    this.wheelRot = 0;
    this.suspension = 0;
    this.suspensionVel = 0;
    this.engineVibPhase = 0;
    this.tiltAngle = 0;
    this.wheelieTimer = 0;
  }
  reset() {
    this.jumpVy = 0; this.jumpOffset = 0; this.grounded = true;
    this.wheelRot = 0; this.suspension = 0; this.suspensionVel = 0; this.tiltAngle = 0;
    this.wheelieTimer = 0;
  }
  // Salto real: solo debe usarse al tomar una rampa (o contexto habilitado).
  jump(boost) {
    if (!this.grounded) return;
    this.jumpVy = -(boost ? CONFIG.jumpPowerBoost : CONFIG.jumpPower);
    this.grounded = false;
  }
  // Presionar salto fuera de una rampa: solo levanta la rueda delantera,
  // sin otorgar altura real (no debe permitir esquivar obstáculos).
  wheelie() {
    if (!this.grounded) return;
    this.wheelieTimer = 0.35;
  }
  // speedRatio: 1 = marcha normal, ~1.6 = turbo, <1 = arrastrándose sin combustible.
  // Solo afecta cosmética (giro de ruedas, vibración de motor), nunca el avance real.
  update(dt, speedRatio) {
    this.engineVibPhase += dt * 46 * (0.7 + 0.3 * speedRatio);
    this.wheelRot += dt * 10 * speedRatio;
    if (!this.grounded) {
      this.jumpVy += CONFIG.gravity * dt;
      this.jumpOffset += this.jumpVy * dt;
      if (this.jumpOffset >= 0) {
        this.jumpOffset = 0; this.jumpVy = 0; this.grounded = true;
        this.suspensionVel = 240; // impacto al aterrizar
        return "landed";
      }
    }
    if (this.wheelieTimer > 0) {
      this.wheelieTimer = Math.max(0, this.wheelieTimer - dt);
      const p = this.wheelieTimer / 0.35;
      this.tiltAngle = Math.sin(p * Math.PI) * 0.22;
    } else {
      this.tiltAngle = 0;
    }
    // suspensión resorte simple
    const k = 210, damp = 11;
    const force = -k * this.suspension - damp * this.suspensionVel;
    this.suspensionVel += force * dt;
    this.suspension += this.suspensionVel * dt;
    return null;
  }
}

/* =========================================================================
   Player - estado del jugador (recursos, faro, marcha, control)
   ========================================================================= */
class Player {
  constructor() {
    this.scooter = new Scooter();
    this.worldX = 0;
    this.fuel = CONFIG.fuelMax;
    this.battery = CONFIG.batteryMax;
    this.headlightOn = false;
    this.invulnTimer = 0;
    this.stalled = false;
    this.turboHeld = false;
    this.moveDirection = 0; // -1 retrocede, 0 detenida, 1 avanza (flechas izq/der)
    // Carril: cambia al instante (para que la colisión sea justa y
    // predecible); laneFloat es sólo la posición visual, que se desliza
    // detrás con una animación suave (ver easeLane).
    this.lane = Math.floor(CONFIG.laneCount / 2); // arranca en el carril central
    this.laneFloat = this.lane;
    this.rampBoostWindow = 0;
    this.onRamp = null;
    this.facing = 1;
    this.finished = false;
  }
  reset() {
    this.scooter.reset();
    this.worldX = 0;
    this.fuel = CONFIG.fuelMax;
    this.battery = CONFIG.batteryMax;
    this.headlightOn = false;
    this.invulnTimer = 0;
    this.stalled = false;
    this.turboHeld = false;
    this.moveDirection = 0;
    this.lane = Math.floor(CONFIG.laneCount / 2);
    this.laneFloat = this.lane;
    this.rampBoostWindow = 0;
    this.onRamp = null;
    this.finished = false;
  }
  changeLane(delta) {
    this.lane = Util.clamp(this.lane + delta, 0, CONFIG.laneCount - 1);
  }
  // Se llama una vez por frame: la posición visual persigue al carril lógico.
  easeLane(dt) {
    this.laneFloat = Util.lerp(this.laneFloat, this.lane, Math.min(1, dt * CONFIG.laneChangeSpeed));
  }
  // Velocidad real de avance (px/seg, con signo): positiva al avanzar,
  // negativa al retroceder, 0 si no se presiona ninguna flecha. El turbo
  // sólo aplica al avance.
  getSpeed() {
    if (this.moveDirection === 0) return 0;
    if (this.moveDirection < 0) {
      return -CONFIG.scooterSpeedReverse * (this.stalled ? CONFIG.stallSpeedFactor : 1);
    }
    const forward = this.turboHeld ? CONFIG.scooterSpeedTurbo : CONFIG.scooterSpeedNormal;
    return this.stalled ? forward * CONFIG.stallSpeedFactor : forward;
  }
  // Relación cosmética respecto de la marcha normal (con signo, para animaciones/sonido).
  get speedRatio() { return this.getSpeed() / CONFIG.scooterSpeedNormal; }
  toggleHeadlight() {
    if (this.battery <= 0) { this.headlightOn = false; return; }
    this.headlightOn = !this.headlightOn;
  }
  applyHit(hordePush) {
    if (this.invulnTimer > 0) return false;
    this.invulnTimer = 1.4;
    this.fuel = Math.max(0, this.fuel - 8);
    return true;
  }
}
