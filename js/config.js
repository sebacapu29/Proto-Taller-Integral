"use strict";

/* =========================================================================
   CONFIG - parámetros ajustables centralizados
   ========================================================================= */
const CONFIG = {
  // Movimiento: flecha derecha avanza, flecha izquierda retrocede; con SHIFT
  // (avanzando) se pasa a Turbo. Normal es económica; Turbo gana distancia
  // rápido pero drena combustible; retroceder es una maniobra táctica
  // (reposicionarse, reintentar un salto o la puerta) y también gasta
  // combustible al ritmo normal.
  scooterSpeedNormal: 210,     // px/seg en marcha normal (avanzando)
  scooterSpeedTurbo: 350,      // px/seg con turbo activado (avanzando)
  scooterSpeedReverse: 150,    // px/seg al retroceder
  turboFuelMultiplier: 1.9,    // consumo de combustible mientras el turbo está activo
  stallSpeedFactor: 0.85,      // multiplicador de velocidad sin combustible (sobre la normal):
                                // castiga pero debe dar tiempo real a reaccionar/llegar a un bidón

  // Recursos
  fuelMax: 100,
  fuelConsumptionRate: 1.55,  // por segundo, a marcha normal
  fuelPickupAmount: 34,
  batteryMax: 100,
  batteryDrainRate: 9,        // por segundo con faro encendido
  batteryPickupAmount: 38,
  lowFuelThreshold: 22,
  lowBatteryThreshold: 20,

  // Horda: se modela como una velocidad propia (unidades/seg) que compite
  // contra la velocidad real de avance del jugador. Regla simple y siempre
  // válida: en marcha NORMAL la horda es más rápida que vos y gana terreno
  // (presión constante); en TURBO vos sos más rápido que la horda y la
  // distancia crece. Los bonos de zona/estado (abajo) NUNCA se suman entre
  // sí (se toma el más alto, con Math.max) — así ninguna combinación de
  // eventos puede disparar una velocidad de horda desproporcionada que
  // borre de un plumazo una distancia ya ganada. Los fallos puntuales
  // (choque, puerta fallada, quedarse sin combustible) restan una cantidad
  // fija y acotada de distancia una sola vez, no un multiplicador continuo.
  hordeDistanceStart: 900,
  hordeDistanceMax: 1050,
  hordeCatchDistance: 8,         // distancia a la que se considera "alcanzado" (colisión):
                                  // la horda debe estar prácticamente encima, no sólo cerca
  hordeBaseSpeed: 225,           // "velocidad de caminata" base de la horda (> normal, < turbo)
  hordeSpeedRampByProgress: 55,  // se suma gradualmente hasta el final del nivel
  hordeApproachZoneBonus: 40,    // presión extra en el tramo guionado de acercamiento
  hordeFinalChaseZoneBonus: 90,  // presión extra en la persecución final (turbo sigue ganando)
  hordeStallSpeedBonus: 20,      // presión propia y acotada de estar sin combustible (reemplaza,
                                  // no suma, cualquier bono de zona: es su propia crisis, predecible)
  hordeStallPenalty: 110,        // golpe puntual, una sola vez, al quedarse sin combustible
  hordeTrapSlowBonus: -200,      // frenado de la horda al activar la trampa ambiental
  hordeHitPenalty: 70,
  hordeDoorFailPenalty: 90,
  hordeMissPuzzlePenalty: 55,
  hordeSuccessRelief: 60,
  hordeDoorPassRelief: 90,
  hordeTrapRelief: 130,
  hordePickupRelief: 12,

  // Puertas
  doorOpenDuration: 3.4,      // segundos que permanece abierta
  doorOpenSpeed: 1.6,         // velocidad de apertura (fracción/seg)
  doorCloseWarn: 1.1,         // segundos antes del cierre en que parpadea

  // Faro
  lightIntensity: 0.95,
  lightLength: 430,           // longitud del cono de luz
  lightAngle: 0.62,           // radianes de semi-apertura del cono

  // Física de salto
  gravity: 1550,
  jumpPower: 560,
  jumpPowerBoost: 780,        // si se presiona salto justo al entrar a la rampa
  jumpClearHeight: 46,        // altura mínima para "esquivar" un obstáculo

  // Cámara / temblor
  shakeIntensity: 1,
  shakeHordeNear: 260,        // distancia bajo la cual empieza el temblor por horda
  cameraLookahead: 46,

  // Audio
  masterVolume: 0.5,

  // Nivel
  levelLength: 42000,
  survivalVictoryTime: 150,   // segundos: victoria alternativa por "escapar" de la horda,
                               // sin necesidad de llegar al final físico del recorrido
};

const STATE = {
  MENU: "MENU",
  INSTRUCTIONS: "INSTRUCTIONS",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAMEOVER: "GAMEOVER",
  VICTORY: "VICTORY",
};

/* =========================================================================
   Utilidades
   ========================================================================= */
const Util = {
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  },
  rand(a, b) { return a + Math.random() * (b - a); },
  choice(arr) { return arr[(Math.random() * arr.length) | 0]; },
  mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
};
