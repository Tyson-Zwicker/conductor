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
  /*
  
  
   -------------------------PRIVATE-----------------------------------------


  */
  var objects = {};
  var canvas = null;
  let ctx = null;
  var backgroundColor = null;
  var running = false;    //Is the mainloop supposed to keep going?
  var frameRate = null;
  var oldTime = new Date();
  var time = new Date();
  var zoomOnWheel = false;
  var delta = 0;
  /**
   * The camera view the Game World, its coordinates reflect the Game Coordinate that will be at the center
   * of the screen. It also handles zooming.  A zoom value of 1 is "normal" zoom.  Higher values
   * will "zoom in", and values less than 1 will zoom out.  Zoom value must be greater than 0.
   */
  var camera = { x: 0, y: 0, zoom: 1 }
  var mouse = { "x": 0, "y": 0, wheel: 0, "button": false }; //Coordinates, wheel spin direction, button (true=pressed)
  var hoveredObject = null;
  var pressedObject = null;
  var radioGroups = {};
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
    return {
      "x": Math.cos(polarCoordinate.a) * polarCoordinate.r,
      "y": Math.sin(polarCoordinate.a) * polarCoordinate.r
    };
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
    Object.getOwnPropertyNames(objects).forEach(objectName => {
      let object = objects[objectName];
      let objectPosition = object.getPosition();
      let objectCenterPoint = { "x": undefined, "y": undefined }
      if (!objectPosition.isFixed) {
        objectCenterPoint.x = screenCenter().x + (objectPosition.x - camera.x) * camera.zoom;
        objectCenterPoint.y = screenCenter().y + (objectPosition.y - camera.y) * camera.zoom;
      } else {
        objectCenterPoint = objectPosition;
      }
      if (isBounded(objectCenterPoint, screenBounds()) && object.getSprites().length > 0) {
        object.setOnScreen(true);
        //spriteBounds will capture the furthest point a sprite is drawn from the game object's center, 
        //which will be used to make the box used for mouse interaction as accurate as possible.
        let spriteBounds = { x0: undefined, y0: undefined, x1: undefined, y1: undefined };
        //Sprite set depends on the objects state of interaction with the mouse.
        let spriteSet = undefined;
        if (object.isToggled() || object === pressedObject) {
          spriteSet = object.getPressedSprites();
        } else if (object === hoveredObject) {
          spriteSet = object.getHoveredSprites();
        } else {
          spriteSet = object.getSprites();
        }
        spriteSet.forEach(sprite => {
          let firstPoint = true;
          if (sprite.fill) {
            ctx.fillStyle = sprite.color;
          } else {
            ctx.strokeStyle = sprite.color;
            ctx.lineWidth = 1;
          }
          ctx.beginPath();
          sprite.coords.forEach(polarCoordinate => {
            let spritePoint = { "x": undefined, "y": undefined };
            if (!objectPosition.isFixed) {
              let rotatedScaledPolar = {
                "a": polarCoordinate.a + object.getOrientation(),
                "r": polarCoordinate.r * camera.zoom
              };
              spritePoint = fromPolar(rotatedScaledPolar);
              spritePoint = translate(spritePoint, objectCenterPoint);
            } else {
              spritePoint = fromPolar(polarCoordinate);
              spritePoint = translate(spritePoint, objectCenterPoint);
            }
            //Check to see if this point extends, or defines, one of the bounds of the game object.
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
            //First point must be moved to, the rest are lined to.  The final point doesn't need to return
            //to the starting point, closing the path does that automatically.
            if (firstPoint) {
              ctx.moveTo(spritePoint.x, spritePoint.y);
              firstPoint = false;
            } else {
              ctx.lineTo(spritePoint.x, spritePoint.y);
            }
          });//next sprite coordinate...          
          ctx.closePath();
          if (sprite.fill) ctx.fill(); else ctx.stroke();
        });//next sprite..
        object.setBounds(spriteBounds); //All sprites are drawn, safe to apply bounds..
        let label = object.getLabel(); //Now draw a label if one is defined.
        if (label) {
          let labelColor = undefined; //depends on game objects interaction with the mouse..
          if (object.isToggled() || object === pressedObject) {
            labelColor = label.pressedColor;
            if (labelColor === undefined) throw new Error(`${objectName} does not specify a label for pressed state`);
          } else if (object === hoveredObject) {
            labelColor = label.hoveredColor;
            if (labelColor === undefined) throw new Error(`${objectName} does not specify a label for hovered state`);
          } else {
            labelColor = label.color;
          }
          let labelX = objectCenterPoint.x + label.offset.x;
          let labelY = objectCenterPoint.y + label.offset.y;
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          ctx.fillStyle = labelColor;
          ctx.fillText(label.text, labelX, labelY);
        }//Label
        let parts = object.getParts();
        Object.GetOwnPropertyNames(parts).forEach(partName => {
          let part = parts[partName];
          let partCenterPoint = {
            "x": objectCenterPoint.x +
              Math.cos(part.offset.a + object.getOrientation()) *
              this.offset.r * camera.zoom,
            "y": objectCenterPoint.y +
              Math.sin(part.offset.a + object.getOrientation()) *
              ths.offset.r * camera.zoom
          }
          //A sprite is [polar], color, fill
          object.getPart(partName).sprites.forEach (sprite=>{
            //TODO: YOU ARE HERE!!
          });
        });//next part
      }// if bounded by screen
      else {
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
    let objectInteractedWith = false;
    Object.getOwnPropertyNames(objects).forEach(objectName => {
      let object = objects[objectName];
      if (object.isInteractive()) {
        if (object.isOnScreen()) {
          if (isBounded(mouse, object.getBounds())) {
            //The mouse is inside of the object's bounds.            
            objectInteractedWith = true; //counts because it hovering..
            if (mouse.button === false && hoveredObject !== object) {
              //a _newly_ hovered object

              hoveredObject = object;
              pressedObject = null;
            }
            else if (mouse.button && hoveredObject === object) {
              //object was pressed while it was hovering on this object
              objectInteractedWith = true;
              pressedObject = object;
            }
            else if (!mouse.button && pressedObject === object) {
              //The object was released on the same object pressed on.. CLICK!
              if (object.isToggle()) {//if it is a toggle, invert its toggled state.
                object.setToggled(!object.isToggled());
              }
              else if (object.inRadioGroup()) {
                let radioGroupName = object.getRadioGroup();  //Untoggled everything in the group..
                radioGroups[radioGroupName].forEach(objectInRadioGroup => {
                  objectInRadioGroup.setToggled(false);
                });
                object.setToggled(true);//and set this objects toggled state to true..
              }
              let clickFn = object.getClickFunction();
              let clickParam = object.getClickParam();
              if (clickParam) {
                clickFn();
              } else {
                clickFn(clickParam);
              }
              pressedObject = null;
              objectInteractedWith = true;
            }
          }
        }
      }
    });
    if (objectInteractedWith === false) {
      //    console.log (`nothing interacted with.count = ${interactionCount}`);
      hoveredObject = null;
      pressedObject = null;
    }
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
  /*
   
   
      -----------------------------PUBLIC----------------------------------------
  
  
  */
  return {
    /**
     * Creates the canvas, set the background collor, attach event handlers..
     * @param {string} bgColor #RGB canvas background color.
     * @param {bool} enableZoomOnWheel #(optional) if true, the camera zoom will be affected by the mouse wheel.
     */
    "init": function (bgColor, enableZoomOnWheel) {
      if (initialized) {
        throw new Error('You can only initialize it once.');
      } else {
        backgroundColor = (bgColor) ? bgColor : '#000';
        zoomOnWheel = (enableZoomOnWheel) ? enableZoomOnWheel : false;
        let body = document.getElementsByTagName('body')[0];
        body.style.margin = "0px";
        canvas = document.createElement('canvas');
        canvas.style.padding = "0px 0px 0px 0px";
        canvas.style.margin = "0px 0px 0px 0px";
        canvas.style.border = "0px";
        canvas.onwheel = function (e) {
          mouse.wheel = e.deltaY;
          if (zoomOnWheel) {
            //-1 make bigger (zoom in) 1 make smaller (zoom out)
            let change = -Math.sign(e.deltaY) * camera.zoom / 10;
            let oldZoom = camera.zoom;
            camera.zoom = camera.zoom + change;
          }
        }
        canvas.onmousemove = function (e) {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
        }
        canvas.onmousedown = function (e) {
          mouse.button = true;
        }
        canvas.onmouseup = function (e) {
          mouse.button = false;
        }
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        ctx = canvas.getContext('2d');
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
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
      if (!frameRateMillis || Number.isNaN(frameRateMillis)) {
        throw new Error(`Invalid frame rate ${frameRateMillis}`);
      }
      frameRate = frameRateMillis;
      running = true;
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
    /**Sets the position (in Game Coordinates) and zoom level of the camera.
     * @param {number} x game coordinate of the camera on x-axis.
     * @param {number} y game coordinate of the camera on y-axis.
     * @param {number} zoom coom level of camera (<1 zooms out, >1 zooms in)
     */
    "setCamera": function (x, y, zoom) {
      camera.x = x;
      camera.y = y;
      camera.zoom = zoom;
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
    /** Adds a part (a sprite attached to the game object that can be rotateed independantly
     * @param  {string} name the game object that should own this part.
     * @param  {string} partname the name of the part.
     * @param {Array.Sprite} sprites the sprites that the part draws.
     * @param {PolarCoodinate} offset the location of the part relative to the game object's center.
     * @param {number} the initial orientation of the part in radians.
     */
    "addPartTo": function (name, partname, offset, orientation) {
      
      if (Object.hasOwn(objects, name)) {
        let object =objects[name];
        object.addPart(partname, offset, orientation);
      } else {
        throw new Error(`${name} does not exist.`);
      }
    },
    //TODO: comment!
    addSpriteToPart (name, partname,sprite){
      if (Object.hasOwn(objects, name)) {
        let object =objects[name];
        //TODO: cartesian to polar conversion..
        object.addPartSprite(partname, polarizedSprite);
      } else {
        throw new Error(`${name} does not exist.`);
      }
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
        throw Error(`Uneven number of sprite points: sprite points must pairs of numbers (ie. coordinates: x,y,...)`);
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
     * Adds a sprite to this object to use when hovered.
     * @param {string} name unique name of the GameObject.
     * @param {[Numbers]} points A series of
     *  x,y  coordinates.
     * @param {String} color #RGB color.
     */
    "addHoveredSpriteTo": function (name, points, color, fill) {
      if (!Object.hasOwn(objects, name)) {
        throw new Error(`Cannot add sprite.  '${name}' does not exist.`);
      }
      if (points.length % 2 !== 0) {
        throw Error(`Uneven number of sprite points: sprite points must pairs of numbers (ie. coordinates: x,y,...)`);
      }
      let polarCoordinates = [];
      for (let i = 0; i < points.length; i = i + 2) {
        polarCoordinates.push(toPolar(points[i], points[i + 1]));
      }
      objects[name].addHoveredSprite({
        "color": color,
        "coords": polarCoordinates,
        "fill": fill
      });
    },
    /** 
     * Adds a sprite to this object to be used when pressed or toggled.
     * @param {string} name unique name of the GameObject.
     * @param {[Numbers]} points A series of
     *  x,y  coordinates.
     * @param {String} color #RGB color.
     */
    "addPressedSpriteTo": function (name, points, color, fill) {
      if (!Object.hasOwn(objects, name)) {
        throw new Error(`Cannot add sprite.  '${name}' does not exist.`);
      }
      if (points.length % 2 !== 0) {
        throw Error(`Uneven number of sprite points: sprite points must pairs of numbers (ie. coordinates: x,y,...)`);
      }
      let polarCoordinates = [];
      for (let i = 0; i < points.length; i = i + 2) {
        polarCoordinates.push(toPolar(points[i], points[i + 1]));
      }
      objects[name].addPressedSprite({
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
      * @param {string} color #RGB color, used when object is shown "normal" (ie. not affected by the mouse).
      * @param {string} hovered #RGB color, used when the object is being hovered over by the mouse (if interactive).
      * @param {string} pressed #RGB color, used when the object is beingp ressed on my the mouse (if interactive).
    */
    "setLabelOf": function (name, text, offset, color, hovered, pressed) {
      if (!Object.hasOwn(objects, name)) {
        throw new Error(`${name} does not exist.`);
      } else {
        objects[name].setLabel(text, offset, color, hovered, pressed);
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
      * Attaches the object to a "radioGroup" - when it is toggled, all the other objects in the same radio group 
      * are untoggled.  If the radio group does not exist, it will be created.
      * @param {string} objectName the game object to attach to the group.
      * @param  {string} the name of the "radioGroup" that this object should become a member of.
    */
    "registerWithRadioGroup": function (objectName, groupName) {
      if (!Object.hasOwn(objects, objectName)) {
        throw new Error(`${objectName} does not exist.`);
      } else {
        if (!Object.hasOwn(radioGroups, groupName)) {
          radioGroups[groupName] = [];
        }
        radioGroups[groupName].push(objects[objectName]);
        objects[objectName].setRadioGroup(groupName);
        objects[objectName].setAsInteractive(true);
      }
    },
    /**
      * Defines the action to be taken if this object is clicked on.
      * @param {string} objectName the object that should call the function when  clicked.
      * @param {function} fn the function that shouldbe called when the object is clicked.
      * @param {object} params (Optional) An object to send the function. Allows for function to be used on multiple
      * game objects.
    */
    "setClickFunctionOf": function (objectName, fn, params) {
      if (!Object.hasOwn(objects, objectName)) {
        throw new Error(`${objectName} does not exist.`);
      } else {
        objects[objectName].setClickFunction(fn, params);
        objects[objectName].setAsInteractive(true);
      }
    },
    /**
      * Calling this function will tell the game object to act as a toggle switch, when clicked.
      * @param {string} objectName 
    */
    "setAsToggle": function (objectName) {
      if (!Object.hasOwn(objects, objectName)) {
        throw new Error(`${objectName} does not exist.`);
      } else {
        objects[objectName].setAsInteractive(true);
        objects[objectName].setToggleable(true);
      }
    },

    /*
  
  
            |---------------------  CREATE A GAME OBJECT ---------------------|
  
  
    */

    /**
      * Creates a game object
      * @param {string} objectName - what you want to call it. Must be unique.
    */
    "create": function (objectName) {
      if (Object.hasOwn(objects, objectName)) {
        throw Error(`${objectName} already exists.`);
      } else {
        objects[objectName] = new (function () {
          //Sprite {name, coords, color, fill}
          let name = objectName;
          const sprites = [];
          const hoveredSprites = [];
          const pressedSprites = [];
          //text, offset
          const parts = {};
          let label = null;
          let gx = -1;
          let gy = -1;
          let fx = -1;
          let fy = -1;
          let positionIsFixed = false;
          let orientation = 0;
          let onScreen = false;
          let isInteractive = false;
          let isToggle = false;
          let isToggled = false;
          let inRadioGroup = false;
          let radioGroupName = null;
          let bounds = { "x0": -1, "y0": -1, "x1": -1, "y1": -1 };
          let clickFn = null;
          let clickParam = null;
          return {
            /**
              * 
            */
            "addPart": function (partName, offset, initalOrientation) {
              if (Object.hasOwn(parts, partName)) {
                throw new Error(`${name} already contains part '${partName}'`);
              }              
              let part = {
                "name": partName,
                "sprites": [],
                "orientation": (initalOrientation) ? initalOrientation : 0,
                "offset": offset
              }
              this.parts[partName] = part;
            },
            "addPartSprite": function (partName, sprite){
              if (parts.hasOwn (partName)){
                let part = parts[partName];
                part.sprites.push (sprite);
              }else {
                throw new Error (`${name} does not contain part ${partName}`);
              }
            },
            /**
             *  Gets the parts for this object. The parts are stored as an object
             * where the property of the part the part name.
             * @returns An object containing all the parts.
            */
            "getParts": function () {
              return parts;
            },
            /**
             * Get an individual part of the object.
             * @param {string} partName the name of the part to be returned
             * @returns the part {name, sprites, orientation, offset}
             */
            "getPart": function (partName) {
              if (Object.hasOwn(parts, partName)) {
                return parts[partName];
              } else {
                throw new Error(`${name} does not have part ${partName}.`);
              }
            },
            /**
              * Gets the rectangle that bounds the objects sprites, as they were
              * last drawn (due to zoom, camera position, etc.)
              * @returns the bounding rectangle {x0,y0,x1,y1}
            */
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
            "setBounds": function (spritebounds) {
              bounds = spritebounds;
            },
            /** Gets the sprites used to draw this Game Object. A sprite {color,
              * coords} is an array of polar coordinates {r,a} (radius and 
              * azimuth), and a color.                         
              * @returns {[Sprite]} An array of sprites.
            */
            "getSprites": function () {
              return sprites;
            },
            /**
              * Adds a sprite to the set of sprites used to draw the Game Object. A sprite
              * is an array of polar coordinates {r,a} (radius and 
              * azimuth), a color, fill (optional).
              * @param {Sprite} sprite the sprite to be added to the game object.                        
            */
            "addSprite": function (sprite) {
              sprites.push(sprite);
            },
            /**
              * Adds a sprite to this Game Object used when the object is hovered over with the
              * muouse. A sprite {color, coords} is an array of polar coordinates {r,a}
              * (radius and azimuth), a color, fill (optional).        
            */
            "addHoveredSprite": function (sprite) {
              hoveredSprites.push(sprite);
            },
            /**
              * This adds an addional sprite the set of sprites to be used when (if) the mouse presses on the game object.
              * @param {Sprite} sprite the sprite   
            */
            "addPressedSprite": function (sprite) {
              pressedSprites.push(sprite);
            },
            /**
              *  Gets the array of sprites used to draw this game object when the mouse hovers over it (if its
              *  interactive)
              *@returns An array of sprites. 
            */
            "getHoveredSprites": function () {
              return hoveredSprites;
            },
            /**
              * Gets the array of sprite sued to draw this game object when the mouse hovers over it (if its 
              * interactive)
              * @returns An array of sprites. 
            */
            "getPressedSprites": function () {
              return pressedSprites;
            },
            /**
              * Adds a text label to  be drawn with the sprite.
              * @param {string} text the label to attach to the sprite.
              * @param {Point} offset the position (from the center of the sprite) to place the label.
              * @param {string} color the "#RGB" color to draw the label.
              * @param {string} hoveredColor the "#RGB" color to draw the label if the mouse is hovering over it (if its
              * interactive).
              * @param {string} pressedColor the "RGB" color to draw the label if the mouse is pressing on it (if its
              * interactive).
            */
            "setLabel": function (text, offset, color, hoveredColor, pressedColor) {
              if (!text || !offset || !color) {
                throw new Error(`cannot set label for ${name} missing parameter.`);
              }
              label = {
                "text": text,
                "offset": offset,
                "color": color,
                "hoveredColor": hoveredColor,
                "pressedColor": pressedColor
              };
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

              return isInteractive;
            },
            /**
             * Gives the object permission to interact with the mouse.
             * @param {bool} interacts true if it can be interacted with, false otherwise.
             */
            "setAsInteractive": function (interacts) {
              isInteractive = (interacts === true);
              if (isInteractive !== true && interactive !== false) {
                throw new Error(`Interactive can only be true or false. ${interacts} is invalid`);
              }
            },
            /**
              * Gets the parameter that should be passed to the function that is called when this game object is
              * clicked by the mouse (it it is interactive).
              * @returns An object passed as a parameter to this object's click event.  
            */
            "getClickParam": function () {
              return clickParam;
            },
            /**
              * Sets the function that is called when this game object is clicked by the mouse (it it is interactive).
              * @returns An object passed as a parameter to this object's click event.  
            */
            "setClickFunction": function (fn, clickPram) {
              clickFn = fn;
              clickParam = clickPram;
            },
            /**
              * Gets the function that is called when this game object is clicked by the mouse (it it is interactive).
              * @returns the onclick function for this game object.
            */
            "getClickFunction": function (fn) {
              return clickFn;
            },
            /**
             * Used to determine if this game object should act as a toggle when it is clicked on by the mouse (if it 
             * is interactive).
             * @returns true if it acts as a toggle, false if it acts like a normal "button"/gameobject. 
            */
            "isToggle": function () {
              return isToggle;
            },
            /**
             * Gets the wether or not the game object has been "toggled" by a mouse click.
             * @returns true if it is in the "on/active" state, false otherwise.
             */
            "isToggled": function () {
              return isToggled;
            },
            /**
             * Sets the behaviour of the game object when pressed. If toggleable, it remains "on" after being pressed,
             * otherwise it behaves like a normal "button"/gameobject and is goes back to normal after being clicked.
             * @returns true of it acts like a toggle switch, false if it acts like a normal "button".
             */
            "setToggleable": function () {
              isToggle = true;
            },
            /** sets the state of the "button".  If true it will be drawn as "pressed" even after being released.
             * @param {bool} state true if it acts like a toggle "button", false if it acts like a normal "button".
            */
            "setToggled": function (state) {
              isToggled = state;
            },
            /** Gets wether or not this game object belongs to a group of other objects that are mutually exclusive: If 
              * Meaning: If one of them is pressed, the others cannot be (and if one was it isn't anymore if this one
              * is pressed.
              * @returns true if is part of a mutally exclusive group, false if it is independant.
            */
            "inRadioGroup": function () {
              return inRadioGroup;
            },
            /** Gets the name of the group of mutually exclusive objects to which this object belongs. 
             * @returns The name of the group.
            */
            "getRadioGroup": function () {
              if (!inRadioGroup) {
                throw new Error(`{name} is not part of a Radio Group.`);
              } else {
                return radioGroupName;
              }
            },
            /** If this the selection (clicking) of this game object should be mutually exclusive with other objects,
              *It must be assigned to a "Radio Group" which contains the other game objects that cannot be seleected
              *if and when this one is selected.
              @param {string} groupName the name of the group of mutually exclusive objects to which this object
               belongs.
            */
            "setRadioGroup": function (groupName) {
              radioGroupName = groupName;
              inRadioGroup = true;
            }
          }
        })();
      }
    }
  }
})();