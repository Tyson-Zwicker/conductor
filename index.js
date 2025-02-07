const setup = function () {
  conductor.init('#012', true);
  conductor.setFont(14, true);
  conductor.setCamera(200, 200, .5);
  /*
    conductor.create('test');
    conductor.addSpriteTo('test', [0, -50, 30, 30, -30, 30], '#0f0');
    conductor.setPositionOf('test', -100, 0);
    conductor.setLabelOf('test', 'Triangle', { "x": 0, "y": 0 }, '#fff');
  
    conductor.create('test2');
    conductor.addSpriteTo('test2', [-20, -20, 20, -20, 20, 20, -20, 20], '#f00');
    conductor.setPositionOf('test2', 300, 200);
    conductor.setOrientationOf('test2', Math.PI / 6);
    conductor.setLabelOf('test2', 'Square', { "x": 0, "y": 30 }, '#ff0');
  */
  let ntext = '#fff';
  let nback = '#08f';
  let htext = '#ff0';
  let hback = '#0f5';
  let ptext = '#000'
  let pback = '#ff0';

  let y = 5;
  for (let i = 0; i < 6; i++) {
    let x0 = -35
    let y0 = -10;
    let x1 = 35;
    let y1 = 10;
    let x = 45;
    y = y + 25;
    let text = `Button ${i}`;
    let name = `button${i}`;
    conductor.create(name);
    conductor.addSpriteTo(name, [x0, y0, x1, y0, x1, y1, x0, y1], nback, true);
    conductor.addHoveredSpriteTo(name, [x0, y0, x1, y0, x1, y1, x0, y1], hback, true);
    conductor.addPressedSpriteTo(name, [x0, y0, x1, y0, x1, y1, x0, y1], pback, true);
    conductor.setPositionOf(name, x, y, true);
    conductor.setLabelOf(name, text, { "x": 0, "y": 0 }, ntext, htext, ptext);
    conductor.setClickFunctionOf(`button${i}`, () => {
      let body = document.getElementsByTagName('body')[0];
      let textNode = document.createTextNode(`button ${i} clicked.`);
      body.append(textNode);
    });
  }
  conductor.setAsToggle('button1');
  conductor.registerWithRadioGroup('button3', 'myradio');
  conductor.registerWithRadioGroup('button4', 'myradio');
  conductor.registerWithRadioGroup('button5', 'myradio');


  //Remember 0 radians points to the right.  The front of your thing is x+

  let shipSpriteCoords = [
    100, 0,
    90, 15,
    80, 25,
    70, 30,
    -80,30,
    -90,10,
    -95,5,
    -95,-5,
    -90,-10,
    -80,-30,
    70,-30,
    80,-25,
    90,-15
  ];
  conductor.create('ship');
  conductor.addSpriteTo('ship', shipSpriteCoords, '#556', true);
  conductor.addSpriteTo('ship', shipSpriteCoords, '#aaa', false);
  conductor.setPositionOf('ship', 100, 100, false);
  conductor.setLabelOf('ship', 'X-1', { "x": 0, "y": 0 }, '#fff');

  conductor.create('turret');
   let turretSpritePoints = [
     -10, -7,
     -10, -1,
     -20, -1,
     -20, 1,
     -10, 1,
     -10, 7,
     10, 10,
     10, -10
   ];
  conductor.addPartTo('ship', 'turretA', { "x": 40, "y": 0 }, Math.PI/2);
  conductor.addSpriteToPart('ship', 'turretA', turretSpritePoints, '#ff0', true);
  conductor.addPartTo('ship', 'turretB', { "x": -40, "y": 0 }, 0);
  conductor.addSpriteToPart('ship', 'turretB', turretSpritePoints, '#ff0', true);
  conductor.setDirectionOf('ship', 0);
  conductor.setSpinOf ('ship',Math.PI/30);
  conductor.setVelocityByDirectionOf('ship', 20);//5 pixels per second hopefully...
  conductor.setUsesSteering ('ship',true);
  conductor.startLoop(33);
}
