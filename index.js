const setup = function () {
  conductor.init('#012');
  conductor.setFont (14,true);
  
  conductor.create('test');
  conductor.addSpriteTo('test', [0, -50, 30, 30, -30, 30], '#0f0',true);
  conductor.setPositionOf('test', -100, 0);
  conductor.setLabelOf ('test', 'Triangle',{"x":0,"y":0},'#fff');
  
  conductor.create ('test2');
  conductor.addSpriteTo ('test2', [-20,-20,20,-20,20,20,-20,20],'#f00',false);
  conductor.setPositionOf ('test2',300,200);
  conductor.setOrientationOf ('test2',Math.PI/6);
  conductor.setLabelOf ('test2', 'Square',{"x":0,"y":30},'#ff0');
  
  conductor.create ('button');
  conductor.addSpriteTo ('button', [-30,-10,30,-10,30,10,-30,10],'#0af');
  conductor.setPositionOf ('button',0,0);
  conductor.setLabelOf ('button','Button',{"x":0,"y":0},'#fff');
  
  conductor.runOnce();
}
