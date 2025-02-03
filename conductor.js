/*
This runs immediately, establishes event handlers for keyboard and mouse, and
creates the canvas.

Finally, it returns an object called the "conductor".  All the "things" in your
program that should interact with the user, via mouse or keyboard or be drawn on
the canvas must be registered with the conductor so they can automatically be
made aware of events that effect them, and be animated in the main loop.

Calling the loop() function will start animating the program, and interacting
with the user.  runOnce() to run the main loop only once, and stopLoop() to stop 
the loop from continuing.

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
  /**
   * The camera view the Game World, its coordinates reflect the Game Coordinate that will be at the center
   * of the screen when the world is drawn.  It also handles zooming.  A value of 1 is "normal" zoom.  Higher values
   * will "zoom in", and values less than 1 will zoom out.  The zoom function works in two ways:
   * First, it scales the sprites by being multiplied to their polar coordinate's radius.
   * Second, it scales the "view port" such that zooming out will show more of the Game World.  This is done by 
   * multiplying the distance between the Camera's coordinate, and the Game Object's coordinates.  A zoom level of 0
   * will cause the entire Game World to appear as a single pixel in the middle of the screen.
   */
  var camera = {x:0, y:0, zoom:1}

  var mouse = { "x": 0, "y": 0, "button": false };
  var hoveredObject = null;
  var pressedObject = null;
  var initialized = false;
  /**
   * Gets the width of text (depends on context's current font) and the text..
   * @param {string} text the text to be measured
   * @returns the width of the text, in pixels.
   */
  function getTextWidth(text) {
    const fontMetric = ctx.measureText(text);
    let width = fontMetric.width;
    return width;
  }
  /**
   * Gets the height of text (depends on the context's current font);
   */
  function getTextHeight(font) {
    //Using symbols the hang and rise the most.. in English at least.
    var fontMetric = ctx.measureText("ljM^_");
    let height = fontMetric.actualBoundingBoxAscent + fontMetric.actualBoundingBoxDescent;
    return height;
  }
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
  function fromPolar(polarCoordinate) {
    return { "x": Math.cos(polarCoordinate.a) * polarCoordinate.r, "y": Math.sin(polarCoordinate.a) * polarCoordinate.r };
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
  /**
   * Determines if a point falls within the boundry of a rectable.
   * @param {Point} point an object with {x,y} properties.
   * @param {Rectanle} bounds an object with {x0,y0,x1,y1} properties.
   * @returns true if the point is withing the rectanlge, false if not.
   */
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
  /**
   * Returns the a rectanlge describing the screen's boundry.
   * @returns a rectangle - an object with properties {x0, y0, x1, y1}
   */
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
  /**
   *  Resize the canvas to fit the current size of the window.
   */
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  /**
   * Draws all of the game objects on the canvas which fit.  Offsets the
   * objects "Game Coordinates" {x,y} by the center of the screen, such that
   * an object with {0,0} will appear centered on the screen.
   */
  function drawObjects() {
    let debug = true;

    Object.getOwnPropertyNames(objects).forEach(objectName => {
      let object = objects[objectName];
      let objectPosition = object.getPosition();
      let objectCenterPoint = undefined;
      
      console.log (objectPosition);
      
      if (!objectPosition.isFixed) {
        
        objectCenterPoint = translate(objectPosition, screenCenter());
        //TODO:  Translate due to camera, when implimented.
        //TODO:  Add affect of zooming.
        if (debug) {
          console.log(`${objectName}'s position is is NOT fixed.`);
          console.log(`${objectName}'s Game Coordinates ${objectPosition.x},${objectPosition.y}`);
          console.log(`translated to center of screen: ${objectCenterPoint.x},${objectCenterPoint.y}`);
        }
      
      } else {
        objectCenterPoint = objectPosition;

        if (debug) {
          console.log(`${objectName}'s position is fixed to (${objectCenterPoint.x},${objectCenterPoint.y})- do not translate to center of the screen.`);
        }
      
      }

      if (debug) {
        console.log(`object has ${object.getSprites().length} sprite(s).`);
      }

      if (isBounded(objectCenterPoint, screenBounds()) && object.getSprites().length > 0) {
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
          if (sprite.fill) {
            ctx.fillStyle = sprite.color;
          } else {
            ctx.strokeStyle = sprite.color;
            ctx.lineWidth = 1;
          }
          ctx.beginPath();
          sprite.coords.forEach(polarCoordinate => {
            let spritePoint = undefined;
            if (!objectPosition.isFixed){
              spritePoint = rotateTranslateTransform(polarCoordinate, object.getOrientation(), objectCenterPoint);
            }else{
              
              spritePoint = fromPolar (polarCoordinate);
              if (debug) {
                console.log (`fixed object sprite position from Polar: (${spritePoint.x},${spritePoint.y})`);
              }
              spritePoint = translate (spritePoint, objectCenterPoint);
              if (debug) {
                console.log (`fixed object sprite position translated to objectCenterPoint: (${spritePoint.x},${spritePoint.y})`);
              }
            }
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
            console.log(`closing sprite path...`);
          }
          ctx.closePath();
          if (sprite.fill) {
            if (debug) {
              console.log(`...and filling.`);
            }
            ctx.fill();
          } else {
            if (debug) {
              console.log(`...and stroke.`);
            }
            ctx.stroke();
          }
        });//next sprite..

        if (debug) {
          console.log(`All sprites for ${objectName} created spriteBounds (${spriteBounds.x0}, ${spriteBounds.y0}) , (${spriteBounds.x1},${spriteBounds.y1})`);
        }

        let label = object.getLabel();
        if (label) {

          if (debug) {
            console.log(`${objectName} has a label..`);
          }

          let labelX = objectCenterPoint.x + label.offset.x;
          let labelY = objectCenterPoint.y + label.offset.y;
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          ctx.fillStyle = label.color;

          if (debug) {
            console.log(`drawing label '${label.text}' at (${labelX},${labelY})`);
          }
          ctx.fillText(label.text, labelX, labelY);
        } else {

          if (debug) {
            console.log('This object has no label.');
          }

        }
      } else {
        if (debug) {
          console.log(`game object ${objectName} is not on the screen`);
        }
        object.setOnScreen(false);
      }
    });//next object..
  }
  /**
   * Checks all the game objects that are "interactive" to see of the mouse if hovering over them,
   * or if they have been clicked on.  If they have been clicked on, it will call that object's click
   * function, and pass it parameters associated with the object, if any have been defined.
   */
  function checkMouseInteractions() {
    let debug = true;

    Object.getOwnPropertyNames(objects).forEach(objectName => {
      let object = objects[objectName];
      if (debug) {
        console.log(`${objectName} is interactive: ${object.isInteractive()}`);
      }
      if (object.isInteractive()) {
        if (debug) {
          console.log(`${objectName} is on screen: ${object.isOnScreen()}`);
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
  /**
   * This will have the conductor update the dispay and check the mouse.
   * The frame rate is set when the init() function is called.
   */
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
     * Creates the canvas, set the background collor, attach event handlers..
     * @param {string} bgColor #RGB canvas background color.
     */
    "init": function (bgColor) {
      if (initialized) {
        throw new Error('You can only initialize it once.');
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
    /**
     * Runs the main loop one time only.
     */
    "runOnce": function () {
      running = false;
      mainLoop();
    },
    /**
     * Runs the mainloop repeatedly
     * @param {number} frameRateMillis the number of milliseconds to wait until running the main loop again.
     */
    "startLoop": function (frameRateMillis) {
      frameRate = frameRateMillis;
      //Only run once if no frame rate is defined.
      running = (frameRateMillis) ? true : false;
      mainLoop();
    },
    /**
     * Stops the main loop from running. Call startLoop to get it going again.
     */
    "stopLoop": function () {
      running = false;
    },
    /**
     * Sets the font to use on the canvas
     * @param {number} fontSize the font size in pixels.
     * @param {bool} true if bold, false otherwise (optional).
     */
    "setFont": function (fontSize, bold) {
      if (bold) {
        ctx.font = `bold ${fontSize}px monospace`;
      } else {
        ctx.font = `${fontSize}px monospace`;
      }
    },
    /**
     * Gets the size of the window.
     * @returns {Size} the width and height {w,h}
     */
    "getScreenSize": function () {
      return screenSize();
    },
    /**
     * Get the size of the browser window
     * @returns the size of the window {w,h}
    */
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
    /**
     * Returns the last information collected about the mouse.
     * @returns the mouse information {x,y,button} where button is true if down and false if not.
     */
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
    "addSpriteTo": function (name, points, color, fill) {
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
        "coords": polarCoordinates,
        "fill": fill
      });
    },
    /**
     * Adds a text label to a game object.
     * @param {string} name the name of the object to add the text to.
     * @param {string} text the text to draw..
     * @param {Point} offset the position to place the text {0,0} would be at the centered on the sprite.
     */
    "setLabelOf": function (name, text, offset, color) {
      if (!Object.hasOwn(objects, name)) {
        throw new Error(`${name} does not exist.`);
      } else {
        objects[name].setLabel(text, offset, color);
      }
    },
    /** 
   * Set the position of game object, in Game Coordinates.
   * @param {string} name The name fof the GameObject
   * @param {Number} x the x coordinate.
   * @param {Number} y the y coordinate.
   * @param {bool} fixes (optional) if true, the {x,y} position is fixed on the screen (ie. it is not in Game 
   * Coordinates and will not be affected by the camera or zooming.  If false, the position is in Game Coordinates.
   * Used for GUI elements like buttons.
   */
    "setPositionOf": function (name, x, y, fixed) {
      if (!Object.hasOwn(objects, name)) {
        throw new Error(`cannot set position: ${name} does not exist.`);
      } else {
        if (fixed) {
          objects[name].setFixedCoordinates(x, y);
        } else {
          objects[name].setGameCoordinates(x, y);
        }
      }
    },
    /**
     * Sets the orientation of a game object, in radians.
     * @param {number} orientation the orientation/direction, in radians.
     */
    "setOrientationOf": function (name, orientation) {
      if (!Object.hasOwn(objects, name)) {
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
          //Sprite {name, coords, color, fill}
          const sprites = [];
          //text, offset
          let label = null;
          let gx = -1;
          let gy = -1;
          let fx = -1;
          let fy = -1;
          let positionIsFixed = false;
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
            /** this is set during the draw operation, it change based on how much space
             * the object is taking up on the screen.
             * @param {number} x0 the left most screen coordinate the object's sprite(s) touched.
             * @param {number} y0 the upper most screen coordinate the object's sprite(s) touched.
             * @param {number} x1 the right most screen coordinate the object's sprite(s) touched.
             * @param {number} y1 the lower most screen coordinate the object's sprite(s) touched.
             */
            "setBounds": function (x0, y0, x1, y1) {
              bounds = { "x0": x0, "y0": y0, "x1": x1, "y1": y1 };
            },
            /** Gets the sprites used to draw this Game Object. A sprite {color,
             *  coords} is an array of polar coordinates {r,a} (radius and 
             * azimuth), and a color.                         
             * @returns {[Sprite]} An array of sprites {
             */
            "getSprites": function () {
              return sprites;
            },
            /**
             * Adds a sprite to this Game Object. A sprite {color,
             * coords} is an array of polar coordinates {r,a} (radius and 
             * azimuth), a color, fill (.                         
             */
            "addSprite": function (sprite) {
              sprites.push(sprite);
            },
            /**
             * Adds a text label to  be drawn with the sprite.
             * @param {string} text the label to attach to the sprite.
             * @param {Point} offset the position (from the center of the sprite) to place the label.
             */
            "setLabel": function (text, offset, color) {
              label = { "text": text, "offset": offset, "color": color };
            },
            /**
             * Gets the label to be drawn with the sprite.
             * @return the label {text, offset, color}
             */
            "getLabel": function () {
              return label;
            },
            /**
             * Gets the objects position in Game Coordinates
             * @returns {Point} Game coordinates.
             */
            "getPosition": function () {
              if (positionIsFixed) {
                return { "x": fx, "y": fy, "isFixed": true };
              } else {
                return { "x": gx, "y": gy, "isFixed": false };
              }
            },
            /**
             * Gets the orientation/direction the object is facing- In Radians.
             * @returns the orientation in radians.
             */
            "getOrientation": function () {
              return orientation;
            },
            /**
             * Sets the position of the object in Game Coordinates 
             * @param {number} x the x coordinate where the object is in the game world.
             * @param {number} y  the y coordinate where the object is in the game world.
             */
            "setGameCoordinates": function (x, y) {
              gx = x;
              gy = y;
              positionIsFixed = false;
            },
            /**
             * Sets the position of the object in fixed Screen Coordinates.
             * @param {number} the x coordinate of the object on the screen.
             * @param {number} the y coordinate of the object on the screen.
             */
            "setFixedCoordinates": function (x, y) {
              fx = x;
              fy = y;
              positionIsFixed = true;
            },
            /**
             * Sets the orientation of the object in Game Cooridnates.
             * @param {number} x the x coordinate.
             * @param {number} y  the y coordinate.
             */
            "setOrientation": function (angle) {
              orientation = angle;
            },
            /**
             * Let's you know if the object is on screen, and should checked for mouse events.
             * It is set during the draw routine.
             * @returns true if the object is within the bounds of the screen, otherwise false.
             */
            "isOnScreen": function () {
              return onScreen;
            },
            /**
             * This is set during the draw routine.. if the center point of the object is not 
             * visible on screen, this set to false, other wise its true.  This way the object is not
             * considered for mouse interaction if it isn't on the screen.
             * @param {bool} visible true or false.
             */

            "setOnScreen": function (visible) {
              onScreen = visible;
            },
            /**Returns the state of this objects interactivity
             * @returns true if this can interact with the mouse, false otherwise.
             */
            "isInteractive": function () {
              return interactive;
            },
            /**
             * Gives the object permission to interact with the mouse.
             * @param {bool} interacts true if it can be interacted with, false otherwise.
             */
            "setInteractive": function (interacts) {
              interactive = (interacts === true);
              if (interactive !== true && interactive !== false) {
                throw new Error(`Interactive can only be true or false. ${interacts} is invalid`);
              }
            }
          }
        })();
      }
    }
  }
})();