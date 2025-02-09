const Sprite = function (points, color, filled, lineWidth) {
  if (points.length%2!==0) throw new Error ('Sprite.constructor -> points must be numbers pairs: (x,y,..)');
  _points = points;
  _color = color;
  _filled = filled;
  _lineWidth = lineWidth;
  return {
    "getScreenBounds": function (){
      if (!_currentBounds) throw Error ('You have to draw the sprite at least once to know this.');
      return _currentBounds();
    },
    "draw": function (context, centerPoint, rotation, scale) {
      
      let firstPoint = true;
      if (_filled) {
        context.fillStyle = sprite.color;
      } else {
        context.strokeStyle = sprite.color;
        context.lineWidth = _lineWidth;
      }
      context.beginPath();
      _points.forEach(point => {
        let p = point;
        if (scale) p = p.scale(scale);
        if (rotation) p = p.rotate(rotation);
        p = p.add(centerPoint);
        if (firstPoint) {
          firstPoint = false;
          context.moveTo(p.getX(), p.getY());
        } else {
          context.lineTo(p.getX(), p.getY());
        }
      });
      context.closePath();
      console.log (context);
      if (_filled) {
        context.stroke();
      } else {
        context.fill();
      }
    }
  }
};
const Point = function (x, y) {
  if (isNaN(x)) throw Error(`Point.constructor: ${x} is not a number.`);
  if (isNaN(y)) throw Error(`Point.constructor: ${y} is not a number.`);
  const _x = x;
  const _y = y;
  return {
    "X": function () {
      return _x;
    },
    "Y": function () {
      return _y;
    },
    "scale": function (scalar) {
      if (isNan(scalar)) throw Error(`Point.scale: scalar ${scalar} is not a number.`);
      return new Point(_x * scale, _y * scale);
    },
    "add": function (point) {
      return new Point(_x + point.X(), _y + point.Y());
    },
    "sub": function (point) {
      return new Point ( _x - point.X(),_y - point.Y());
    },
    "rotate": function (radians) {
      return new Point (
        _x * Math.cos(radians) - _y * Math.sin(radians),
        _y * Math.sin(radians) + _y * Math.cos(radians)
      );
    },
    "distanceTo": function (point) {
      return Math.sqrt(Math.pow(_x - point.X(), 2) + Math.pow(_y - point.Y(), 2));
    },
    "toString": function () {
      return `Point->(${_x},${_y})`;
    }
  }
};