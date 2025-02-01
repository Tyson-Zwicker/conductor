const go = function () {
  conductor.init('#012');
  conductor.create('test');
  conductor.addSpriteTo(
    'test',
    [0,-50,30,30,-30,30],
    '#0f0'
  );
  conductor.setPositionOf(
    'test',
    conductor.screenCenter().x, 
    conductor.screenCenter().y
  );
  conductor.draw();
  console.log(conductor);
  console.log(conductor.has('test'));
}