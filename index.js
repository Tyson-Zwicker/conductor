const setup = function () {
  conductor.init('#012', true);
  conductor.setFont(14, true);
  conductor.setCamera(100, 100, .5);

  conductor.create('test');
  conductor.addSpriteTo('test', [0, -50, 30, 30, -30, 30], '#0f0');
  conductor.setPositionOf('test', -100, 0);
  conductor.setLabelOf('test', 'Triangle', { "x": 0, "y": 0 }, '#fff');

  conductor.create('test2');
  conductor.addSpriteTo('test2', [-20, -20, 20, -20, 20, 20, -20, 20], '#f00');
  conductor.setPositionOf('test2', 300, 200);
  conductor.setOrientationOf('test2', Math.PI / 6);
  conductor.setLabelOf('test2', 'Square', { "x": 0, "y": 30 }, '#ff0');

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

  
  let shipSpriteCoords = [
    0, -100,
    15, -90,
    30, -70,
    35, -50,
    35, 80,
    25, 90,
    10, 100,
    -10, 100,
    -25, 90,
    -35, 80,
    -35, -50,
    -30, -70,
    -15, -90];
  conductor.create('ship');
  conductor.addSpriteTo('ship', shipSpriteCoords, '#556', true);
  conductor.addSpriteTo('ship', shipSpriteCoords, '#aaa', false);
  conductor.setPositionOf('ship', 500, 500, false);
  conductor.setLabelOf('ship', 'X-1', { "x": 0, "y": 0 }, '#fff');

  //TODO: Make this a part of 'ship'.. for now just making sure it looks "turret-y".
  conductor.create('turret');
  let turretSprite = [
    -7, -10,
    -1, -10,
    -1, -20,
    1, -20,
    1, -10,
    7, -10,
    10, 10,
    -10, 10
  ];
  //function (name, partname, offset, orientation)
  conductor.addPartTo('ship','turret', {"x":0,"y":-30},0);
  //addSpriteToPart(name, partname, points, color, fill)
  conductor.addSpriteToPart ('ship','turret',turretSprite,'#ff0', true);

  conductor.startLoop(33);
}
