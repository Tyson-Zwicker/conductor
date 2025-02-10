
const Point = function (x, y) {
  if (isNaN(x)) throw Error(`Point.constructor: ${x} is not a number.`);
  if (isNaN(y)) throw Error(`Point.constructor: ${y} is not a number.`);
  const _x = x;
  const _y = y;
  const convertToRadians = 180/Math.PI;
  return {
    "P": function () { return priv(); },
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
      return new Point(_x - point.X(), _y - point.Y());
    },
    "rotate": function (degrees) {
      let radians = degrees * convertToRadians;
      return new Point(
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