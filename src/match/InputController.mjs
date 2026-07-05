export class InputController {
  constructor(target = window) {
    this.target = target;
    this.keys = new Set();
    this.justPressed = new Set();
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
  }

  handleKeyDown(event) {
    if (!this.keys.has(event.key)) this.justPressed.add(event.key);
    this.keys.add(event.key);
  }

  handleKeyUp(event) {
    this.keys.delete(event.key);
  }

  axis() {
    const left = this.keys.has("a") || this.keys.has("A") || this.keys.has("ArrowLeft");
    const right = this.keys.has("d") || this.keys.has("D") || this.keys.has("ArrowRight");
    const up = this.keys.has("w") || this.keys.has("W") || this.keys.has("ArrowUp");
    const down = this.keys.has("s") || this.keys.has("S") || this.keys.has("ArrowDown");
    const x = (right ? 1 : 0) - (left ? 1 : 0);
    const y = (down ? 1 : 0) - (up ? 1 : 0);
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length, moving: x !== 0 || y !== 0 };
  }

  snapshot() {
    return {
      axis: this.axis(),
      sprint: this.keys.has("Shift"),
      pass: this.consume("j") || this.consume("J"),
      shoot: this.consume(" ") || this.consume("k") || this.consume("K"),
      tackle: this.consume("l") || this.consume("L"),
    };
  }

  consume(key) {
    if (!this.justPressed.has(key)) return false;
    this.justPressed.delete(key);
    return true;
  }

  endFrame() {
    this.justPressed.clear();
  }

  destroy() {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.keys.clear();
    this.justPressed.clear();
  }
}
