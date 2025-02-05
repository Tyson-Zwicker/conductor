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
    conductor.addSpriteTo(name, [x0, y0, x1, y0, x1, y1, x0, y1], nback,true);
    conductor.addHoveredSpriteTo(name, [x0, y0, x1, y0, x1, y1, x0, y1], hback,true);
    conductor.addPressedSpriteTo(name, [x0, y0, x1, y0, x1, y1, x0, y1], pback,true);
    conductor.setPositionOf(name, x, y, true);
    conductor.setLabelOf(name, text, { "x": 0, "y": 0 }, ntext, htext, ptext);
    conductor.setClickFunctionOf(`button${i}`, () => { 
      let body = document.getElementsByTagName('body')[0];
      let textNode = document.createTextNode (`button ${i} clicked.`);
      body.append (textNode);
    });
  }
  conductor.setAsToggle('button1');
  conductor.registerWithRadioGroup('button3', 'myradio');
  conductor.registerWithRadioGroup('button4', 'myradio');
  conductor.registerWithRadioGroup('button5', 'myradio');
  
  conductor.startLoop(33);
}
