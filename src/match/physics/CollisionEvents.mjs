export class CollisionEvents {
  constructor() {
    this.events = [];
  }

  collect() {
    this.events.length = 0;
    return this.events;
  }
}
