/*
This runs immediately, establishes event handlers for keyboard and mouse, and
creates the canvas.

Finally, it returns an object called the "conductor".  All the "things" in your
program that should interact with the user, via mouse or keyboard or be drawn on
the canvas must be registered with the conductor so they can automatically be
made aware of events that effect them, and be animated in the main loop.

Calling the loop() function will start animating the program, and interacting
with the user.
*/

const conductor = (function () {
  ///-------------------------PRIVATE-----------------------------------------
  var objects = {};
  var canvas = null;
  let ctx = null;
  var backgroundColor = null;

  var running = false;    //Is the mainloop supposed to keep going?
  var frameRate = null;
  var oldTime = new Date();
  var time = new Date();
  var delta = 0;

  var mouse = { "x": 0, "y": 0, "button": false };
  var hoveredObject = null;
  var pressedObject = null;
  var initialized = false;
  /**
  * Converts a cartesian coordinate to a polar coordinate.
  * @param {number} x the coordinate along the horizontal (x) axis.
  * @param {number} y the coordinate along the vertical (y) axis.
  * @returns {PolarCoordinate} r,a - the radius and azimuth (angle)
  */
  function toPolar(x, y) {
    return {
      a: Math.atan2(y, x),
      r: Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
    }
  }
  /**
  * Converts a polar coordinate to a cartesian coordinate
  * @param {number} radius polar coordinate radius 
  * @param {number} aangle polar coodinate azimuth
  * @returns {Point} {x,y} Cartesian coordinates.
  */
  function fromPolar(radius, angle) {
    return { "x": Math.cos(angle) * radius, "y": Math.sin(angle) * radius };
  }
  /**
    * Converts a polar coordinate to a cartesian coordinate after applying rotation and translation.
    * @param {number} polar The initial polar coordinate
    * @param {number} rotation the amount to rotate the coordinate in Radians.
    * @param {Point} translation the {x,y} amount to translate the coorindate
    * @returns {Point} the cartesian coordinate after transformations applied.
    */
  function rotateTranslateTransform(polar, rotation, translation) {
    let rotated = { "r": polar.r, "a": polar.a + rotation };
    let point = { "x": Math.cos(rotated.a) * rotated.r, "y": Math.sin(rotated.a) * rotated.r }
    let translatedPoint = { "x": point.x + translation.x, "y": point.y + translation.y }
    return translatedPoint;
  }
  function isBounded(point, bounds) {
    let debug = true;

    if (debug) {
      console.log(`Is ${point.x},${point.y} bounded by (${bounds.x0}, ${bounds.y0}) , (${bounds.x1},${bounds.y1})?`);
      console.log(`Bounded is ${(point.x > bounds.x0 && point.y > bounds.y0 && point.x < bounds.x1 && point.y < bounds.y1)}`);
    }
    return (point.x > bounds.x0 && point.y > bounds.y0 && point.x < bounds.x1 && point.y < bounds.y1);
  }
  /**
   * Gets the coordinate of the center of the screen.
   * @returns point {x,y} 
   */
  function screenCenter() {
    return { "x": canvas.width / 2, "y": canvas.height / 2 };
  }
  /**
   * Gets the size of the screen.
   * @returns size {x,y} 
   */
  function screenSize() {
    return { "w": canvas.width, "h": canvas.height };
  }
  function screenBounds() {
    return { "x0": 0, "y0": 0, "x1": canvas.width, "y1": canvas.height };
  }
  /**
   * Gets a point after translation by another point
   * @param {Point} p0 the initial point
   * @param {Point} p1 the amount to translate the initial point by
   * @returns{Point} the translated point {x,y}
   */
  function translate(p0, p1) {
    return { "x": p0.x + p1.x, "y": p0.y + p1.y };
  }
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  /**
     * Draws all the game objects on the canvas.
     */
  function drawObjects() {
    let debug = true;

    Object.getOwnPropertyNames(objects).forEach(objectName => {
      let object = objects[objectName];
      let objectPosition = object.getPosition();
      let centerPoint = translate(objectPosition, screenCenter());
      if (debug) {
        console.log(`object's position ${objectPosition.x},${objectPosition.y}`);
        console.log(`translated to center of screen: ${centerPoint.x},${centerPoint.y}`);
        console.log(`object has ${object.getSprites().length} sprite(s).`);
      }
      if (isBounded(centerPoint, screenBounds()) && object.getSprites().length > 0) {
        if (debug) {
          console.log(`object is inside the screen boundry, and has some sprite.`);
        }
        object.setOnScreen(true);
        let spriteBounds = { x0: undefined, y0: undefined, x1: undefined, y1: undefined };
        object.getSprites().forEach(sprite => {
          let firstPoint = true;
          if (debug) {
            console.log(`drawing sprite with color ${sprite.color}`);
          }
          ctx.fillStyle = sprite.color;
          ctx.beginPath();
          sprite.coords.forEach(polarCoordinate => {
            let spritePoint = rotateTranslateTransform(polarCoordinate, object.getOrientation(), centerPoint);

            if (spriteBounds.x0 === undefined || spriteBounds.x0 > spritePoint.x) {
              spriteBounds.x0 = spritePoint.x;
            }
            if (spriteBounds.x1 === undefined || spriteBounds.x1 < spritePoint.x) {
              spriteBounds.x1 = spritePoint.x;
            }
            if (spriteBounds.y0 === undefined || spriteBounds.y0 > spritePoint.y) {
              spriteBounds.y0 = spritePoint.y;
            }
            if (spriteBounds.y1 === undefined || spriteBounds.y1 < spritePoint.y) {
              spriteBounds.y1 = spritePoint.y;
            }
            if (firstPoint) {

              ctx.moveTo(spritePoint.x, spritePoint.y);

              if (debug) {
                console.log(`  move to Sprite Point ${spritePoint.x},${spritePoint.y}`);
              }

              firstPoint = false;
            } else {

              ctx.lineTo(spritePoint.x, spritePoint.y);

              if (debug) {
                console.log(`  line to Sprite Point ${spritePoint.x},${spritePoint.y}`);
              }
            }
            //set bounds..
            object.setBounds(spriteBounds);
          });//next sprite coordinate...          
          if (debug) {
            console.log(`closing sprite path and filling.`);
          }
          ctx.closePath();
          ctx.fill();
        });//next sprite..
        if (debug) {
          console.log(`All sprites for ${objectName} created spriteBounds (${spriteBounds.x0}, ${spriteBounds.y0}) , (${spriteBounds.x1},${spriteBounds.y1})`);
        }
      } else {
        if (debug) {
          console.log(`game object ${objectName} is not on the screen`);
        }
        object.setOnScreen(false);
      }
    });//next object..
  }
  function checkMouseInteractions() {
    let debug = true;

    Object.getOwnPropertyNames(objects).forEach(objectName => {
      let object = objects[objectName];
      if (debug) {
        console.log(`${objectName} is interactive: ${object.isInteractive()}`);
      }
      if (object.isInteractive()) {
        if (debug) {
          console.log(`${objectName} is on screen: ${object.isInteractive()}`);
        }
        if (object.isOnScreen()) {
          if (isBounded(mouse, object.getBounds())) {
            //The mouse is inside of the object's bounds.
            if (debug) {
              console.log(`${objectName} bounds mouse position ${mouse.x},${mouse.y}`);
            }
            if (mouse.button === false && hoveredObject !== object) {
              //a newly hovered object
              if (debug) {
                console.log(`hovered.`);
              }
              hoveredObject = object;
              pressedObject = null;
            }
            else if (mouse.button && hoveredObject === object) {
              //button was pressed while it was hovering on this object
              if (debug) {
                console.log(`pressed.`);
              }
              pressedObject = object;
            }
            else if (!mouse.button && pressedObject === object) {
              //The button was released on the same object pressed on.. CLICK!
              if (debug) {
                console.log(`clicked.`);
              }
              let clickFn = object.getClickFn();
              let clickParam = object.getClickParam();
              if (clickParam) {
                clickFn();
              } else {
                clickFn(clickParam);
              }
            }
          }
        }
      }
    });
  }
  function mainLoop() {
    delta = (time - oldTime) / 1000;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    checkMouseInteractions();
    drawObjects();
    if (running) setTimeout(mainLoop, frameRate);
  }

  //-----------------------------PUBLIC----------------------------------------
  return {
    /**
     * Creates the canvas, attach event handlers..
     * @param {string} bgColor #RGB canvas background color.
     */
    "init": function (bgColor) {
      if (initialized) { 
        throw new Error ('You can only initialize it once.');
      } else {
        backgroundColor = (bgColor) ? bgColor : '#000';
        let body = document.getElementsByTagName('body')[0];
        body.style.margin = "0px";
        canvas = document.createElement('canvas');
        canvas.style.padding = "0px 0px 0px 0px";
        canvas.style.margin = "0px 0px 0px 0px";
        canvas.style.border = "0px";
        canvas.onmousemove = function (e) {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
        }
        canvas.onmousedown = function (e) {
          mouse.button = true;
        }
        canvas.mouseUp = function (e) {
          mouse.button = false;
        }
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        ctx = canvas.getContext('2d');
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        console.log(`adding canvas to body`);
        body.appendChild(canvas);
        initialized = true;
      }
    },
    "runOnce": function (){
      running = false;
      mainLoop();
    },
    "startLoop": function (frameRateMillis) {
      frameRate = frameRateMillis;
      //Only run once if no frame rate is defined.
      running = (frameRateMillis) ? true : false;
      mainLoop();
    },
    "stopLoop": function () {
      running = false;
    },
    /**
     * Gets the size of the window.
     * @returns {Size} the width and height {w,h}
     */
    "getScreenSize": function () {
      return screenSize();
    },
    "getScreenBounds": function () {
      return screenBounds();
    },
    /**
     * Gets the coordinate of the center of the window.
     * @returns {Point} {x,y}
     */
    "getScreenCenter": function () {
      return screenCenter();
    },
    "getMouse": function () {
      return { mouse };
    },
    /** 
     * Adds a sprite to this object
     * @param {string} name unique name of the GameObject.
     * @param {[Numbers]} points A series of
     *  x,y  coordinates.
     * @param {String} color #RGB color.
     */
    "addSpriteTo": function (name, points, color) {
      if (!Object.hasOwn(objects, name)) {
        throw new Error(`Cannot add sprite.  '${name}' does not exist.`);
      }
      if (points.length % 2 !== 0) {
        throw Error(`points must be pairs of numbers`);
      }
      let polarCoordinates = [];
      for (let i = 0; i < points.length; i = i + 2) {
        polarCoordinates.push(toPolar(points[i], points[i + 1]));
      }
      objects[name].addSprite({
        "color": color,
        "coords": polarCoordinates
      });
    },
    /** 
   * Set the position of game object, in Game Coordinates.
   * @param {string} name The name fof the GameObject
   * @param {Number} x the x coordinate.
   * @param {Number} y the y coordinate.
   */
    "setPositionOf": function (name, x, y) {
      if (!Object.hasOwn(objects, name)) {
        throw new Error(`cannot set position: ${name} does not exist.`);
      } else {
        objects[name].setPosition(x, y);
      }
    },
    /**
     * Sets the orientation of a game object, in radians.
     * @param {number} orientation the orientation/direction, in radians.
     */
    "setOrientationOf": function (name, orientation) {
      if (!has(name)) {
        throw new Error(`cannot set position: ${name} does not exist.`);
      } else {
        objects[name].setOrientation(orientation);
      }
    },
    /**
     * Check for existence of a GameObject
     * @param {string} name - the name of the unique name of the GameObject.
     * @returns {bool} true if GameObject by that name exists, otherwise
     * false.
     */
    "has": function (name) {
      if (!Object.hasOwn(objects, name)) {
        throw Error(`${name} does not exist.`);
      }
      return Object.hasOwn(objects, name);
    },
    /**
     * Creates a game object
     * @param {string} name - what you want to call it. Must be unique.
     */
    "create": function (name) {
      if (Object.hasOwn(objects, name)) {
        throw Error(`${name} already exists.`);
      } else {
        objects[name] = new (function () {
          const sprites = [];
          let gx = 0;
          let gy = 0;
          let orientation = 0;
          let onScreen = false;
          let interactive = false;
          let bounds = { "x0": -1, "y0": -1, "x1": -1, "y1": -1 };
          let clickFn = null;
          let clickParam = null;
          return {
            "setClickParam": function (param) {
              clickParam = param;
            },
            "getClickParam": function () {
              return clickParam;
            },
            "setClickFn": function (fn) {
              clickFn = fn;
            },
            "getClickFn": function (fn) {
              return clickFn;
            },
            "getBounds": function () {
              return bounds;
            },
            "setBounds": function (x0, y0, x1, y1) {
              bounds = { "x0": x0, "y0": y0, "x1": x1, "y1": y1 };
            },
            /** Gets the sprites used to draw this Game Object. A sprite {color,
             *  coords} is an array of polar coordinates {r,a} (radius and 
             * azimuth), and a color.                         
             * @returns {[Sprite]} An array of sprites 
             */
            "getSprites": function () {
              return sprites;
            },
            /** Adds a sprite to this Game Object. A sprite {color,
             *  coords} is an array of polar coordinates {r,a} (radius and 
             * azimuth), and a color.                         
             */
            "addSprite": function (sprite) {
              sprites.push(sprite);
            },
            /**
             * Gets the objects position in Game Coordinates
             * @returns {Point} Game coordinates.
             */
            "getPosition": function () {
              return { "x": gx, "y": gy };
            },
            "getOrientation": function () {
              return orientation;
            },
            /**
             * Sets the position of the object in Game Coordinates 
             * @param {number} x the x coordinate.
             * @param {number} y  the y coordinate.
             */
            "setPosition": function (x, y) {
              gx = x;
              gy = y;
            },
            /**
             * Sets the orientation of the object in Game Cooridnates.
             * @param {number} x the x coordinate.
             * @param {number} y  the y coordinate.
             */
            "setOrientation": function (angle) {
              orientation = angle;
            },
            "isOnScreen": function () {
              return onScreen;
            },
            "setOnScreen": function (visible) {
              onScreen = visible;
            },
            "isInteractive": function () {
              return interactive;
            }
          }
        })();
      }
    }
  }
})();