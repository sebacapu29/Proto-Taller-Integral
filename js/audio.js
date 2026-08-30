"use strict";

/* =========================================================================
   AudioManager - audio procedural con Web Audio API
   ========================================================================= */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ready = false;
    this.engineNodes = null;
    this.hordeNodes = null;
  }
  init() {
    if (this.ready) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : CONFIG.masterVolume;
      this.master.connect(this.ctx.destination);
      this.ready = true;
      this._startEngine();
      this._startHordeMurmur();
    } catch (e) {
      this.ready = false;
    }
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : CONFIG.masterVolume, this.ctx.currentTime, 0.05);
  }
  _startEngine() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 340;
    osc.frequency.value = 60;
    osc.connect(filter); filter.connect(gain); gain.connect(this.master);
    osc.start();
    this.engineNodes = { osc, gain, filter, baseFreq: 60 };
  }
  updateEngine(intensity, damaged) {
    if (!this.ready || !this.engineNodes) return;
    const { osc, filter } = this.engineNodes;
    const t = this.ctx.currentTime;
    const target = 55 + intensity * 22 + (damaged ? Util.rand(-8, 8) : 0);
    osc.frequency.setTargetAtTime(target, t, 0.08);
    filter.frequency.setTargetAtTime(damaged ? 180 : 340, t, 0.1);
  }
  _startHordeMurmur() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 42;
    const lfo = ctx.createOscillator();
    lfo.type = "sine"; lfo.frequency.value = 0.35;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 8;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain); gain.connect(this.master);
    osc.start(); lfo.start();
    this.hordeNodes = { osc, gain };
  }
  updateHorde(proximity01) {
    if (!this.ready || !this.hordeNodes) return;
    const t = this.ctx.currentTime;
    this.hordeNodes.gain.gain.setTargetAtTime(Util.clamp(proximity01, 0, 1) * 0.09, t, 0.3);
  }
  _blip(freq, dur, type, vol, freqEnd) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type || "square";
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1,freqEnd), t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  _noise(dur, vol) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.15;
    src.connect(gain); gain.connect(this.master);
    src.start();
  }
  playSwitch() { this._blip(520, 0.12, "square", 0.14, 720); }
  playDoor() { this._blip(90, 0.5, "sawtooth", 0.15, 60); this._noise(0.3, 0.08); }
  playPickup() { this._blip(600, 0.15, "sine", 0.16, 950); }
  playBatteryAlert() { this._blip(220, 0.18, "square", 0.12, 180); }
  playDamage() { this._noise(0.25, 0.28); this._blip(90, 0.2, "sawtooth", 0.2, 40); }
  playLanding() { this._noise(0.15, 0.22); this._blip(70, 0.15, "sine", 0.18, 40); }
  // Disparo hacia atrás: un poco más grave/percusivo (impacta y frena a la
  // horda). Hacia adelante: más agudo/seco (sin efecto todavía).
  playShot(back) {
    if (back) this._blip(180, 0.09, "square", 0.13, 90);
    else this._blip(340, 0.06, "square", 0.1, 500);
  }
}
