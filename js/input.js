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

    // Estado crudo del mouse (en coordenadas de cliente/ventana). La
    // conversión a espacio de canvas y la interpretación (p. ej. arrastrar
    // la barra de velocidad) quedan a cargo de quien lo consuma (Game/UI),
    // para que InputManager no necesite conocer el layout del HUD.
    this.mouseDown = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseleave", this.onMouseUp);
  }
  normalize(e) {
    // El salto vive sólo en W/Espacio: flecha arriba/abajo quedan
    // dedicadas por completo a cambiar de carril.
    if (e.code === "Space" || e.code === "KeyW") return "jump";
    if (e.code === "ArrowUp") return "laneUp";
    if (e.code === "ArrowDown") return "laneDown";
    if (e.code === "ArrowRight") return "forward";
    if (e.code === "ArrowLeft") return "backward";
    if (e.code === "KeyF") return "light";
    if (e.code === "KeyE") return "interact";
    if (e.code === "KeyD") return "shootForward";
    if (e.code === "KeyA") return "shootBack";
    if (e.code === "Escape" || e.code === "KeyP") return "pause";
    if (e.code === "KeyR") return "restart";
    // Se mantiene mapeada (implementada) aunque ya no controle la
    // velocidad: eso ahora lo hace la barra de velocidad del HUD.
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") return "turbo";
    return null;
  }
  onKeyDown(e) {
    const k = this.normalize(e);
    if (!k) return;
    // evita scroll/navegación accidental de página
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" ||
        e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
    if (!this.down[k]) this._pending.push(k);
    this.down[k] = true;
  }
  onKeyUp(e) {
    const k = this.normalize(e);
    if (!k) return;
    this.down[k] = false;
  }
  onMouseDown(e) { this.mouseDown = true; this.mouseX = e.clientX; this.mouseY = e.clientY; }
  onMouseUp() { this.mouseDown = false; }
  onMouseMove(e) { this.mouseX = e.clientX; this.mouseY = e.clientY; }
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
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseleave", this.onMouseUp);
  }
}
