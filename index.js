const go = function () {
  conductor.init('#012');
  conductor.create('test');

  console.log(conductor);
  console.log(conductor.has('test'));
}