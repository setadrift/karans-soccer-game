import { Container } from "pixi.js";

export function createLayers() {
  const stage = new Container();
  const world = new Container();
  const pitchLayer = new Container();
  const shadowLayer = new Container();
  const playerLayer = new Container();
  const ballLayer = new Container();
  const effectsLayer = new Container();
  const worldUiLayer = new Container();
  const screenUiLayer = new Container();

  world.addChild(pitchLayer, shadowLayer, playerLayer, ballLayer, effectsLayer, worldUiLayer);
  stage.addChild(world, screenUiLayer);

  return {
    stage,
    world,
    pitchLayer,
    shadowLayer,
    playerLayer,
    ballLayer,
    effectsLayer,
    worldUiLayer,
    screenUiLayer,
  };
}
