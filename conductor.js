/*
The core of the game engine.
This runs immediately, establishes event handlers for keyboard and mouse, and 
calls the init() function, which must exist in the html file, and starts a main
loop in the run() function, which must also in the html.
Finally, it returns an object called the "conductor".  All the "things" in your
program that should interact with the user, via mouse or keyboard or be drawn on
the canvas must be registered with the conductor so they can automatically be
made aware of events that effect them, and be animated in the main loop.
*/

const conductor = (function () {
  /*contains all of the things in the game, buttons, game objects, etc.*/
  var objects = {};
  var canvas = null;
  let ctx = null;
  var screenSizeX = null;
  var screenSizeY = null;
  /**
  * Converts a cartesian coordinate to a polar coordinate.
  * @param {number} x - the coordinate along
  *  the horizontal (x) axis.
  * @param {number} y - the coordinate along 
  * the vertical (y) axis.
  * @returns {PolarCoordinate} r,a - the radius and azimuth (angle)
  */
  function toPolar(x, y) {
    return {
      a: Math.atan2(y0, x0),
      r: Math.sqrt(Math.pow(x0, 2) + Math.pow(y0, 2))
    }
  }
  function fromPolar(radius, angle) {
    return { "x": Math.cos(angle) * radius, "y": Math.sin(angle) * radius };
  }
  return {
    /**
     * Creates the canvas, attach event handlers..
     * @param {string} bgColor #RGB canvas background color.
     */
    "init": function (bgColor) {
      let color = (bgColor) ? bgColor : '#000';
      let body = document.getElementsByTagName('body')[0];
      body.style.margin = "0px";
      canvas = document.createElement('canvas');
      canvas.style.padding = "0px 0px 0px 0px";
      canvas.style.margin = "0px 0px 0px 0px";
      canvas.style.border = "0px";
      console.log(body);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      body.appendChild(canvas);
    },
    /**
     * Draws all the game objects on the canvas.
     */
    "draw": function () {
      objects.forEach(object => {
        object.getSprites().forEach(sprite => {
          //a sprite is an object{color, coords}
          ctx.fillStyle = sprite.color;
          ctx.beginPath();
          let firstPoint = true;
          ctx.moveTo(point.x, point.y);
          sprite.coords.forEach(polarCoordinate => {
            let rotated = {
              "r": polarCoordinate.r,
              "a": polarCoordinate.a + object.getOrientation()
            };
            let point = fromPolar(rotated);
            let position = object.getPosition();
            point.x += position.x;
            point.y += position.y;
            if (firstPoint) {
              ctx.moveTo(point.x, point.y);
              firstPoint = false;
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.closePath();
          ctx.fill();
        });
      });
    },
    /**
     * Gets the size of the window.
     * @returns {Size} the width and height {w,h}
     */
    "screenSize": function () {
      return { "w": canvas.width, "h": canvas.height };
    },
    /**
     * Gets the coordinate of the center of the window.
     * @returns {Point} {x,y}
     */
    "screenCenter": function () {
      return { "x": canvas.width / 2, "y": canvas.height / 2 };
    },
    /** 
     * Adds a sprite to this object
     * @param {string} name unique name of the GameObject.
     * @param {[Numbers]} points A series of
     *  x,y  coordinates.
     * @param {String} color #RGB color.
     */
    "addSpriteTo": function (name, points, color) {
      if (points.length % 2 !== 0) {
        throw Error(`points must be pairs of numbers`);
      }
      let polarCoordinates = [];
      for (let i = 0; i < points.length; i++) {
        coords.push(toPolar(points[i], points[i + 1]));
      }
      objects[name].sprites.push({
        "color": color,
        "coords": polarCoordinates
      });
    },
      /** 
     * Set the position of game object, in Game Coordinates.
     * @param {Number} x the x coordinate.
     * @param {Number} y the y coordinate.
     */
    "setPositionOf": function (name, x, y) {
      if (!has(name)){
        throw new Error (`cannot set position: ${name} does not exist.`);
      }else{
        objects[name].setPosition (x,y);
      }
    },
    /**
     * Sets the orientation of a game object, in radians.
     * @param {number} orientation the orientation/direction, in radians.
     */
    "setOrientationOf":function (name, orientation){
      if (!has(name)){
        throw new Error (`cannot set position: ${name} does not exist.`);
      }else{
        objects[name].setOrientation (orientation);
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
        throw Error(`${n} already exists.`);
      } else {
        objects[name] = new (function () {
          const sprites = [];
          const gx = 0;
          const gy = 0;
          const orientation = 0;
          return {
            /** Gets the sprites used to draw this Game Object. A sprite {color,
             *  coords} is array of polar coordinates {r,a} (radius and 
             * azimuth), and a color.                         
             * @returns {[Sprite]} An array of sprites 
             */
            "getSprites": function () {
              return sprites;
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
            }
          }
        })();
      }
    }
  }
})();