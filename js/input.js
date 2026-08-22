"use strict";

/* =========================================================================
   InputManager
   ========================================================================= */
class InputManager {
  constructor() {
    this.down = Object.create(null);
    this.pressedEdge = Object.create(null);
    this._pending = [];
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }
  normalize(e) {
    if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") return "jump";
    if (e.code === "ArrowRight") return "forward";
    if (e.code === "ArrowLeft") return "backward";
    if (e.code === "KeyF") return "light";
    if (e.code === "KeyE") return "interact";
    if (e.code === "Escape" || e.code === "KeyP") return "pause";
    if (e.code === "KeyR") return "restart";
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") return "turbo";
    return null;
  }
  onKeyDown(e) {
    const k = this.normalize(e);
    if (!k) return;
    // evita scroll/navegación accidental de página
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
    if (!this.down[k]) this._pending.push(k);
    this.down[k] = true;
  }
  onKeyUp(e) {
    const k = this.normalize(e);
    if (!k) return;
    this.down[k] = false;
  }
  // Debe llamarse una vez por frame, luego de leer justPressed
  consumeEdges() {
    const edges = this._pending;
    this._pending = [];
    this.pressedEdge = Object.create(null);
    for (const k of edges) this.pressedEdge[k] = true;
  }
  isDown(k) { return !!this.down[k]; }
  justPressed(k) { return !!this.pressedEdge[k]; }
  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
