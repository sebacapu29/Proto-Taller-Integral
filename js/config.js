"use strict";

/* =========================================================================
   CONFIG - parámetros ajustables centralizados
   ========================================================================= */
const CONFIG = {
  // Carriles (vista tipo Excitebike): la pista tiene varias líneas
  // paralelas y el jugador cambia entre ellas con flecha arriba/abajo,
  // independientemente del salto (W / Espacio) y del avance (flecha
  // derecha/izquierda). Obstáculos, rampas, ítems y el interruptor
  // elevado viven en un carril puntual; la puerta y el interruptor de
  // piso abarcan los tres.
  laneCount: 3,
  laneSpacing: 58,          // separación vertical entre carriles (unidades base, se escala con la pantalla)
  laneChangeSpeed: 13,      // suavizado del desplazamiento visual entre carriles (mayor = más rápido)

  // Movimiento: flecha derecha avanza, flecha izquierda retrocede. La
  // velocidad de avance ya no se elige con SHIFT/Turbo binario: la regula
  // la barra de velocidad del HUD (slider 0..1, ver Player.speedSlider),
  // que interpola entre Normal y Turbo de forma continua. El Turbo como
  // concepto/valores queda implementado (lo usa el slider como techo),
  // simplemente ya no lo dispara la tecla Shift. Retroceder es una
  // maniobra táctica (reposicionarse, reintentar un salto o la puerta),
  // con su propia velocidad fija sin importar el slider.
  scooterSpeedNormal: 210,     // px/seg — extremo inferior del slider de velocidad
  scooterSpeedTurbo: 420,      // px/seg — extremo superior del slider de velocidad; subido de 350
                                // tras playtesting para que el juego se sienta más frenético
  scooterSpeedReverse: 150,    // px/seg al retroceder

  // Golpe (obstáculo o zombi de frente, ver Player.applyHit): además de la
  // invulnerabilidad breve y la penalización a la distancia de la horda,
  // la moto queda renga un rato — se nota el impacto más allá del susto.
  hitSpeedPenaltyFactor: 0.5,   // multiplicador de velocidad mientras dura la penalización
  hitSpeedPenaltyDuration: 4,   // segundos que dura, después vuelve sola al 100%

  // Recursos: el combustible es ilimitado (no se administra como recurso;
  // los bidones siguen apareciendo en el nivel, pero sólo como alivio
  // extra de horda, no hace falta juntarlos para no quedarse sin nafta).
  batteryMax: 100,
  batteryDrainRate: 9,        // por segundo con faro encendido
  batteryPickupAmount: 38,
  lowBatteryThreshold: 20,

  // Horda: se modela como una velocidad propia (unidades/seg) que compite
  // contra la velocidad real de avance del jugador. Regla simple y siempre
  // válida: en marcha NORMAL la horda es más rápida que vos y gana terreno
  // (presión constante); en TURBO vos sos más rápido que la horda y la
  // distancia crece. Los bonos de zona/estado (abajo) NUNCA se suman entre
  // sí (se toma el más alto, con Math.max) — así ninguna combinación de
  // eventos puede disparar una velocidad de horda desproporcionada que
  // borre de un plumazo una distancia ya ganada. Los fallos puntuales
  // (choque, puerta fallada) restan una cantidad fija y acotada de
  // distancia una sola vez, no un multiplicador continuo.
  hordeDistanceStart: 500,       // bajado otra vez (era 600) para que la horda esté siempre
                                  // encima del jugador, no sólo al arrancar
  hordeDistanceMax: 1050,
  hordeCatchDistance: 8,         // distancia a la que se considera "alcanzado" (colisión):
                                  // la horda debe estar prácticamente encima, no sólo cerca
  // Velocidad de la horda: subida fuerte (no un ajuste chico) tras
  // playtesting — con los valores anteriores alcanzaba con sostener Turbo
  // para dejarla atrás sin sobresaltos casi todo el recorrido. Ahora la
  // base sola ya deja un margen de Turbo bastante más ajustado desde el
  // arranque, y hacia el final el margen pasa a ser mínimo — al punto de
  // que sostener Turbo ya no alcanza por sí solo: hace falta ir limpio con
  // los obstáculos y usar el disparo hacia atrás (hordeShotRelief, ver
  // Disparos) como herramienta activa, no como bonus opcional.
  hordeBaseSpeed: 370,           // "velocidad de caminata" base de la horda (> normal, < turbo)
  hordeSpeedRampByProgress: 45,  // se suma gradualmente hasta el final del nivel; más chico que
                                  // antes porque la base ya viene alta y no puede superar a Turbo
  hordeApproachZoneBonus: 20,    // presión extra en el tramo guionado de acercamiento
  hordeFinalChaseZoneBonus: 6,   // presión extra en la persecución final: chica en términos
                                  // absolutos porque a esa altura la base+rampa ya casi igualan
                                  // a Turbo (420) — el margen restante es mínimo a propósito
  hordeTrapSlowBonus: -200,      // frenado de la horda al activar la trampa ambiental
  hordeHitPenalty: 70,
  hordeDoorFailPenalty: 90,
  hordeSuccessRelief: 60,
  hordeDoorPassRelief: 90,
  hordeTrapRelief: 130,
  hordePickupRelief: 12,
  hordeShotRelief: 28,        // alivio puntual por cada disparo hacia atrás (frena a la horda);
                                // subido de 14 para que se sienta como una herramienta real, no
                                // un bonus menor — con el margen de Turbo ahora tan ajustado
                                // (ver hordeBaseSpeed), sostener el gatillo en los tramos duros
                                // debe notarse en la distancia, no ser un gesto cosmético

  // Disparos: munición infinita, limitados por cooldown. El de atrás frena
  // a la horda (alivio puntual repetible). El de adelante ahora sí tiene
  // efecto: elimina zombis de frente (ver más abajo) antes de que choquen.
  shotCooldown: 0.35,   // segundos mínimos entre disparos, por dirección
  bulletSpeed: 900,     // u/s, velocidad visual del proyectil
  bulletLifetime: 1.1,  // segundos antes de desvanecerse

  // Zombis de frente: aparecen de a uno, atados a un carril, caminando
  // hacia el jugador (a su propia velocidad, independiente de la del
  // jugador) desde que éste se acerca lo suficiente. Se esquivan cambiando
  // de carril (o saltando, si hay una rampa alineada) o se eliminan con el
  // disparo hacia adelante antes de que choquen.
  frontZombieSpeed: 95,             // u/s a la que camina hacia el jugador una vez activado
  frontZombieActivationRange: 650,  // distancia en X a la que "despierta" y empieza a caminar
  frontZombieHitPenalty: 45,        // choque no esquivado: empuja a la horda (similar a un obstáculo)
  frontZombieKillRelief: 16,        // alivio puntual por eliminarlo de un disparo hacia adelante

  // Puertas
  doorOpenDuration: 3.4,      // segundos que permanece abierta
  doorOpenSpeed: 1.6,         // velocidad de apertura (fracción/seg)
  doorCloseWarn: 1.1,         // segundos antes del cierre en que parpadea

  // Faro
  lightIntensity: 0.95,
  lightLength: 430,           // longitud del cono de luz
  lightAngle: 0.62,           // radianes de semi-apertura del cono

  // Física de salto: gravedad más baja + más potencia = arco más alto y con
  // más hang-time, así se cubre más distancia hacia adelante en el mismo
  // "tiro oblicuo" (la distancia horizontal la sigue dando la velocidad de
  // avance normal, pero durante más tiempo en el aire).
  gravity: 1300,
  jumpPower: 620,
  jumpPowerBoost: 880,        // si se presiona salto justo al entrar a la rampa
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
