define(["PIXI","utils"], function(PIXI,utils) {
  "use strict";
  
  var Circle  = utils.extend(PIXI.Graphics, function(x,y, radius, color) {
    PIXI.Graphics.call(this);
    this.lineStyle(0)
        .beginFill(color)
        .drawCircle(0,0,radius)
        .endFill();
    this.cacheAsBitmap = true;
    this.position.x = x;
    this.position.y = y;
  });
  Circle.prototype.update = utils.updateFunction;
  
  return Circle;
});