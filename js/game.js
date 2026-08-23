"use strict";

/* =========================================================================
   Game - controlador principal / máquina de estados
   ========================================================================= */
class Game {
  constructor() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");
    this.stage = document.getElementById("stage");

    this.input = new InputManager();
    this.audio = new AudioManager();
    this.camera = new Camera();
    this.lighting = new Lighting();
    this.ui = new UI();
    this.level = new Level();
    this.player = new Player();
    this.horde = new Horde();

    this.state = STATE.MENU;
    this.elapsedTime = 0;
    this.lastTs = 0;
    this.contextHintVisible = false;
    this.gameoverReason = "";
    this.dustParticles = [];
    this.hitParticles = [];
    this.demoWorldX = 0;
    this.trapReliefTimer = 0;

    this._bindUI();
    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
    document.addEventListener("fullscreenchange", this._resize);
    this._resize();

    this._boundLoop = this._loop.bind(this);
    requestAnimationFrame(this._boundLoop);
  }

  _bindUI() {
    const $ = (id) => document.getElementById(id);
    $("btn-start").addEventListener("click", () => { this.audio.init(); this.startGame(); });
    $("btn-instructions").addEventListener("click", () => { this.audio.init(); this.setState(STATE.INSTRUCTIONS); });
    $("btn-instr-back").addEventListener("click", () => this.setState(STATE.MENU));
    $("btn-mute").addEventListener("click", (e) => {
      this.audio.init();
      const muted = !this.audio.muted;
      this.audio.setMuted(muted);
      e.target.textContent = "SONIDO: " + (muted ? "APAGADO" : "ACTIVADO");
    });
    $("btn-fullscreen").addEventListener("click", () => {
      try {
        if (!document.fullscreenElement) this.stage.requestFullscreen();
        else document.exitFullscreen();
      } catch (e) { /* pantalla completa no disponible: se ignora */ }
    });
    $("btn-resume").addEventListener("click", () => this.togglePause(false));
    $("btn-pause-restart").addEventListener("click", () => this.startGame());
    $("btn-pause-menu").addEventListener("click", () => this.setState(STATE.MENU));
    $("btn-gameover-restart").addEventListener("click", () => this.startGame());
    $("btn-gameover-menu").addEventListener("click", () => this.setState(STATE.MENU));
    $("btn-victory-restart").addEventListener("click", () => this.startGame());
    $("btn-victory-menu").addEventListener("click", () => this.setState(STATE.MENU));
  }

  _resize() {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    let w = maxW, h = w / (16 / 9);
    if (h > maxH) { h = maxH; w = h * (16 / 9); }
    w = Math.floor(w); h = Math.floor(h);
    this.canvas.width = w; this.canvas.height = h;
    this.stage.style.width = w + "px";
    this.stage.style.height = h + "px";
    this.lighting.resize(w, h);
    document.getElementById("toosmall").style.display =
      (maxW < 380 || maxH < 260) ? "flex" : "none";
  }

  setState(s) {
    this.state = s;
    ["menu", "instructions", "pause", "gameover", "victory"].forEach(name => {
      document.getElementById("screen-" + name).classList.add("hidden");
    });
    const map = {
      MENU: "screen-menu", INSTRUCTIONS: "screen-instructions",
      PAUSED: "screen-pause", GAMEOVER: "screen-gameover", VICTORY: "screen-victory"
    };
    if (map[s]) document.getElementById(map[s]).classList.remove("hidden");
  }

  startGame() {
    this.player.reset();
    this.horde.reset();
    this.level.reset();
    this.camera.x = 0;
    this.camera.shakeTrauma = 0;
    this.elapsedTime = 0;
    this.dustParticles = [];
    this.hitParticles = [];
    this.ui.toasts = [];
    this.trapReliefTimer = 0;
    this.contextHintVisible = false;
    this.setState(STATE.PLAYING);
  }

  togglePause(forceVal) {
    if (this.state !== STATE.PLAYING && this.state !== STATE.PAUSED) return;
    const toPause = forceVal !== undefined ? forceVal : (this.state === STATE.PLAYING);
    this.setState(toPause ? STATE.PAUSED : STATE.PLAYING);
  }

  triggerGameOver(reason) {
    this.gameoverReason = reason;
    document.getElementById("gameover-reason").textContent = reason;
    this.setState(STATE.GAMEOVER);
  }

  triggerVictory(kind) {
    const title = document.getElementById("victory-title");
    if (title) {
      title.textContent = kind === "time" ? "ESCAPASTE DE LA HORDA" : "PROTOTIPO COMPLETADO";
    }
    const stats = document.getElementById("victory-stats");
    const mm = Math.floor(this.elapsedTime / 60), ss = Math.floor(this.elapsedTime % 60);
    stats.innerHTML =
      `TIEMPO: <b>${mm}:${ss.toString().padStart(2, "0")}</b><br>` +
      `COMBUSTIBLE RESTANTE: <b>${Math.round(this.player.fuel)}%</b><br>` +
      `BATERÍA RESTANTE: <b>${Math.round(this.player.battery)}%</b>`;
    this.setState(STATE.VICTORY);
  }

  /* ------------------------- LOOP PRINCIPAL ------------------------- */
  _loop(ts) {
    const dt = Math.min(0.05, (ts - (this.lastTs || ts)) / 1000);
    this.lastTs = ts;

    // Se procesa siempre (pausa/reinicio deben funcionar en cualquier estado
    // relevante, incluida la pantalla de Game Over).
    this._handleGlobalInput();

    if (this.state === STATE.PLAYING) this._updatePlaying(dt);
    else if (this.state === STATE.MENU || this.state === STATE.INSTRUCTIONS) this._updateDemo(dt);

    this.input.consumeEdges();
    this._render();
    this._raf = requestAnimationFrame(this._boundLoop);
  }

  /* ------------------------- INPUT GLOBAL ------------------------- */
  _handleGlobalInput() {
    if (this.input.justPressed("pause") && (this.state === STATE.PLAYING || this.state === STATE.PAUSED)) {
      this.togglePause();
    }
    if (this.input.justPressed("restart") && this.state === STATE.GAMEOVER) {
      this.startGame();
    }
  }

  /* ------------------------- DEMO (fondo animado del menú) ------------------------- */
  _updateDemo(dt) {
    this.demoWorldX += dt * 90;
    this.camera.x = this.demoWorldX;
    this.camera.playerScreenX = 0.30;
    this.camera.shakeTrauma = 0; this.camera.shakeX = 0; this.camera.shakeY = 0;
    this.player.scooter.update(dt, 1);
    this.player.easeLane(dt);
    this.player.worldX = this.demoWorldX;
    this._updateDust(dt, 1);
  }

  /* ------------------------- GAMEPLAY ------------------------- */
  _updatePlaying(dt) {
    if (this.input.justPressed("pause")) return;

    this.elapsedTime += dt;
    const p = this.player, lvl = this.level, sc = p.scooter;

    // --- dirección (flechas) + carril + marcha (normal/turbo) + combustible / stall ---
    const fwdHeld = this.input.isDown("forward"), backHeld = this.input.isDown("backward");
    p.moveDirection = fwdHeld === backHeld ? 0 : (fwdHeld ? 1 : -1); // se cancelan si se presionan ambas

    // Cambio de carril (flecha arriba/abajo): independiente del avance y
    // del salto. El carril lógico cambia al instante (colisión justa); la
    // posición visual se desliza detrás vía easeLane.
    if (this.input.justPressed("laneUp")) p.changeLane(-1);
    if (this.input.justPressed("laneDown")) p.changeLane(1);
    p.easeLane(dt);

    // El turbo requiere combustible disponible y sólo tiene sentido avanzando.
    const wasStalled = p.stalled;
    p.turboHeld = this.input.isDown("turbo") && p.fuel > 0 && p.moveDirection > 0;
    const isMoving = p.moveDirection !== 0;
    const fuelDrain = isMoving ? CONFIG.fuelConsumptionRate * (p.turboHeld ? CONFIG.turboFuelMultiplier : 1) : 0;
    p.fuel = Math.max(0, p.fuel - fuelDrain * dt);
    p.stalled = p.fuel <= 0;
    if (p.stalled) p.turboHeld = false;
    if (!wasStalled && p.stalled) {
      // Falla puntual y acotada (no una espiral): un golpe fijo a la
      // distancia, no una velocidad de horda descontrolada.
      this.horde.approach(CONFIG.hordeStallPenalty);
      this.camera.addShake(0.4);
      this.audio.playBatteryAlert();
      this.ui.pushToast("SIN COMBUSTIBLE · LA HORDA GANA TERRENO", 2.2);
    } else if (p.fuel > 0 && p.fuel < CONFIG.lowFuelThreshold) {
      this.ui.pushToast("COMBUSTIBLE BAJO", 1.4);
    }

    // --- movimiento (avanzar/retroceder según flechas) ---
    // La puerta cerrada sólo bloquea el avance hacia ella, nunca retroceder.
    const doorBlocking = lvl.door.isBlocking() &&
      Math.abs(p.worldX - lvl.door.worldX) < 18 && p.worldX < lvl.door.worldX;
    const rawSpeed = p.getSpeed();
    const advanceSpeed = (doorBlocking && rawSpeed > 0) ? 0 : rawSpeed;
    p.worldX = Math.max(0, p.worldX + advanceSpeed * dt);

    // --- faro / batería ---
    if (p.headlightOn) {
      p.battery = Math.max(0, p.battery - CONFIG.batteryDrainRate * dt);
      if (p.battery <= 0) p.headlightOn = false;
    }

    // --- salto / rampas (atadas al carril: sólo la rampa de tu carril activa) ---
    if (this.input.justPressed("jump")) {
      const nearRamp = lvl.ramps.find(r =>
        !r.used && r.lane === p.lane && p.worldX >= r.worldX - 40 && p.worldX <= r.worldX + r.width);
      if (nearRamp) { sc.jump(true); nearRamp.used = true; }
      else sc.wheelie(); // fuera de una rampa, solo gesto cosmético (no esquiva obstáculos)
    }
    const landed = sc.update(dt, p.speedRatio);
    if (landed === "landed") {
      this.camera.addShake(0.35);
      this.audio.playLanding();
    }

    // auto-lanzamiento suave al entrar en rampa de tu carril (si no se saltó a mano)
    for (const r of lvl.ramps) {
      if (!r.used && r.lane === p.lane && sc.grounded &&
        p.worldX >= r.worldX && p.worldX <= r.worldX + r.width * 0.4) {
        sc.jump(false); r.used = true;
      }
    }

    // --- faro toggle ---
    if (this.input.justPressed("light")) { p.toggleHeadlight(); }

    // --- interacción E (interruptor de puerta, cualquier carril, reintentable si falla) ---
    this.contextHintVisible = false;
    const sw = lvl.groundSwitch;
    {
      const d = Math.abs(p.worldX - sw.worldX);
      if (d < sw.radius && lvl.door.state === "CLOSED") {
        this.contextHintVisible = true;
        if (this.input.justPressed("interact")) {
          lvl.door.trigger();
          this.audio.playSwitch();
          if (!sw.activated) {
            sw.activated = true;
            this.horde.relieve(CONFIG.hordeSuccessRelief);
            this.ui.pushToast("MECANISMO ACTIVADO");
          } else {
            this.ui.pushToast("REINTENTANDO...");
          }
        }
      }
    }

    // --- interruptor elevado (carril fijo; se activa al tocarlo en el aire) ---
    const esw = lvl.elevatedSwitch;
    if (!esw.activated) {
      const dx = Math.abs(p.worldX - esw.worldX);
      const airHeight = -sc.jumpOffset;
      if (esw.lane === p.lane && dx < esw.width &&
        airHeight > esw.elevatedHeight - 60 && airHeight < esw.elevatedHeight + 90 && !sc.grounded) {
        esw.activated = true;
        lvl.trapTriggered = true;
        this.audio.playSwitch();
        this.horde.relieve(CONFIG.hordeTrapRelief);
        this.ui.pushToast("TRAMPA ACTIVADA · LA HORDA SE RETRASA");
        this.trapReliefTimer = 6; // segundos: se cuenta en el loop, no con setTimeout,
                                  // para que respete pausa y reinicio
      }
    }
    if (this.trapReliefTimer > 0) this.trapReliefTimer -= dt;

    // --- puerta ---
    lvl.door.update(dt);
    // Si el jugador está frenado justo contra la puerta cerrada, aplica
    // penalización continua (empuja a la horda) hasta que se abra.
    if (doorBlocking && lvl.door.state !== "OPENING") {
      if (lvl.door.failedFlashTimer <= 0) {
        lvl.door.failedFlashTimer = 0.6;
        this.horde.approach(CONFIG.hordeDoorFailPenalty * 0.5);
        this.camera.addShake(0.25);
      }
    }
    // paso exitoso por la puerta
    if (!lvl._passed && p.worldX > lvl.door.worldX + 20) {
      lvl._passed = true;
      if (sw.activated) { this.horde.relieve(CONFIG.hordeDoorPassRelief); this.ui.pushToast("PUERTA SUPERADA"); }
    }

    // --- obstáculos (colisión suave AABB, sólo si comparten carril) ---
    for (const o of lvl.obstacles) {
      if (o.resolved) continue;
      const dx = Math.abs(p.worldX - o.worldX);
      if (dx < (o.width / 2 + 26)) {
        if (o.lane !== p.lane) { o.resolved = true; continue; } // otro carril: ni pasa cerca
        const airborne = -sc.jumpOffset > CONFIG.jumpClearHeight;
        if (!airborne) {
          o.resolved = true;
          const hit = p.applyHit();
          if (hit) {
            this.camera.addShake(0.55);
            this.audio.playDamage();
            this.horde.approach(CONFIG.hordeHitPenalty);
            this._spawnHitParticles();
            this.ui.pushToast("¡IMPACTO!");
          }
        } else {
          o.resolved = true; // esquivado por altura (rampa)
        }
      }
    }

    // --- coleccionables ---
    // A diferencia de los obstáculos, no están atados al carril: son
    // recursos, no el desafío del carril. Si dependieran del carril
    // exacto, esquivar un obstáculo cercano podría hacer perder un
    // bidón sin que el jugador lo note, socavando el balance de
    // combustible del nivel. Se recogen por pasar cerca en X, sin
    // importar en qué carril se está.
    const tryCollect = (list, apply, label) => {
      for (const c of list) {
        if (c.collected) continue;
        if (Math.abs(p.worldX - c.worldX) < 30) {
          c.collected = true;
          apply();
          this.audio.playPickup();
          this.horde.relieve(CONFIG.hordePickupRelief);
          this.ui.pushToast(label);
        }
      }
    };
    tryCollect(lvl.fuelPickups, () => { p.fuel = Math.min(CONFIG.fuelMax, p.fuel + CONFIG.fuelPickupAmount); }, "+ COMBUSTIBLE");
    tryCollect(lvl.batteryPickups, () => { p.battery = Math.min(CONFIG.batteryMax, p.battery + CONFIG.batteryPickupAmount); }, "+ BATERÍA");

    // --- horda: velocidad relativa + presión guionada ---
    const inApproachZone = p.worldX >= lvl.hordeApproachZone[0] && p.worldX <= lvl.hordeApproachZone[1];
    const inFinalChase = p.worldX >= lvl.finalChaseZone[0] && p.worldX <= lvl.finalChaseZone[1];
    // Nunca se suman: cada estado define su propia presión acotada y la más
    // relevante gana, para que combinaciones de eventos (p. ej. quedarse sin
    // combustible durante la persecución final) no disparen una velocidad
    // de horda desmedida. Quedarse sin combustible es su propia crisis,
    // siempre igual de predecible, así que reemplaza al bono de zona en vez
    // de competir con él.
    let targetSpeedBonus = 0;
    if (inApproachZone) targetSpeedBonus = CONFIG.hordeApproachZoneBonus;
    if (inFinalChase) targetSpeedBonus = CONFIG.hordeFinalChaseZoneBonus;
    if (p.stalled) targetSpeedBonus = CONFIG.hordeStallSpeedBonus;
    if (this.trapReliefTimer > 0) targetSpeedBonus = CONFIG.hordeTrapSlowBonus;
    this.horde.speedBonus = Util.lerp(this.horde.speedBonus, targetSpeedBonus, dt * 1.5);

    const progress01 = Util.clamp(p.worldX / lvl.length, 0, 1);
    this.horde.update(dt, advanceSpeed, progress01);

    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    // --- mensajes contextuales del nivel ---
    for (const m of lvl.messages) {
      if (!lvl._shownMessages.has(m) && p.worldX >= m.x) {
        lvl._shownMessages.add(m);
        this.ui.pushToast(m.text, m.duration);
      }
    }
    if (p.battery > 0 && p.battery < CONFIG.lowBatteryThreshold && p.headlightOn) {
      this.ui.pushToast("BATERÍA BAJA", 1.4);
    }
    if (this.horde.proximity01() > 0.78) {
      this.ui.pushToast("HORDA CERCA", 1.2);
    }

    // --- cámara / audio ---
    this.camera.update(dt, p.worldX, this.horde.proximity01());
    this.audio.updateEngine(p.speedRatio, p.invulnTimer > 0);
    this.audio.updateHorde(this.horde.proximity01());

    this._updateDust(dt, p.speedRatio);
    this._updateHitParticles(dt);
    this.ui.update(dt);

    // --- condiciones de fin ---
    if (this.horde.reachedPlayer) {
      this.audio.playDamage();
      this.triggerGameOver("LA HORDA TE ALCANZÓ");
      return;
    }
    if (p.worldX >= lvl.finishX && !p.finished) {
      p.finished = true;
      this.triggerVictory("finish");
    } else if (!p.finished && this.elapsedTime >= CONFIG.survivalVictoryTime) {
      // Victoria alternativa: sobrevivir el tiempo suficiente cuenta como
      // "escapar", sin necesidad de llegar al portón físico del final.
      p.finished = true;
      this.triggerVictory("time");
    }
  }

  _spawnHitParticles() {
    const h = this.canvas.height, scale = h / 540;
    const y = this._laneY(h, this.player.laneFloat) - 8 * scale;
    for (let i = 0; i < 14; i++) {
      this.hitParticles.push({
        x: this.camera.playerScreenX * this.canvas.width,
        y,
        vx: Util.rand(-90, 140), vy: Util.rand(-160, -20),
        life: Util.rand(0.3, 0.7), maxLife: 0.7
      });
    }
  }
  _updateHitParticles(dt) {
    for (const pt of this.hitParticles) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 420 * dt; pt.life -= dt;
    }
    this.hitParticles = this.hitParticles.filter(pt => pt.life > 0);
  }
  _updateDust(dt, speedRatio) {
    const intensity = Math.abs(speedRatio);
    if (Math.random() < 0.6 * intensity) {
      const h = this.canvas.height, scale = h / 540;
      this.dustParticles.push({
        x: this.camera.playerScreenX * this.canvas.width - 30,
        y: this._laneY(h, this.player.laneFloat) + 8 * scale,
        vx: Util.rand(-60, -20) * intensity - 20, vy: Util.rand(-14, 4),
        life: Util.rand(0.4, 0.9), maxLife: 0.9, size: Util.rand(2, 5)
      });
    }
    for (const d of this.dustParticles) { d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; }
    this.dustParticles = this.dustParticles.filter(d => d.life > 0);
  }

  /* ======================= CARRILES ======================= */
  // Y en pantalla del carril `laneValue` (puede ser fraccional, para la
  // posición visual en transición). 0 = carril superior.
  _laneY(h, laneValue) {
    const scale = h / 540;
    const spacing = CONFIG.laneSpacing * scale;
    const mid = (CONFIG.laneCount - 1) / 2;
    return h * 0.70 + (laneValue - mid) * spacing;
  }
  _trackTopY(h) { return this._laneY(h, 0) - 70 * (h / 540); }

  /* ======================= RENDER ======================= */
  _render() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const scale = h / 540;
    ctx.save();
    ctx.translate(this.camera.shakeX, this.camera.shakeY);

    this._renderSky(ctx, w, h);
    this._renderParallaxLayer(ctx, w, h, LAYERS.far, 0.25, "#11141a", this._trackTopY(h) - 40 * scale);
    this._renderParallaxLayer(ctx, w, h, LAYERS.mid, 0.5, "#1a1d22", this._trackTopY(h) + 10 * scale);
    this._renderRoad(ctx, w, h);
    this._renderLevelEntities(ctx, w, h);
    // La capa cercana (árboles/postes de borde de ruta) va detrás de la
    // horda: la horda es la amenaza en primer plano y no debe camuflarse
    // contra el follaje al acercarse.
    this._renderParallaxLayer(ctx, w, h, LAYERS.near, 0.85, "#05070a", this._laneY(h, CONFIG.laneCount - 1) + 60 * scale);
    this._renderHorde(ctx, w, h);
    this._renderScooter(ctx, w, h);
    this._renderDust(ctx);
    this._renderHitParticles(ctx);

    ctx.restore();

    // Iluminación (no depende del shake para que la máscara quede estable)
    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) {
      const p = this.player;
      const headX = this.camera.playerScreenX * w + 34 + this.camera.shakeX;
      const headY = this._laneY(h, p.laneFloat) - 68 * scale + p.scooter.jumpOffset * 0.5 + this.camera.shakeY;
      const darkness = this.lighting.darknessAtProgress(p.worldX);
      const unstable = this.lighting.isUnstableZone(p.worldX);
      this.lighting.render(ctx, w, h, {
        headlightOn: p.headlightOn, headlightX: headX, headlightY: headY,
        batteryLow: p.battery < CONFIG.lowBatteryThreshold, batteryOn: p.battery > 0,
        darkness, unstable, angleFacing: 0
      });
    } else {
      this.lighting.render(ctx, w, h, {
        headlightOn: false, headlightX: 0, headlightY: 0,
        batteryLow: false, batteryOn: false, darkness: 0.28, unstable: false, angleFacing: 0
      });
    }
    this.lighting.renderVignette(ctx, w, h, this.state === STATE.PLAYING ? this.horde.proximity01() : 0);

    if (this.state === STATE.PLAYING) this.ui.render(ctx, w, h, this);
  }

  _renderSky(ctx, w, h) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0a0d14");
    grad.addColorStop(0.55, "#12141a");
    grad.addColorStop(1, "#191a1d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // niebla baja
    const fog = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.8);
    fog.addColorStop(0, "rgba(120,130,140,0)");
    fog.addColorStop(1, "rgba(120,130,140,0.18)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, h * 0.5, w, h * 0.35);
  }

  _renderParallaxLayer(ctx, w, h, layer, speedFactor, color, baseline) {
    const camX = this.camera.x * speedFactor;
    const tw = layer.tileWidth;
    const startTile = Math.floor(camX / tw) - 1;
    ctx.fillStyle = color;
    for (let t = startTile; t <= startTile + 2; t++) {
      const tileOffset = t * tw - camX + this.camera.playerScreenX * w;
      for (const s of layer.shapes) {
        const sx = tileOffset + s.x;
        if (sx < -150 || sx > w + 150) continue;
        if (s.kind === "ruin") {
          ctx.fillRect(sx, baseline - s.h, s.w, s.h);
        } else if (s.kind === "building") {
          ctx.fillRect(sx, baseline - s.h, s.w, s.h);
          ctx.fillStyle = "rgba(226,162,68,0.10)";
          for (let wy = baseline - s.h + 8; wy < baseline - 6; wy += 14) {
            if (Math.random() < 0.002) continue;
            ctx.fillRect(sx + 4, wy, 4, 6);
          }
          ctx.fillStyle = color;
        } else if (s.kind === "pole") {
          ctx.fillRect(sx, baseline - s.h, 4, s.h);
          ctx.fillRect(sx - 14, baseline - s.h, 32, 3);
        } else if (s.kind === "tree") {
          ctx.fillRect(sx, baseline - s.h * 0.5, 5, s.h * 0.5);
          ctx.beginPath(); ctx.arc(sx + 2, baseline - s.h * 0.55, s.h * 0.28, 0, Math.PI * 2); ctx.fill();
        } else if (s.kind === "fence") {
          ctx.fillRect(sx, baseline - 34, 3, 34);
          ctx.fillRect(sx, baseline - 26, 3, 3);
        } else if (s.kind === "post") {
          ctx.fillRect(sx, baseline - s.h, 3, s.h);
        } else if (s.kind === "moon-cloud") {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.arc(sx, s.y + 40, s.r * 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  _renderRoad(ctx, w, h) {
    const topY = this._trackTopY(h);
    ctx.fillStyle = "#14161a";
    ctx.fillRect(0, topY, w, h - topY);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, topY, w, 6);
    // separadores entre carriles (una línea punteada por cada borde entre dos carriles)
    ctx.strokeStyle = "rgba(180,170,150,0.22)";
    ctx.lineWidth = 2;
    ctx.setLineDash([24, 22]);
    const off = -(this.camera.x % 46);
    for (let i = 0; i < CONFIG.laneCount - 1; i++) {
      const y = (this._laneY(h, i) + this._laneY(h, i + 1)) / 2;
      ctx.beginPath();
      ctx.moveTo(off, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  _worldToScreen(worldX, w) { return worldX - this.camera.x + this.camera.playerScreenX * w; }

  _renderLevelEntities(ctx, w, h) {
    if (this.state !== STATE.PLAYING && this.state !== STATE.PAUSED) return;
    const lvl = this.level;
    const scale = h / 540;

    // Ramps
    for (const r of lvl.ramps) {
      const sx = this._worldToScreen(r.worldX, w);
      if (sx < -260 || sx > w + 60) continue;
      const gy = this._laneY(h, r.lane);
      ctx.fillStyle = "#2a2620";
      ctx.beginPath();
      ctx.moveTo(sx, gy);
      ctx.lineTo(sx + r.width, gy - 46 * scale);
      ctx.lineTo(sx + r.width, gy);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(226,162,68,0.3)"; ctx.stroke();
    }

    // Obstacles
    for (const o of lvl.obstacles) {
      const sx = this._worldToScreen(o.worldX, w);
      if (sx < -150 || sx > w + 150) continue;
      this._drawObstacle(ctx, o, sx, this._laneY(h, o.lane), scale);
    }

    // Ground switch
    this._drawSwitch(ctx, lvl.groundSwitch, h, w, scale, false);
    // Elevated switch
    this._drawSwitch(ctx, lvl.elevatedSwitch, h, w, scale, true);

    // Door (ancho completo, abarca los tres carriles)
    this._drawDoor(ctx, lvl.door, h, w, scale);

    // Collectibles
    [...lvl.fuelPickups, ...lvl.batteryPickups].forEach(c =>
      this._drawCollectible(ctx, c, this._laneY(h, c.lane), w, scale));
  }

  _drawObstacle(ctx, o, sx, groundY, scale) {
    ctx.fillStyle = o.resolved ? "#2c2c2c" : "#1b1c1e";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    const gy = groundY;
    switch (o.type) {
      case "vehicle":
        ctx.fillRect(sx - o.width / 2, gy - o.height, o.width, o.height);
        ctx.beginPath(); ctx.arc(sx - o.width / 3, gy, 10 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + o.width / 3, gy, 10 * scale, 0, Math.PI * 2); ctx.fill();
        break;
      case "pit":
        ctx.fillStyle = "#000";
        ctx.fillRect(sx - o.width / 2, gy - 4, o.width, 16);
        break;
      case "barrier":
        ctx.fillRect(sx - o.width / 2, gy - o.height, o.width, 10);
        ctx.fillRect(sx - o.width / 2, gy - o.height, 6, o.height);
        ctx.fillRect(sx + o.width / 2 - 6, gy - o.height, 6, o.height);
        break;
      case "debris":
        ctx.beginPath();
        ctx.moveTo(sx - o.width / 2, gy);
        ctx.lineTo(sx - 10, gy - o.height);
        ctx.lineTo(sx + 8, gy - o.height * 0.7);
        ctx.lineTo(sx + o.width / 2, gy);
        ctx.closePath(); ctx.fill();
        break;
      case "log":
        ctx.fillRect(sx - o.width / 2, gy - o.height, o.width, o.height * 0.6);
        break;
      case "slope":
        ctx.beginPath();
        ctx.moveTo(sx - o.width / 2, gy);
        ctx.lineTo(sx + o.width / 2, gy - o.height);
        ctx.lineTo(sx + o.width / 2, gy);
        ctx.closePath(); ctx.fill();
        break;
    }
  }

  _drawSwitch(ctx, sw, h, w, scale, elevated) {
    const sx = this._worldToScreen(sw.worldX, w);
    if (sx < -100 || sx > w + 100) return;
    // Sin carril propio (interruptor de piso): se dibuja en el carril
    // central, ya que se puede activar desde cualquiera.
    const laneVal = sw.lane === null ? (CONFIG.laneCount - 1) / 2 : sw.lane;
    const baseY = this._laneY(h, laneVal);
    const y = elevated ? baseY - sw.elevatedHeight * scale : baseY;
    if (elevated) {
      ctx.strokeStyle = "#232323"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(sx, baseY); ctx.lineTo(sx, y); ctx.stroke();
    }
    ctx.fillStyle = sw.activated ? "#5c8a4a" : "#b23a2f";
    ctx.beginPath(); ctx.arc(sx, y - 10, 10 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.stroke();
    ctx.fillStyle = "#111"; ctx.fillRect(sx - 8, y - 4, 16, 14);
  }

  _drawDoor(ctx, door, h, w, scale) {
    const sx = this._worldToScreen(door.worldX, w);
    if (sx < -80 || sx > w + 80) return;
    const topY = this._laneY(h, 0) - 34 * scale;
    const bottomY = this._laneY(h, CONFIG.laneCount - 1) + 20 * scale;
    const fullH = bottomY - topY;
    const remainH = fullH * (1 - door.openness);
    ctx.fillStyle = "#26221c";
    ctx.fillRect(sx - 5, topY, 10, fullH); // marco fijo, abarca los tres carriles
    ctx.fillStyle = "#3a3428";
    ctx.fillRect(sx - 13, bottomY - remainH, 26, remainH); // el panel se hunde al abrir
    // luz de estado
    let color = "#b23a2f";
    if (door.state === "OPENING") color = "#e2b544";
    else if (door.state === "OPEN") {
      color = door.openTimer < CONFIG.doorCloseWarn && Math.floor(this.elapsedTime * 8) % 2 === 0 ? "#e2b544" : "#5c8a4a";
    } else if (door.state === "CLOSING") color = "#e2b544";
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(sx, topY - 14, 6 * scale, 0, Math.PI * 2); ctx.fill();
    if (door.failedFlashTimer > 0) {
      ctx.fillStyle = `rgba(178,58,47,${door.failedFlashTimer})`;
      ctx.fillRect(sx - 30, topY - 10, 60, fullH + 10);
    }
  }

  _drawCollectible(ctx, c, groundY, w, scale) {
    if (c.collected) return;
    const sx = this._worldToScreen(c.worldX, w);
    if (sx < -60 || sx > w + 60) return;
    c.phase += 0.05;
    const bob = Math.sin(c.phase) * 4;
    const y = groundY - 26 * scale + bob;
    ctx.save();
    ctx.translate(sx, y);
    if (c.type === "fuel") {
      ctx.fillStyle = "#e2a244";
      ctx.fillRect(-9, -12, 18, 22);
      ctx.fillRect(-4, -18, 8, 6);
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.strokeRect(-9, -12, 18, 22);
    } else {
      ctx.fillStyle = "#6f8fb2";
      ctx.fillRect(-10, -8, 20, 16);
      ctx.fillStyle = "#c8dbe8";
      ctx.fillRect(-6, -12, 12, 5);
    }
    ctx.restore();
  }

  _renderHorde(ctx, w, h) {
    const scale = h / 540;
    // La horda ocupa la banda completa de carriles (amenaza a lo ancho de
    // toda la pista, no sólo al carril del jugador).
    const topY = this._laneY(h, 0) - 24 * scale;
    const bottomY = this._laneY(h, CONFIG.laneCount - 1) + 30 * scale;
    const prox = this.state === STATE.PLAYING || this.state === STATE.PAUSED ? this.horde.proximity01() : 0.35;
    // El rango horizontal y la opacidad están atados fuerte a la proximidad
    // (que a su vez depende pura y directamente de horde.distance): cuando
    // el jugador acelera y gana distancia, la horda debe replegarse
    // claramente fuera de cámara, no quedar "pegada" cerca del jugador.
    // No importa si sale del cuadro: lo único que decide el contacto es
    // horde.distance (ver Horde.update / hordeCatchDistance).
    const farOffset = -w * 0.62;   // bien fuera de pantalla cuando la distancia es máxima
    const nearOffset = -40;        // junto a la rueda trasera cuando está por alcanzar
    const baseX = this.camera.playerScreenX * w + Util.lerp(farOffset, nearOffset, prox);
    const spread = Util.lerp(50, 300, prox);
    const visibility = Util.clamp(prox * 1.35, 0.04, 1); // casi invisible cuando está lejos
    ctx.save();
    for (const s of this.horde.silhouettes) {
      const px = baseX - (s.ox % spread);
      if (px < -100 || px > w * 0.6) continue;
      const bob = Math.sin(performance.now() * 0.003 * s.speed + s.phase) * 3;
      const scaleS = s.scale * (0.7 + prox * 0.6);
      const py = Util.lerp(topY, bottomY, s.oy / 30) + bob;
      // Tono ligeramente cálido/rojizo (vs. el negro-azulado del entorno)
      // para que la horda se lea como amenaza y no se camufle contra el paisaje.
      ctx.fillStyle = `rgba(${18 + prox * 22},${6 + prox * 4},${6 + prox * 4},${(0.6 + prox * 0.4) * visibility})`;
      ctx.beginPath(); ctx.arc(px, py - 26 * scaleS, 7 * scaleS, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(px - 6 * scaleS, py - 20 * scaleS, 12 * scaleS, 22 * scaleS);
      const armSwing = Math.sin(performance.now() * 0.006 * s.speed + s.armPhase) * 10 * scaleS;
      ctx.fillRect(px - 6 * scaleS - 8, py - 16 * scaleS + armSwing, 8, 3 * scaleS);
      ctx.fillRect(px + 6 * scaleS, py - 16 * scaleS - armSwing, 8, 3 * scaleS);
    }
    ctx.restore();

    if (prox > 0.75 && (this.state === STATE.PLAYING)) {
      ctx.save();
      ctx.fillStyle = `rgba(10,10,10,${(prox - 0.75) * 4})`;
      const handX = this.camera.playerScreenX * w - 42;
      const handY = this._laneY(h, this.player.laneFloat) - 8 * scale;
      ctx.beginPath(); ctx.ellipse(handX, handY, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _renderScooter(ctx, w, h) {
    const scale = h / 540;
    const p = this.player, sc = p.scooter;
    const sx = this.camera.playerScreenX * w;
    const groundY = this._laneY(h, p.laneFloat);
    const jumpY = sc.jumpOffset;
    const susp = sc.suspension * 0.4;
    const flicker = p.invulnTimer > 0 && Math.floor(this.elapsedTime * 20) % 2 === 0;

    ctx.save();
    ctx.translate(sx, groundY + jumpY + susp);
    if (flicker) ctx.globalAlpha = 0.4;

    // sombra
    ctx.save();
    ctx.globalAlpha *= Util.clamp(1 - (-jumpY) / 200, 0.15, 1);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(0, -jumpY + 4, 46, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const vib = (this.state === STATE.PLAYING || this.state === STATE.MENU || this.state === STATE.INSTRUCTIONS)
      ? Math.sin(sc.engineVibPhase) * 0.6 : 0;
    ctx.translate(0, vib);

    // pivote de "wheelie": rueda trasera fija, el resto se inclina levemente
    ctx.translate(-34 * scale, 0);
    ctx.rotate(-sc.tiltAngle);
    ctx.translate(34 * scale, 0);

    // ruedas
    ctx.fillStyle = "#0c0c0c";
    ctx.strokeStyle = "#050505"; ctx.lineWidth = 2;
    const wheelR = 15 * scale;
    this._drawWheel(ctx, -34 * scale, -wheelR, wheelR, sc.wheelRot);
    this._drawWheel(ctx, 30 * scale, -wheelR, wheelR, sc.wheelRot);

    // cuerpo (trapezoidal) + suspensión
    ctx.fillStyle = "#17181a";
    ctx.beginPath();
    ctx.moveTo(-40 * scale, -wheelR * 1.9);
    ctx.lineTo(36 * scale, -wheelR * 2.1);
    ctx.lineTo(30 * scale, -wheelR * 1.1);
    ctx.lineTo(-34 * scale, -wheelR * 1.1);
    ctx.closePath(); ctx.fill();

    // manubrio + faro
    ctx.fillStyle = "#17181a";
    ctx.fillRect(28 * scale, -wheelR * 3.2, 5, wheelR * 1.4);
    ctx.fillStyle = p.headlightOn ? "#ffdca0" : "#3a3126";
    ctx.beginPath(); ctx.arc(34 * scale, -wheelR * 3.0, 7 * scale, 0, Math.PI * 2); ctx.fill();
    if (p.headlightOn) {
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = "#ffdca0";
      ctx.beginPath(); ctx.arc(34 * scale, -wheelR * 3.0, 12 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // conductor (silueta)
    ctx.fillStyle = "#08090a";
    ctx.beginPath(); ctx.arc(2 * scale, -wheelR * 4.1, 8 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8 * scale, -wheelR * 3.3);
    ctx.lineTo(14 * scale, -wheelR * 3.5);
    ctx.lineTo(10 * scale, -wheelR * 1.6);
    ctx.lineTo(-10 * scale, -wheelR * 1.6);
    ctx.closePath(); ctx.fill();

    ctx.restore();
  }
  _drawWheel(ctx, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#333";
    ctx.rotate(rot);
    for (let i = 0; i < 5; i++) {
      ctx.rotate(Math.PI * 2 / 5);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.85); ctx.stroke();
    }
    ctx.restore();
  }

  _renderDust(ctx) {
    for (const d of this.dustParticles) {
      ctx.fillStyle = `rgba(160,150,130,${Util.clamp(d.life / d.maxLife, 0, 1) * 0.4})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2); ctx.fill();
    }
  }
  _renderHitParticles(ctx) {
    for (const pt of this.hitParticles) {
      ctx.fillStyle = `rgba(226,140,60,${Util.clamp(pt.life / pt.maxLife, 0, 1)})`;
      ctx.fillRect(pt.x, pt.y, 3, 3);
    }
  }
}
