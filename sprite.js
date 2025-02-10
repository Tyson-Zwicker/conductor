const Sprite = function (points, color, filled, lineWidth) {
  if (points.length % 2 !== 0) throw new Error('Sprite.constructor -> points must be numbers pairs: (x,y,..)');
  _points = points;
  _color = color;
  _filled = filled;
  _lineWidth = lineWidth;
  _path = undefined;
  return {
    //Do this before you try to draw the sprite, or check for mouse interaction..
    "setPath": function (centerPoint, rotation, scale) {
      _path = new Path2D();
      let firstPoint = true;
      _points.forEach(point => {
        let p = point;
        if (scale) p = p.scale(scale);
        if (rotation) p = p.rotate(rotation);
        p = p.add(centerPoint);
        if (firstPoint) {
          firstPoint = false;
          _path.moveTo(p.getX(), p.getY());
        } else {
          _path.lineTo(p.getX(), p.getY());
        }
        _path.closePath();
      });
    },
    
    "getPath": function () {
      return _path
    },
    "isMouseTouching": function (context, mouseX, mouseY){
      return context.isPointIn (mouseX, mouseY);
    },
    "draw": function (context) {
      if (!_path) throw Error('no path defined for sprite.');
      if (_filled) {
        context.fillStyle = sprite.color;
        context.fill(path);
      } else {
        context.strokeStyle = sprite.color;
        context.lineWidth = _lineWidth;
        context.stroke(_path);
      }
    },

    "toString": function(){
      return `color ${_color}, filled ${_filled}, points ${_points} path:${_path}`;
    }
  }
}