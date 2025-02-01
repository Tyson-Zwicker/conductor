const setup = function () {
  conductor.init('#012');
  conductor.create('test');
  conductor.addSpriteTo('test', [0, -50, 30, 30, -30, 30], '#0f0');
  conductor.setPositionOf('test', 0, 0);
  conductor.runOnce();
}