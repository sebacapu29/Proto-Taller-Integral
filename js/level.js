"use strict";

/* =========================================================================
   Level - diseño manual del recorrido
   ========================================================================= */
class Level {
  constructor() {
    const L = CONFIG.levelLength;
    this.length = L;
    this.finishX = L - 400;

    this.fuelPickups = [0.04, 0.28, 0.50, 0.70, 0.90].map(p => new Collectible(p * L, "fuel"));
    this.batteryPickups = [0.16, 0.36, 0.58, 0.82].map(p => new Collectible(p * L, "battery"));

    this.obstacles = [
      new Obstacle(0.20 * L, "barrier"),
      new Obstacle(0.245 * L, "pit"),
      new Obstacle(0.34 * L, "debris"),
      new Obstacle(0.365 * L, "vehicle"),
      new Obstacle(0.39 * L, "barrier"),
      new Obstacle(0.41 * L, "slope"),
      new Obstacle(0.56 * L, "log"),
      new Obstacle(0.605 * L, "debris"),
      new Obstacle(0.76 * L, "vehicle"),
      new Obstacle(0.78 * L, "barrier"),
      new Obstacle(0.80 * L, "debris"),
      new Obstacle(0.83 * L, "log"),
      new Obstacle(0.86 * L, "vehicle"),
      new Obstacle(0.89 * L, "barrier"),
    ];

    this.ramps = [
      new Ramp(0.24 * L, 240),   // rampa de práctica
      new Ramp(0.46 * L, 240),   // rampa hacia interruptor elevado
    ];

    this.door = new Door(0.322 * L);
    this.groundSwitch = new SwitchEntity(0.300 * L, {
      // Radio amplio: cubre desde bastante antes del interruptor hasta
      // pasada la puerta, para permitir reintentar sin retroceder si la
      // puerta se cierra antes de tiempo.
      width: 34, height: 44, radius: 1100, linkedDoor: this.door
    });

    this.trapTriggered = false;
    // width amplio: en marcha normal el arco de la rampa deja una ventana
    // de contacto muy angosta (llega justo antes de aterrizar); con este
    // margen sigue siendo alcanzable sin depender de un salto perfecto,
    // y con turbo la ventana es aún más cómoda.
    this.elevatedSwitch = new SwitchEntity(0.465 * L, {
      elevated: true, elevatedHeight: 130, width: 70, height: 36, radius: 60
    });

    this.hordeApproachZone = [0.34 * L, 0.42 * L];
    this.finalChaseZone = [0.75 * L, 0.92 * L];

    this.messages = [
      { x: 0.02 * L, text: "NO TE DETENGAS", duration: 2.6 },
      { x: 0.10 * L, text: "SE ACERCA LA OSCURIDAD · USÁ F", duration: 3 },
      { x: 0.29 * L, text: "PRESIONÁ E EN EL INTERRUPTOR", duration: 3 },
      { x: 0.455 * L, text: "SALTÁ EN LA RAMPA", duration: 2.6 },
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
