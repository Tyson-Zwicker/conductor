const setup = function () {
  conductor.init('#012',true);
  conductor.setFont (14, true);
  conductor.setCamera (100,100,.5);

  conductor.create('test');
  conductor.addSpriteTo('test', [0, -50, 30, 30, -30, 30], '#0f0');
  conductor.setPositionOf('test', -100, 0);
  conductor.setLabelOf ('test', 'Triangle',{"x":0,"y":0},'#fff');
  
  conductor.create ('test2');
  conductor.addSpriteTo ('test2', [-20,-20,20,-20,20,20,-20,20],'#f00');
  conductor.setPositionOf ('test2',300,200);
  conductor.setOrientationOf ('test2',Math.PI/6);
  conductor.setLabelOf ('test2', 'Square',{"x":0,"y":30},'#ff0');
  
  conductor.create ('button');

  //TODO: This might be easier to think of if there was a addRectangleSpriteTo (x,y,w,h)
  //because as it is now, you have to figure out the position from based on the coordintes
  //of the sprite, so the position has coordinates that don't match anything in the sprite coordinates
  conductor.addSpriteTo ('button', [-30,-10,30,-10,30,10,-30,10],'#0af');
  conductor.setPositionOf ('button',35,25,true);
  conductor.setLabelOf ('button','Buttony',{"x":0,"y":0},'#fff');
  
  conductor.startLoop(33);
}
