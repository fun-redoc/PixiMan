requirejs(["jquery","PIXI", 
           "utils", "GameObject", "Rect", "Circle"], 
          function ($,PIXI, utils, GameObject, Rect, Circle) {
  "use strict";
    
  var windowWidth = $(window).width();
  var windowHeight = $(window).height();
  

  // initialize renderer
  var renderer = new PIXI.autoDetectRenderer(windowWidth,windowHeight,{transparent:true, antialias: true });
  var resize = function() {
    renderer.resize($(window).width(), $(window).height());
  }
  window.onresize = resize;

  $("body").append(renderer.view);

  var level1 = [
      "XXXXXXXXXX",
      "X XXXXX XX",
      "X  gXXX XX",
      "X X XXXgXX",
      "XXX XXX XX",
      "X        X",
      "XX XXXX XX",
      "XX XXXX XX",
      "XX  @   XX",
      "XXX XXgXXX",
      "XXXXXXXXXX"
    ];
  
  var tile = function(graphics, color, width, height, x,y) {
    var gap = 2;
    graphics.lineStyle(0)
    graphics.beginFill(color)
    graphics.drawRect(x+gap,y+gap,width-gap, height-gap)
    graphics.endFill();
  }
  
  var initiWorld = function(level) {
    var worldWidth = level[0].length, worldHeight = level.length;
    var _calcUid = function(x,y) { return x+worldWidth*y;}
    var calcUid = function() { return _calcUid(this.x,this.y);}
    var walkDir = {};
    var step = 3;
    walkDir["left"]  = {x:-1,y:0};
    walkDir["right"] = {x:+1,y:0};
    walkDir["down"]  = {x:0,y:+1};
    walkDir["up"]    = {x:0,y:-1};
    // TODO put all man initialization in a initMan function (man "constructor")
    var tryChangingDirection = function(walls, ghosts, direction, dt) {
      var dir = walkDir[direction];
      var newWalkX = this.destX + dir.x;
      var newWalkY = this.destY + dir.y;
      var tentativeNewPositionUid = _calcUid(newWalkX,newWalkY);
      // check if place already occupied by a wall
      if(!walls[tentativeNewPositionUid]) {
        // place is not occupied movement is possible
        this.destX = newWalkX;
        this.destY = newWalkY;
        this.dir = dir;
      } 
      // TODO do the same for the ghost, but game over when hit
      return this;
    }
    var walk = function(dt) {
      if(!this.dir) return this;
      var newX = this.x + dt*step*this.dir.x;
      var newY = this.y + dt*step*this.dir.y;
      if( utils.distSqr(this.x, this.y, this.destX, this.destY) < utils.distSqr(this.x, this.y, newX, newY)) {
          // distance to the destination point is less the step, thus only go to the destination
          this.x = this.destX;
          this.y = this.destY;
          // and stop
          this.dirt = null;
      } else {
          // step
          this.x = newX;
          this.y = newY;
      }
    }
    return level.reduce(function(acc, row, i) {
      for( var j = 0; j < row.length; j++) {
        var item = row[j];
        if( item === 'X' ) acc.walls[_calcUid(j,i)] = {x:j,y:i};
        if( item === '@' ) acc.man = {x:j,y:i, destX:j,destY:i, tryChangingDirection:tryChangingDirection, walk:walk};
        if( item === 'g' ) acc.ghosts.push({uid:_calcUid(j,i),x:j,y:i});
        if( item === ' ' ) acc.coins.push({x:j,y:i});
      }
      return acc;
    },{dimesions:{w:worldWidth, h:worldHeight}, walls:[], coins:[], ghosts:[], man:null});
  };
  
  var initialStage = function(stageWidth, stageHeight, initialWorld) {
    console.log("initialWorld", initialWorld);
    var tilesMaxX = initialWorld.dimesions.w;
    var tilesMaxY = initialWorld.dimesions.h;
    
    var stageBorderX = 10;
    var stageBorderY = 10;
    var backgroundWidth = stageWidth - 2*stageBorderX;
    var backgroundHeight = stageHeight - 2*stageBorderY;
    var tileWidth = backgroundWidth / tilesMaxX;
    var tileHeight = backgroundHeight / tilesMaxY;
    var color = 0xBBDDAA;
    
    var stage = new GameObject();
    stage.borderX = stageBorderX;
    stage.borderY = stageBorderY;
    stage.tileWidth = tileWidth;
    stage.tileHeight = tileHeight;
    stage.numTilesX = tilesMaxX;
    stage.numTilesY = tilesMaxY;
    
    var background = new PIXI.Graphics();
    background.position.x = stageBorderX;
    background.position.y = stageBorderY; 
    stage.addChild(background);
    
    
    var myTile = tile.bind(null, background, color, tileWidth, tileHeight);
    
    initialWorld.walls.forEach(function(wall) {
        var x = wall.x*tileWidth, y = wall.y*tileHeight;
        myTile(x,y);
    });
    
    stage.ghosts = {};
    
    initialWorld.ghosts.forEach(function(ghost) {
      var x = stageBorderX + ghost.x*tileWidth, y = stageBorderY + ghost.y*tileHeight;
      // create ghost view
      var ghostView = new PIXI.Graphics();
      ghostView.lineStyle(0);
      ghostView.beginFill(0xFFDDAA);
      ghostView.drawPolygon(tileWidth/2,0, tileWidth,tileHeight, 0,tileHeight, tileWidth/2, 0);
      ghostView.endFill();
      ghostView.position.x = x;
      ghostView.position.y = y;
      stage.ghosts[ghost.id] = ghostView; 
      stage.addChild(ghostView);
    });
    
    var radius = Math.min(tileWidth,tileHeight)/2;
    var packman = new Circle(0, 0, radius, 0xEEAA00);
    packman.move = function(x,y,dt) {
      this.position.x = x*tileWidth + (0.5*tileWidth)+stageBorderX;
      this.position.y = y*tileHeight+ (0.5*tileHeight)+stageBorderY;
      return this;
    }
    packman.move(initialWorld.man.x, initialWorld.man.y);
    
    stage.addChild(packman);
    stage.man = packman;

    background.cacheAsBitmap = true;
    return stage;
  }
  
  // Bound(stage) -> (callback : stage -> ()) -> world -> dt -> ()
  var updateStageNew = function(callback, world, dt) { 
    this.man.move(world.man.x, world.man.y, dt);
    if(callback) return callback(this); 
  };
  
  // Bound(world) -> (callback: world -> dt -> ()) -> InputQueue -> dt -> ()
  var updateWorldNew = function (callback, input, dt) { 
    while( event = input.shift()) {
      if( event === "left" || event === "right" || event === "up" || event === "down") {
        this.man.tryChangingDirection(this.walls, this.ghosts, event, dt);
      }
    }
    this.man.walk(dt);
    if(callback) return callback(this,dt);
  };
  
  // input
// vim like left=h right=l, space to shoot
  var keyActions = {
    72: "left",
    76: "right",
    74: "down",
    75: "up"
  };  
  var eventQueue = [];
  document.onkeydown = function(event) {
    var event   = event || window.event;
//    console.log("keycode", event.keyCode);
    var action = keyActions[event.keyCode];
    if(action) {
      eventQueue.push(action);
      event.preventDefault();
    }
  };
  // TRIAL, functional Gameloop
  var loop = function(update, events, lastTime) {
    var newTime = Date.now();
    var dt = (newTime - lastTime)/1000;
    update(events, dt);
    requestAnimationFrame(loop.bind(null, update, eventQueue, newTime));
  }
  
  //start game loop
  // the update function is a function composition
  //  render * updateStage * updateWorld (eventQueue, deltaTime)
  //  each function holds bound in its "this" context the reference to the object it mutates as side effect
  // good question: what would be an appropriate context for the loop function? maybe the eventQueue
  //  now the eventQueue is mutated in the updateWorld function
  // TODO: try to bind and mutate the eventQueue to the loop
  var initialWorld = initiWorld(level1);
  requestAnimationFrame(
    loop.bind(null,
              updateWorldNew.bind(initialWorld,
                updateStageNew.bind(initialStage(windowWidth, windowHeight, initialWorld),
                  renderer.render.bind(renderer))),
              eventQueue,
              Date.now()));
  
});
