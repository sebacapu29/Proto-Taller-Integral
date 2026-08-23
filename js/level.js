"use strict";

/* =========================================================================
   Level - diseño manual del recorrido (vista de carriles tipo Excitebike:
   0 = carril superior, 1 = central, 2 = inferior). Cada obstáculo/rampa/
   ítem vive en un carril puntual; siempre queda al menos uno libre en cada
   posición para que el jugador pueda resolverlo cambiando de carril
   (flecha arriba/abajo), saltando cuando hay una rampa alineada, o ambos.
   La puerta y el interruptor de piso abarcan los tres carriles.
   ========================================================================= */
class Level {
  constructor() {
    const L = CONFIG.levelLength;
    this.length = L;
    this.finishX = L - 400;

    // El combustible total disponible (tanque inicial + bidones) debe
    // alcanzar para terminar el recorrido incluso con uso generoso de
    // turbo (necesario para no perder terreno contra la horda - ver
    // Horda en config.js). Se agregaron 3 bidones extra respecto del
    // diseño original: uno apenas pasado el primer bloqueo (la puerta),
    // uno tras el túnel oscuro y uno dentro de la persecución final,
    // que es el tramo de mayor consumo por depender más del turbo.
    this.fuelPickups = [
      [0.04, 1], [0.28, 0], [0.335, 2], [0.50, 2], [0.63, 0],
      [0.70, 1], [0.815, 1], [0.90, 0],
    ].map(([p, lane]) => new Collectible(p * L, "fuel", lane));
    this.batteryPickups = [
      [0.16, 2], [0.36, 0], [0.58, 1], [0.82, 2],
    ].map(([p, lane]) => new Collectible(p * L, "battery", lane));

    this.obstacles = [
      new Obstacle(0.20 * L, "barrier", 1),   // primer obstáculo: enseña a cambiar de carril (sin rampa cerca)
      new Obstacle(0.245 * L, "pit", 1),      // alineado con ramp1: saltar o esquivar cambiando de carril
      new Obstacle(0.34 * L, "debris", 0),
      new Obstacle(0.365 * L, "vehicle", 2),
      new Obstacle(0.39 * L, "barrier", 0),
      new Obstacle(0.41 * L, "slope", 2),
      new Obstacle(0.56 * L, "log", 1),
      new Obstacle(0.605 * L, "debris", 2),
      // Persecución final: algunos tramos bloquean dos carriles a la vez,
      // dejando sólo uno libre - exige anticipar el carril correcto.
      new Obstacle(0.76 * L, "vehicle", 0),
      new Obstacle(0.76 * L, "barrier", 2),
      new Obstacle(0.78 * L, "barrier", 1),
      new Obstacle(0.80 * L, "debris", 2),
      new Obstacle(0.83 * L, "log", 0),
      new Obstacle(0.83 * L, "debris", 1),
      new Obstacle(0.86 * L, "vehicle", 1),
      new Obstacle(0.89 * L, "barrier", 0),
    ];

    this.ramps = [
      new Ramp(0.24 * L, 240, 1),   // rampa de práctica, carril central
      new Ramp(0.46 * L, 240, 0),   // rampa hacia el interruptor elevado, carril superior
    ];

    this.door = new Door(0.322 * L); // barrera de ancho completo: bloquea los tres carriles
    this.groundSwitch = new SwitchEntity(0.300 * L, {
      // Sin `lane`: se puede activar desde cualquier carril. Radio amplio:
      // cubre desde bastante antes del interruptor hasta pasada la puerta,
      // para permitir reintentar sin retroceder si la puerta se cierra
      // antes de tiempo.
      width: 34, height: 44, radius: 1100, linkedDoor: this.door
    });

    this.trapTriggered = false;
    // width amplio: en marcha normal el arco de la rampa deja una ventana
    // de contacto muy angosta (llega justo antes de aterrizar); con este
    // margen sigue siendo alcanzable sin depender de un salto perfecto,
    // y con turbo la ventana es aún más cómoda. Carril superior, alineado
    // con su rampa.
    this.elevatedSwitch = new SwitchEntity(0.465 * L, {
      elevated: true, elevatedHeight: 130, width: 70, height: 36, radius: 60, lane: 0
    });

    this.hordeApproachZone = [0.34 * L, 0.42 * L];
    this.finalChaseZone = [0.75 * L, 0.92 * L];

    this.messages = [
      { x: 0.02 * L, text: "NO TE DETENGAS", duration: 2.6 },
      { x: 0.06 * L, text: "↑ / ↓ · CAMBIÁ DE CARRIL", duration: 2.8 },
      { x: 0.10 * L, text: "SE ACERCA LA OSCURIDAD · USÁ F", duration: 3 },
      { x: 0.29 * L, text: "PRESIONÁ E EN EL INTERRUPTOR", duration: 3 },
      { x: 0.455 * L, text: "SALTÁ EN LA RAMPA (CARRIL SUPERIOR)", duration: 2.8 },
      { x: 0.55 * L, text: "TÚNEL INESTABLE", duration: 2.6 },
      { x: 0.75 * L, text: "LA HORDA ESTÁ CERCA · USÁ EL TURBO", duration: 2.8 },
      { x: 0.965 * L, text: "REFUGIO A LA VISTA", duration: 2.6 },
    ];
    this._shownMessages = new Set();
    this._passed = false;
  }
  reset() {
    this.fuelPickups.forEach(c => c.reset());
    this.batteryPickups.forEach(c => c.reset());
    this.obstacles.forEach(o => o.reset());
    this.ramps.forEach(r => r.reset());
    this.door.reset();
    this.groundSwitch.reset();
    this.elevatedSwitch.reset();
    this.trapTriggered = false;
    this._shownMessages.clear();
    this._passed = false;
  }
}

/* =========================================================================
   Parallax background layers (siluetas proceduralmente generadas)
   ========================================================================= */
function buildLayer(seed, count, tileWidth, gen) {
  const rnd = Util.mulberry32(seed);
  const shapes = [];
  for (let i = 0; i < count; i++) shapes.push(gen(rnd, i));
  return { tileWidth, shapes };
}
const LAYERS = {
  sky: buildLayer(11, 10, 2200, (r) => ({
    x: r() * 2200, y: r() * 60, r: 40 + r() * 90, kind: "moon-cloud"
  })),
  far: buildLayer(22, 18, 2600, (r) => ({
    x: r() * 2600, w: 40 + r() * 90, h: 60 + r() * 160, kind: "ruin"
  })),
  mid: buildLayer(33, 26, 1800, (r) => ({
    x: r() * 1800, w: 18 + r() * 30, h: 50 + r() * 110, kind: r() > 0.5 ? "building" : "pole"
  })),
  near: buildLayer(44, 34, 1000, (r) => ({
    x: r() * 1000, kind: r() > 0.6 ? "tree" : (r() > 0.3 ? "fence" : "post"), h: 40 + r() * 70
  })),
};
