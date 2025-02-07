const conductor = (function () {
  var objects = {};
  var canvas = null;
  let ctx = null;
  var backgroundColor = null;
  var running = false;    //Is the mainloop supposed to keep going?
  var frameRate = null;
  var oldTime = new Date();
  var time = new Date();
  var zoomOnWheel = false;
  var deltaTime = 0;
  var frameNumber = 0;
  const ZOOM_FACTOR = 10;
  const DEFAULT_LINE_WIDTH = 1;
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
  //TODO: USE FOR CONSITANCY..
  function makeSprite (coords, color, fill, convert) {
    return {
      "color": color,
      "fill": fill,
      // TODO :coords..depending on conversion.
    }
  }
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
  function getTextHeight() {
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
    if (isNaN(x) || isNaN(y)) throw new Error(`Cannot convert (${x},${y}) to a polar coordinate.`);
    return { a: Math.atan2(y, x), r: Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) }
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
  /*
  ------------------------------- Draw Helper Functions -------------------------------
  */
  function drawObject_buildSpriteBounds(spriteBounds, spritePoint) {
    let adjustedSpriteBounds = spriteBounds;
    adjustedSpriteBounds.x0 = (spriteBounds.x0 === undefined || spriteBounds.x0 > spritePoint.x) ? spritePoint.x : adjustedSpriteBounds.x0;
    adjustedSpriteBounds.x1 = (spriteBounds.x1 === undefined || spriteBounds.x1 < spritePoint.x) ? spritePoint.x : adjustedSpriteBounds.x1;
    adjustedSpriteBounds.y0 = (spriteBounds.y0 === undefined || spriteBounds.y0 > spritePoint.y) ? spritePoint.y : adjustedSpriteBounds.y0;
    adjustedSpriteBounds.y1 = (spriteBounds.y1 === undefined || spriteBounds.y1 < spritePoint.y) ? spritePoint.y : adjustedSpriteBounds.y1
    return adjustedSpriteBounds;
  }
  function drawObject_part(object, objectCenterPoint, part) {
    //TODO: THIS IS THE TYPE OF SHIT THAT MAKES THE "ROTATEPOINT", "ADDPOINT" and "SCALE" functions a good idea..
    let partCenterPoint = {
      "x": objectCenterPoint.x + Math.cos(part.offset.a + object.getDirection()) * part.offset.r * camera.zoom,
      "y": objectCenterPoint.y + Math.sin(part.offset.a + object.getDirection()) * part.offset.r * camera.zoom
    }
    part.sprites.forEach(sprite => {
      let firstPoint = true;
      ctx.beginPath();
      if (sprite.fill) {
        ctx.fillStyle = sprite.color;
      } else {
        ctx.strokeStyle = sprite.color;
        ctx.lineWidth = DEFAULT_LINE_WIDTH;
      }
      sprite.coords.forEach(polarCoord => {        
        //TODO: THIS IS THE TYPE OF SHIT THAT MAKES THE "ROTATEPOINT", "ADDPOINT" and "SCALE" functions a good idea..
        let spritePoint = {
          "x": partCenterPoint.x + Math.cos(polarCoord.a + object.getDirection()+part.direction) * polarCoord.r * camera.zoom,
          "y": partCenterPoint.y + Math.sin(polarCoord.a + object.getDirection()+part.direction) * polarCoord.r * camera.zoom
        }
        if (firstPoint) {
          ctx.moveTo(spritePoint.x, spritePoint.y);
          firstPoint = false;
        } else {
          ctx.lineTo(spritePoint.x, spritePoint.y);
        }
      });
      ctx.closePath();
      if (sprite.fill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    });
  }
  function drawObject_label(object, objectCenterPoint, label) {
    let labelColor = undefined; //depends on game object's interaction with the mouse..
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
  }
  function drawObject_sprites(object, spriteSet, objectPosition, objectCenterPoint) {
    //spriteBounds will capture the furthest point a sprite is drawn from the game object's center, 
    //which will be used to make the box used for mouse interaction as accurate as possible.
    //YES I KNOW- This is a "SIDE AFFECT" _BUT_ we're doing the math here anyway, so why do it again somewhere else?
    let spriteBounds = { x0: undefined, y0: undefined, x1: undefined, y1: undefined };
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
          //TODO: Again : Scale, AddPoint functions...
          let rotatedScaledPolar = { "a": polarCoordinate.a + object.getDirection(), "r": polarCoordinate.r * camera.zoom };
          spritePoint = fromPolar(rotatedScaledPolar);
          spritePoint = translate(spritePoint, objectCenterPoint);
        } else {
          //TODO: Again : Scale, AddPoint functions...
          spritePoint = fromPolar(polarCoordinate);
          spritePoint = translate(spritePoint, objectCenterPoint);
        }
        spriteBounds = drawObject_buildSpriteBounds(spriteBounds, spritePoint); // WARNING: SIDE AFFECT.
        if (firstPoint) {
          ctx.moveTo(spritePoint.x, spritePoint.y);
          firstPoint = false;
        } else {
          ctx.lineTo(spritePoint.x, spritePoint.y);
        }
      }); //Next point..
      ctx.closePath();
      if (sprite.fill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    });//next sprite..
    return spriteBounds; //Is really a side affect if it is the only thing returned from the function.. technically.. drawing stuff is a side affect.
  }
  function drawObject(object, objectPosition, objectCenterPoint) {
    //Sprite set depends on the objects current relationship with the mouse.
    let spriteSet = undefined;
    if (object.isToggled() || object === pressedObject) {
      spriteSet = object.getPressedSprites();
    } else if (object === hoveredObject) {
      spriteSet = object.getHoveredSprites();
    } else {
      spriteSet = object.getSprites();
    }
    let spriteBounds = drawObject_sprites(object, spriteSet, objectPosition, objectCenterPoint);
    object.setBounds(spriteBounds);
    let label = object.getLabel();
    if (label) {
      drawObject_label(object, objectCenterPoint, label);
    }
    let parts = object.getParts();
    Object.getOwnPropertyNames(parts).forEach(partName => {
      let part = parts[partName];
      drawObject_part(object, objectCenterPoint, part);
    });
  }
  /**
   * Draws all of the game objects on the canvas which fit. 
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
        drawObject(object, objectPosition, objectCenterPoint);
      }
      else {
        object.setOnScreen(false);
      }
    });
  }
  /**
   * Checks all the game objects that are "interactive" to see of the mouse if hovering over them,
   * or if they have been clicked on.  If they have been clicked on, it will call that object's click
   * function, and pass it parameters associated with the object, if any have been defined.
   */
  function checkMouseInteractions() {
    let objectInteractedWith = false;
    Object.getOwnPropertyNames(objects).forEach(objectName => {
      let object = objects[objectName];
      if (object.isInteractive()) {
        if (object.isOnScreen()) {
          if (isBounded(mouse, object.getBounds())) {
            objectInteractedWith = true;
            if (mouse.button === false && hoveredObject !== object) { //a _newly_ hovered object
              hoveredObject = object;
              pressedObject = null;
            }
            else if (mouse.button && hoveredObject === object) {
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
      hoveredObject = null;
      pressedObject = null;
    }
  }
  function mainLoop() {
    oldTime = time;
    time = new Date();
    deltaTime = (time - oldTime) / 1000;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    checkMouseInteractions();
    drawObjects();
    Animate(deltaTime);
    frameNumber++
    if (running) setTimeout(mainLoop, frameRate);
  }
  function Animate() {
    Object.getOwnPropertyNames(objects).forEach(objectName => {
      let object = objects[objectName];
      if (!object.getPosition().isFixed) {
        let x, y;
        if (object.getUsesSteering()) {
          //TODO:  scale, addpoint... 
          x = object.getPosition().x + Math.cos(object.getDirection()) * object.getVelocity() * deltaTime;
          y = object.getPosition().y + Math.sin(object.getDirection()) * object.getVelocity() * deltaTime;
        } else {
          x = object.getPosition().x + object.getVelocity().x * deltaTime;
          y = object.getPosition().y + object.getVelocity().y * deltaTime
        }
        object.setGameCoordinates(x, y);
        //TODO: scale, addpoint..
        object.setDirection(object.getDirection() + object.getSpin() * deltaTime);
      }
    });
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
      //TODO: consider adding a "reinitialize" param that makes this ok... maybe they DO need to re-initialize for some reason..
      if (initialized) throw new Error('You have tried to initialize twice. ');
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
        if (zoomOnWheel) {           //zoom of -1 make bigger (zoom in) 1 make smaller (zoom out)
          let change = -Math.sign(e.deltaY) * camera.zoom / ZOOM_FACTOR;
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
      if (!frameRateMillis || Number.isNaN(frameRateMillis)) throw new Error(`Invalid frame rate ${frameRateMillis}`);
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
      ctx.font = (bold) ? `bold ${fontSize}px monospace` : `${fontSize}px monospace`;
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
     * @param {number} direction the initial orientation of the part in radians.
     */
    "addPartTo": function (name, partname, offset, direction) {
      if (!Object.hasOwn(objects, name)) throw new Error(`${name} does not exist.`);
      let object = objects[name];
      let polarOffset = toPolar(offset.x, offset.y);
      object.addPart(partname, polarOffset, direction);
    },
    /** Adds a sprite to a part.
    * @param {string} name - the game object's name
    * @param {string} partName - the name of the part
    * @param {Array.Point} points - cartesian points that define the shape of the sprite
    * @param {string} color -the "#RGB" color of the sprite
    * @param {bool} fill - true if sprite is filled, false if not.
    */
    "addSpriteToPart": function (name, partname, spritePoints, color, fill) {
      if (!Object.hasOwn(objects, name)) throw new Error(`${name} does not exist.`);
      let object = objects[name];
      if (spritePoints.length % 2 !== 0) {
        throw new Error('sprites must be pairs of numbers {x,y}');
      }
      let polarSpritePoints = [];
      for (let i = 0; i < spritePoints.length; i = i + 2) {
        polarSpritePoints.push(toPolar(spritePoints[i], spritePoints[i + 1]));
      }
      let polarizedSprite = {
        "color": color,
        "fill": fill,
        "coords": polarSpritePoints
      }
      object.addPartSprite(partname, polarizedSprite);
    },
    /** 
     * Adds a sprite to this object
     * @param {string} name unique name of the GameObject.
     * @param {[Numbers]} points A series of
     *  x,y  coordinates.
     * @param {String} color #RGB color.
     * @param {bool} fill, fills the sprite with the specified color, if true.  If false, draws the outline only.
     */
    "addSpriteTo": function (name, points, color, fill) {
      if (!Object.hasOwn(objects, name)) throw new Error(`Cannot add sprite.  '${name}' does not exist.`);
      if (points.length % 2 !== 0) throw Error(`Uneven number of sprite points: sprite points must pairs of numbers (ie. coordinates: x,y,...)`);
      let polarCoordinates = [];
      for (let i = 0; i < points.length; i = i + 2) polarCoordinates.push(toPolar(points[i], points[i + 1]));
      objects[name].addSprite({ "color": color, "coords": polarCoordinates, "fill": fill });
    },
    /** 
     * Adds a sprite to this object to use when hovered.
     * @param {string} name unique name of the GameObject.
     * @param {[Numbers]} points A series of
     *  x,y  coordinates.
     * @param {String} color #RGB color.
     */
    "addHoveredSpriteTo": function (name, points, color, fill) {
      if (!Object.hasOwn(objects, name)) throw new Error(`Cannot add sprite.  '${name}' does not exist.`);
      if (points.length % 2 !== 0) throw Error(`Uneven number of sprite points: sprite points must pairs of numbers (ie. coordinates: x,y,...)`);
      let polarCoordinates = [];
      for (let i = 0; i < points.length; i = i + 2) polarCoordinates.push(toPolar(points[i], points[i + 1]));
      objects[name].addHoveredSprite({ "color": color, "coords": polarCoordinates, "fill": fill });
    },
    /** 
     * Adds a sprite to this object to be used when pressed or toggled.
     * @param {string} name unique name of the GameObject.
     * @param {[Numbers]} points A series of
     *  x,y  coordinates.
     * @param {String} color #RGB color.
     */
    "addPressedSpriteTo": function (name, points, color, fill) {
      if (!Object.hasOwn(objects, name)) throw new Error(`Cannot add sprite.  '${name}' does not exist.`);

      if (points.length % 2 !== 0) throw Error(`Uneven number of sprite points: sprite points must pairs of numbers (ie. coordinates: x,y,...)`);
      let polarCoordinates = [];
      for (let i = 0; i < points.length; i = i + 2) polarCoordinates.push(toPolar(points[i], points[i + 1]));

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
      if (!Object.hasOwn(objects, name)) throw new Error(`${name} does not exist.`);
      objects[name].setLabel(text, offset, color, hovered, pressed);
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
      if (!Object.hasOwn(objects, name)) throw new Error(`cannot set position: ${name} does not exist.`);
      if (fixed) {
        objects[name].setFixedCoordinates(x, y);
      } else {
        objects[name].setGameCoordinates(x, y);
      }
    },
    "setVelocityOf": function (name, vx, vy) {
      if (!Object.hasOwn(objects, name)) throw new Error(`cannot set position: ${name} does not exist.`);
      objects[name].setVelocity(vx, vy);
    },
    "setVelocityByDirectionOf": function (name, velocity) {
      if (!Object.hasOwn(objects, name)) throw new Error(`cannot set position: ${name} does not exist.`);
      let vx = Math.cos(objects[name].getDirection()) * velocity;
      let vy = Math.sin(objects[name].getDirection()) * velocity;
      objects[name].setVelocity(vx, vy);

    },
    /**
       * Sets the direction/orientation of a game object, in radians.
       * @param {number} direction the direction, in radians.
    */
    "setDirectionOf": function (name, direction) {
      if (!Object.hasOwn(objects, name)) throw new Error(`cannot set position: ${name} does not exist.`);
      objects[name].setDirection(direction);
    },
    "setSpinOf": function (name, spin) {
      if (!Object.hasOwn(objects, name)) throw new Error(`cannot set position: ${name} does not exist.`);
      objects[name].setSpin(spin);
    },
    "setUsesSteering": function (name, usesSteering) {
      if (!Object.hasOwn(objects, name)) throw new Error(`cannot set position: ${name} does not exist.`);
      objects[name].usesSteering(usesSteering);
    },
    /**
      * Check for existence of a GameObject
      * @param {string} name - the name of the unique name of the GameObject.
      * @returns {bool} true if GameObject by that name exists, otherwise
      * false.
    */
    "has": function (name) {
      if (!Object.hasOwn(objects, name)) throw Error(`${name} does not exist.`);
      return Object.hasOwn(objects, name);
    },
    /**
      * Attaches the object to a "radioGroup" - when it is toggled, all the other objects in the same radio group 
      * are untoggled.  If the radio group does not exist, it will be created.
      * @param {string} objectName the game object to attach to the group.
      * @param  {string} the name of the "radioGroup" that this object should become a member of.
    */
    "registerWithRadioGroup": function (objectName, groupName) {
      if (!Object.hasOwn(objects, objectName)) throw new Error(`${objectName} does not exist.`);
      if (!Object.hasOwn(radioGroups, groupName)) {
        radioGroups[groupName] = [];
      }
      radioGroups[groupName].push(objects[objectName]);
      objects[objectName].setRadioGroup(groupName);
      objects[objectName].setAsInteractive(true);
    },
    /**
      * Defines the action to be taken if this object is clicked on.
      * @param {string} objectName the object that should call the function when  clicked.
      * @param {function} fn the function that shouldbe called when the object is clicked.
      * @param {object} params (Optional) An object to send the function. Allows for function to be used on multiple
      * game objects.
    */
    "setClickFunctionOf": function (objectName, fn, params) {
      if (!Object.hasOwn(objects, objectName)) throw new Error(`${objectName} does not exist.`);
      objects[objectName].setClickFunction(fn, params);
      objects[objectName].setAsInteractive(true);
    },
    /**
      * Calling this function will tell the game object to act as a toggle switch, when clicked.
      * @param {string} objectName 
    */
    "setAsToggle": function (objectName) {
      if (!Object.hasOwn(objects, objectName)) throw new Error(`${objectName} does not exist.`);
      objects[objectName].setAsInteractive(true);
      objects[objectName].setToggleable(true);
    },
    /*
              |---------------------  CREATE A GAME OBJECT ---------------------|
    */
    /**
      * Creates a game object
      * @param {string} objectName - what you want to call it. Must be unique.
    */
    "create": function (objectName) {
      if (Object.hasOwn(objects, objectName)) throw Error(`${objectName} already exists.`);
      objects[objectName] = new (function () {
        let name = objectName;
        const sprites = [];//Sprite {name, coords, color, fill}
        const hoveredSprites = [];
        const pressedSprites = [];
        const parts = {};
        let label = null;
        let gameX = -1;
        let gameY = -1;
        let fixedX = -1;
        let fixedY = -1;
        let velX = 0;//<-- if steering is not used.
        let velY = 0;//<-- if steering is not used.
        let vel = 0; //<--if steering is used.
        let positionIsFixed = false;
        let spin = 0;
        let dir = 0;
        let usesSteering = true;
        let onScreen = false;
        let bounds = { "x0": -1, "y0": -1, "x1": -1, "y1": -1 };
        let isInteractive = false;
        let isToggle = false;
        let isToggled = false;
        let inRadioGroup = false;
        let radioGroupName = null;
        let clickFn = null;
        let clickParam = null;
        return {
          /**
            * Add a part to the game object. A part is a game object that is part of game object (that is, it moves
            * with the game object, and reflects the rotation of the game object) but is capable of independantly
            * rotating.  It has its own set of sprites. Parts are not <currently> interactive with the mouse.
            * @param {string} partName The name of the part. This must be unique to the game object, though the name
            * may occur in more than one game object.
            * @param {Polar coord} offset The position of the part relative to the center of the game object.
            * @param {number} initialOrientation (optional) The direction the part is initially facing. If omitted the
            * part will be facing "forward" (0 radians).
          */
          "addPart": function (partName, offset, initialDirection) {
            if (Object.hasOwn(parts, partName)) throw new Error(`${name} already contains part '${partName}'`);
            let part = {
              "name": partName,
              "sprites": [],
              "direction": (initialDirection) ? initialDirection : 0,
              "offset": offset
            }
            parts[partName] = part;
          },
          "addPartSprite": function (partName, sprite) {
            if (!Object.hasOwn(parts, partName)) throw new Error(`${name} does not contain part ${partName}`);
            let part = parts[partName];
            part.sprites.push(sprite);
          },
          /**
           * Gets the parts for this object. The parts are stored as an object
           * where the property of the part the part name.
           * @returns An object containing all the parts.
          */
          "getParts": function () {
            return parts;
          },
          /**
           * Get an individual part of the object.
           * @param {string} partName the name of the part to be returned
           * @returns the part {name, sprites, direction, offset}
           */
          "getPart": function (partName) {
            if (!Object.hasOwn(parts, partName)) throw new Error(`${name} does not have part ${partName}.`);
            return parts[partName];
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
          * Gets the label to be drawn with the sprite.
          * @return the label {text, offset, color}
          */
          "getLabel": function () {
            return label;
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
            if (!text || !offset || !color) throw new Error(`cannot set label for ${name} missing parameter.`);
            label = { "text": text, "offset": offset, "color": color, "hoveredColor": hoveredColor, "pressedColor": pressedColor };
          },
          /**
           * Gets the orientation/direction the object is facing- In Radians.
           * @returns the direction in radians.
           */
          "getDirection": function () {
            return dir;
          },
          /**
          * Sets the direction/orientation of the object in Game Cooridnates.
          * @param {number} angle the direction in radians.             
          */
          "setDirection": function (angle) {
            dir = angle;
          },

          /**
          * Gets the objects position in Game Coordinates
          * @returns {Point} Game coordinates.
          */
          "getPosition": function () {
            return (positionIsFixed) ? { "x": fixedX, "y": fixedY, "isFixed": true } : { "x": gameX, "y": gameY, "isFixed": false };
          },
          /**
           * Sets the position of the object in Game Coordinates 
           * @param {number} x the x coordinate where the object is in the game world.
           * @param {number} y  the y coordinate where the object is in the game world.
           */
          "setGameCoordinates": function (x, y) {
            gameX = x;
            gameY = y;
            positionIsFixed = false;
          },
          /**
           * Sets the position of the object in fixed Screen Coordinates.
           * @param {number} the x coordinate of the object on the screen.
           * @param {number} the y coordinate of the object on the screen.
           */
          "setFixedCoordinates": function (x, y) {
            fixedX = x;
            fixedY = y;
            positionIsFixed = true;
          },
          "getVelocity": function () {
            return (usesSteering) ? vel : { "x": velX, "y": velY }
          },
          "setVelocity": function (velocity) {
            vel = velocity;
          },
          "setComponentVelocity": function (vx, vy) {
            velX = vx;
            velY = vy;
          },
          "setSpin": function (radiansPerSecond) {
            spin = radiansPerSecond;
          },
          "getSpin": function () {
            return spin;
          },
          "usesSteering": function (steer) {
            usesSteering = (steer) ? steer : true;
          },
          "getUsesSteering": function () {
            return usesSteering;
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
            if (interacts !== true && interacts !== false) throw new Error(`Interactive can only be true or false. ${interacts} is invalid`);
            isInteractive = (interacts === true);
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
            if (!inRadioGroup) throw new Error(`{name} is not part of a Radio Group.`);
            return radioGroupName;
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
})();