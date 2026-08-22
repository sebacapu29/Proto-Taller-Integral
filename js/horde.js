"use strict";

/* =========================================================================
   Horde - presión dinámica representada como masa de siluetas.

   Modelo de distancia: la horda tiene su propia velocidad de avance
   (CONFIG.hordeBaseSpeed, creciente con el progreso del nivel). Cada frame
   la distancia cambia según (velocidadJugador - velocidadHorda) * dt, así
   que administrar la marcha normal/turbo del jugador tiene un efecto
   directo y continuo sobre si se gana o se pierde terreno. Por encima de
   eso, eventos puntuales (choques, puertas falladas, puzles, recolección)
   empujan o alivian la distancia de forma instantánea, y `speedBonus`
   permite que tramos guionados (o la trampa ambiental) aceleren o frenen
   temporalmente a la horda sin tocar el modelo base.
   ========================================================================= */
class Horde {
  constructor() {
    this.distance = CONFIG.hordeDistanceStart;
    this.maxDistance = CONFIG.hordeDistanceMax;
    this.silhouettes = [];
    const rnd = Util.mulberry32(777);
    for (let i = 0; i < 46; i++) {
      this.silhouettes.push({
        ox: rnd() * 420,
        oy: rnd() * 30,
        scale: 0.7 + rnd() * 0.9,
        speed: 0.6 + rnd() * 1.3,
        phase: rnd() * Math.PI * 2,
        armPhase: rnd() * Math.PI * 2,
      });
    }
    this.speedBonus = 0; // ajustado por Game según zona/estado (lerp suave)
    this.reachedPlayer = false;
  }
  reset() {
    this.distance = CONFIG.hordeDistanceStart;
    this.maxDistance = CONFIG.hordeDistanceMax;
    this.speedBonus = 0;
    this.reachedPlayer = false;
  }
  approach(amount) {
    this.distance = Util.clamp(this.distance - amount, 0, this.maxDistance);
  }
  relieve(amount) {
    this.distance = Util.clamp(this.distance + amount, 0, this.maxDistance);
  }
  update(dt, playerSpeed, progress01) {
    this.maxDistance = CONFIG.hordeDistanceMax - progress01 * 260;
    const rampedBase = CONFIG.hordeBaseSpeed + progress01 * CONFIG.hordeSpeedRampByProgress;
    const hordeSpeed = Math.max(30, rampedBase + this.speedBonus);
    const delta = (playerSpeed - hordeSpeed) * dt;
    this.distance = Util.clamp(this.distance + delta, 0, this.maxDistance);
    if (this.distance <= CONFIG.hordeCatchDistance) this.reachedPlayer = true;
  }
  proximity01() {
    return 1 - Util.clamp(this.distance / this.maxDistance, 0, 1);
  }
}
