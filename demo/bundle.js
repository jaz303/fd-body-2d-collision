(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/jason/dev/projects/fd-body-2d-collision/Result.js":[function(require,module,exports){
var Vec2 = require('fd-vec2').Vec2;

module.exports = Result;

/**
 * Stores metadata about collision
 */
function Result() {
	this.mtv = new Vec2(0, 0);
}
},{"fd-vec2":"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-vec2/index.js"}],"/Users/jason/dev/projects/fd-body-2d-collision/demo/main.js":[function(require,module,exports){
var vec2		= require('fd-vec2');
var body		= require('fd-body-2d');
var collision	= require('..');
var T 			= body.types;

function makeObject(x, y, body) {
	return {
		position: vec2(x, y),
		body: body,
		velocity: vec2.zero(),
		colliding: false
	};
}

window.init = function() {

	var canvas = document.querySelector('canvas');
	var ctx = canvas.getContext('2d');

	var focusIx 	= 0;

	var mouse 		= vec2.zero();
	var mouseDown 	= false;

	var result 		= new collision.Result();

	canvas.addEventListener('keypress', function(evt) {
		if (evt.which === 110) {
			focusIx = (focusIx + 1) % objects.length;
		}
	});

	canvas.addEventListener('mousedown', function(evt) {
		mouseDown = true;
	});

	canvas.addEventListener('mouseup', function(evt) {
		mouseDown = false;
	});

	canvas.addEventListener('mousemove', function(evt) {
		mouse.x = evt.offsetX;
		mouse.y = evt.offsetY;
	});

	var objects = [
		makeObject(50, 50, new body.AABB(100, 20)),
		makeObject(400, 20, new body.AABB(50, 60)),
		makeObject(40, 220, new body.Circle(20)),
		makeObject(400, 150, new body.Circle(50)),
		makeObject(20, 400, new body.LineSegment(vec2(50, 50))),
		makeObject(250, 350, new body.LineSegment(vec2(200, -30)))
	];

	var lastTick = Date.now();
	window.requestAnimationFrame(update);

	function update() {

		var now = Date.now();
		var dt = now - lastTick;

		if (dt > 0) {

			//
			// Input

			objects.forEach(function(obj, ix) {
				if (ix === focusIx && mouseDown) {
					vec2.sub(mouse, obj.position, obj.velocity);
					obj.velocity.normalize_();
					obj.velocity.mul_(200);
				} else {
					obj.velocity.x = obj.velocity.y = 0;
				}
			});

			//
			// Update

			objects.forEach(function(obj) {
				obj.position.adjust_(obj.velocity, dt / 1000);
				obj.colliding = false;
			});

			//
			// Check collisions

			objects.forEach(function(obj, ix) {
				if (ix !== focusIx) {
					if (collision(obj, objects[focusIx], result)) {
						obj.colliding = true;
						objects[focusIx].colliding = true;
						objects[focusIx].position.add_(result.mtv);
					}
				}
			});

			//
			// Render

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.lineWidth = 1.0;

			ctx.strokeStyle = '#d0d0d0';
			objects.forEach(function(obj) {
				if (obj.body.type & 1) {
					ctx.beginPath();
					ctx.arc(
						obj.position.x + obj.body.boundOffset.x,
						obj.position.y + obj.body.boundOffset.y,
						obj.body.boundRadius,
						Math.PI * 2,
						false
					);
					ctx.stroke();
				}
			});

			objects.forEach(function(obj, ix) {

				if (obj.colliding) {
					ctx.strokeStyle = 'red';
				} else if (ix === focusIx) {
					ctx.strokeStyle = 'green';
				} else {
					ctx.strokeStyle = 'black';
				}

				switch (obj.body.type) {
					case T.BODY_AABB:
						ctx.strokeRect(obj.position.x, obj.position.y, obj.body.width, obj.body.height);
						break;
					case T.BODY_CIRCLE:
						ctx.beginPath();
						ctx.arc(
							obj.position.x + obj.body.boundOffset.x,
							obj.position.y + obj.body.boundOffset.y,
							obj.body.radius,
							Math.PI * 2,
							false
						);
						ctx.stroke();
						break;
					case T.BODY_LINE_SEGMENT:
						ctx.beginPath();
						ctx.moveTo(obj.position.x, obj.position.y);
						ctx.lineTo(obj.position.x + obj.body.size.x, obj.position.y + obj.body.size.y);
						ctx.stroke();
						break;
				}

			});

			lastTick = now;

		}

		window.requestAnimationFrame(update);

	}

}

},{"..":"/Users/jason/dev/projects/fd-body-2d-collision/index.js","fd-body-2d":"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-body-2d/index.js","fd-vec2":"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-vec2/index.js"}],"/Users/jason/dev/projects/fd-body-2d-collision/index.js":[function(require,module,exports){
var body    = require('fd-body-2d');
var vec2    = require('fd-vec2');

var Result  = require('./Result');

var T       = body.types;
var sqrt    = Math.sqrt;

module.exports = exports = checkCollision;
exports.Result = Result;

// Temporary storage for calculations
var tv1 = vec2.zero();
var tv2 = vec2.zero();
var tv3 = vec2.zero();
var tv4 = vec2.zero();

/**
 * Check for collisions between i1 and i2
 *
 * Returns true if objects are colliding, false otherwise.
 *
 * When a collision is detected, the mtv field of the Result object
 * will be updated with the vector by which i2 should be moved so
 * that it is no longer in collision with i1.
 */
function checkCollision(i1, i2, result) {

    var p1 = i1.position;
    var b1 = i1.body;
    var p2 = i2.position;
    var b2 = i2.body;

    if ((b1.type & 1) && (b2.type & 1)) {
        // this check is pointless for 2 circles as it's the same as the full test
        if (b1.type !== T.BODY_CIRCLE || b2.type !== T.BODY_CIRCLE) {
            vec2.add(p1, b1.boundOffset, tv1);
            vec2.add(p2, b2.boundOffset, tv2);
            var rss = b1.boundRadius + b2.boundRadius;
            if (tv1.distancesq(tv2) > rss*rss) {
                return false;
            }
        }
    }

    var colliding   = null;
    var flipped     = false;

    if (b1.type > b2.type) {
        
        var tmp = b2;
        b2 = b1;
        b1 = tmp;

        tmp = i2;
        i2 = i1;
        i1 = tmp;

        tmp = p2;
        p2 = p1;
        p1 = tmp;

        flipped = true;

    }

    if (b1.type === T.BODY_AABB) {
        if (b2.type === T.BODY_AABB) {
            colliding = AABB_AABB(i1, i2, result);
        } else if (b2.type === T.BODY_CIRCLE) {
            colliding = AABB_circle(p1, b1, p2, b2, result);
        } else if (b2.type === T.BODY_LINE_SEGMENT) {
            colliding = AABB_lineSegment(p1, b1, p2, b2, result);
        }
    } else if (b1.type === T.BODY_CIRCLE) {
        if (b2.type === T.BODY_CIRCLE) {
            colliding = circle_circle(p1, b1, p2, b2, result);
        } else if (b2.type === T.BODY_LINE_SEGMENT) {
            colliding = circle_lineSegment(i1, i2, result);
        }
    } else if (b1.type === T.BODY_LINE_SEGMENT) {
        if (b2.type === T.BODY_LINE_SEGMENT) {
            colliding = lineSegment_lineSegment(p1, b1.size, p2, b2.size, result);
        }
    }

    if (colliding === null) {
        console.error("warning: unsupported arguments to collision detection");
        return false;   
    } else {
        if (flipped) {
            result.mtv.x *= -1;
            result.mtv.y *= -1;
        }
        return colliding;
    }

}

function AABB_AABB(obj1, obj2, result) {

    var b1 = obj1.body;
    var b2 = obj2.body;

    var move = Infinity;
    var axis = null;

    var right = obj1.position.x - (obj2.position.x + b2.width);
    if (right > 0) {
        return false;
    } else {
        axis = 0;
        move = right;
    }

    var left = (obj1.position.x + b1.width) - obj2.position.x;
    if (left < 0) {
        return false;
    } else if (left < Math.abs(move)) {
        axis = 0;
        move = left;
    }

    var down = obj1.position.y - (obj2.position.y + b2.height);
    if (down > 0) {
        return false;
    } else if (-down < Math.abs(move)) {
        axis = 1;
        move = down;
    }

    var up = (obj1.position.y + b1.height) - obj2.position.y;
    if (up < 0) {
        return false;
    } else if (up < Math.abs(move)) {
        axis = 1;
        move = up;
    }
    
    if (axis === 0) {
        result.mtv.x = move;
        result.mtv.y = 0;
    } else {
        result.mtv.x = 0;
        result.mtv.y = move;
    }

    return true;

}

function AABB_circle(p1, b1, p2, b2, result) {

    var left    = p1.x,
        right   = p1.x + b1.width,
        top     = p1.y,
        bottom  = p1.y + b1.height,
        mtv     = result.mtv;

    // find closest point on AABB to circle and store in tv1

    if (p2.x < left) {
        tv1.x = left;
    } else if (p2.x > right) {
        tv1.x = right;
    } else {
        tv1.x = p2.x;
    }

    if (p2.y < top) {
        tv1.y = top;
    } else if (p2.y > bottom) {
        tv1.y = bottom;
    } else {
        tv1.y = p2.y;
    }

    // calculate vector from closest point to circle center
    // and store in mtv

    vec2.sub(p2, tv1, mtv);

    // hit check

    if (mtv.magnitudesq() >= b2.boundRadiusSq) {
        return false;
    }

    var mag = mtv.magnitude();

    mtv.div_(mag);
    mtv.mul_(-(mag - b2.radius));

    return true;

}

function AABB_lineSegment(p1, b1, p2, b2, result) {

    // // tv1 := AABB horizontal
    // tv1.x = b1.width;
    // tv1.y = 0;

    // if (_collideLineSegments(p1, tv1, p2, b2.size, result)) return true;

    // // tv2 := AABB bottom left
    // tv2.x = p1.x;
    // tv2.y = p1.y + b1.height;

    // if (_collideLineSegments(tv2, tv1, p2, b2.size, result)) return true;

    // // tv1 := AABB vertical
    // tv1.x = 0;
    // tv1.y = b1.height;

    // if (_collideLineSegments(p1, tv1, p2, b2.size, result)) return true;

    // // tv2 := AABB top right
    // tv2.x = p1.x + b1.width;
    // tv2.y = p1.y;

    // if (_collideLineSegments(tv2, tv1, p2, b2.size, result)) return true;

    return false;

}

function circle_circle(p1, b1, p2, b2, result) {

    var mtv = result.mtv;

    vec2.sub(p2, p1, mtv);

    var totalRadius = b1.radius + b2.radius;
    if (mtv.magnitudesq() >= totalRadius*totalRadius) {
        return false;
    }

    var mag = mtv.magnitude();
    
    mtv.div_(mag);
    mtv.mul_(-(mag - totalRadius));

    return true;

};

function circle_lineSegment(circle, segment, result) {

    var segmentVector       = segment.body.size;
    var segmentEndToCentre  = circle.position.sub(segment.position);

    var t = segmentEndToCentre.dot(segmentVector) / segmentVector.magnitudesq();
    if (t < 0) t = 0;
    if (t > 1) t = 1;

    var projected = segmentVector.mul(t);
    var closest = segment.position.add(projected);
    var closestToCenter = circle.position.sub(closest);
    var distSq = vec2.magnitudesq(closestToCenter);

    if (distSq < circle.body.radius * circle.body.radius) {

        var dist = Math.sqrt(distSq);

        vec2.div(closestToCenter, dist, result.mtv);
        result.mtv.mul_(dist - circle.body.radius);

        return true;

    } else {

        return false;
    
    }

};

function lineSegment_lineSegment(s1, d1, s2, d2, result) {

    if (_intersectLineSegments(s1, d1, s2, d2, tv4)) {

        // step 2 - shortest overlap

        function distsq(x, y) {
            var dx = tv4.x - x;
            var dy = tv4.y - y;
            return dx*dx + dy*dy;
        }

        var d1sq = distsq(s1.x, s1.y);
        var d2sq = distsq(s1.x + d1.x, s1.y + d1.y);
        var d3sq = distsq(s2.x, s2.y);
        var d4sq = distsq(s2.x + d2.x, s2.y + d2.y);

        var best = d1sq;
        var line = 1;
        var dir  = 1;

        if (d2sq < best) {
            best = d2sq;
            dir = -1;
        }

        if (d3sq < best) {
            best = d3sq;
            line = 2;
            dir = 1;
        }

        if (d4sq < best) {
            best = d4sq;
            line = 2;
            dir = -1;
        }

        // step 3 - adjust by shortest overlap

        var mtv = result.mtv;
        if (line === 1) {
            vec2.normalize(d1, mtv);
            mtv.mul_(-dir * sqrt(best));
        } else {
            vec2.normalize(d2, mtv);
            mtv.mul_(dir * sqrt(best));
        }

        return true;

    } else {

        return false;

    }

}

//
// Internal

function _intersectLineSegments(s1, d1, s2, d2, intersection) {

    var cross = d1.x * d2.y - d1.y * d2.x;
    if (cross === 0) {
        return false;
    }

    vec2.sub(s2, s1, tv3);

    var t = (tv3.x * d2.y - tv3.y * d2.x) / cross;
    if (t < 0 || t > 1) return false;

    var u = (tv3.x * d1.y - tv3.y * d1.x) / cross;
    if (u < 0 || u > 1) return false;

    if (intersection) {
        vec2.adjust(s1, d1, t, intersection);
    }

    return true;

}

},{"./Result":"/Users/jason/dev/projects/fd-body-2d-collision/Result.js","fd-body-2d":"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-body-2d/index.js","fd-vec2":"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-vec2/index.js"}],"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-body-2d/index.js":[function(require,module,exports){
var vec2 = require('fd-vec2');
var zero = vec2.zero;
var Vec2 = vec2.Vec2;

var types = {};

types.BODY_AABB             = 1;
types.BODY_CIRCLE           = 3;
types.BODY_POLYGON          = 5;
types.BODY_LINE_SEGMENT     = 7;
types.BODY_LINE             = 8;
types.BODY_H_AXIS           = 10;
types.BODY_V_AXIS           = 12;

exports.types               = types;

exports.AABB                = AABB;
exports.Circle              = Circle;
exports.Polygon             = Polygon;
exports.LineSegment         = LineSegment;
exports.Line                = Line;
exports.HAxis               = HAxis;
exports.VAxis               = VAxis;

function AABB(width, height) {
    this.width = width;
    this.height = height;

    this.boundOffset = new Vec2(width / 2, height / 2);
    this.boundRadiusSq = ((width/2)*(width/2) + (height/2)*(height/2));
    this.boundRadius = Math.sqrt(this.boundRadiusSq);
}

AABB.prototype.type = types.BODY_AABB;

function Circle(radius) {
    this.radius = radius;

    this.boundOffset = zero();
    this.boundRadius = radius;
    this.boundRadiusSq = radius * radius;
}

Circle.prototype.type = types.BODY_CIRCLE;

function Polygon(points) {
    this.points = points;

    var maxSq = 0;
    for (var i = 0; i < this.points.length; ++i) {
        var d = this.points[i].magnitudesq();
        if (d > maxSq) maxSq = d;
    }

    this.boundOffset = zero();
    this.boundRadiusSq = maxSq;
    this.boundRadius = Math.sqrt(maxSq);
}

Polygon.prototype.type = types.BODY_POLYGON;

function LineSegment(size) {
    this.size = size.clone();

    this.boundOffset = this.size.midpoint();
    this.boundRadiusSq = this.boundOffset.magnitudesq();
    this.boundRadius = Math.sqrt(this.boundRadiusSq);
}

LineSegment.prototype.type = types.BODY_LINE_SEGMENT;

function Line(slope) {
    this.slope = slope.clone();
}

Line.prototype.type = types.BODY_LINE;

function HAxis() {}
HAxis.prototype.type = types.BODY_H_AXIS;

function VAxis() {}
VAxis.prototype.type = types.BODY_V_AXIS;[]
},{"fd-vec2":"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-vec2/index.js"}],"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-vec2/Vec2.js":[function(require,module,exports){
module.exports = Vec2;

var sqrt    = Math.sqrt,
    cos     = Math.cos,
    sin     = Math.sin,
    atan2   = Math.atan2;

function Vec2(x, y) {
    this.x = x;
    this.y = y;
}

//
// Clone

Vec2.prototype.clone = function() {
    return new Vec2(this.x, this.y);
}

//
// Operations returning new vectors

Vec2.prototype.add = function(rhs) {
    return new Vec2(this.x + rhs.x, this.y + rhs.y);
}

Vec2.prototype.sub = function(rhs) {
    return new Vec2(this.x - rhs.x, this.y - rhs.y);
}

Vec2.prototype.mul = function(rhs) {
    return new Vec2(this.x * rhs, this.y * rhs);
}

Vec2.prototype.div = function(rhs) {
    return new Vec2(this.x / rhs, this.y / rhs);
}

Vec2.prototype.normalize = function() {
    var mag = this.magnitude();
    return new Vec2(this.x / mag, this.y / mag);
}

Vec2.prototype.midpoint = function() {
    return new Vec2(this.x/2, this.y/2);
}

Vec2.prototype.adjust = function(rhs, amount) {
    return new Vec2(
        this.x + rhs.x * amount,
        this.y + rhs.y * amount
    );
}

//
// Modify in place

Vec2.prototype.add_ = function(rhs) {
    this.x += rhs.x;
    this.y += rhs.y;
}

Vec2.prototype.sub_ = function(rhs) {
    this.x -= rhs.x;
    this.y -= rhs.y;
}

Vec2.prototype.mul_ = function(rhs) {
    this.x *= rhs;
    this.y *= rhs;
}

Vec2.prototype.div_ = function(rhs) {
    this.x /= rhs;
    this.y /= rhs;
}

Vec2.prototype.normalize_ = function() {
    var mag = this.magnitude();
    this.x /= mag;
    this.y /= mag;
}

Vec2.prototype.midpoint_ = function() {
    this.x /= 2;
    this.y /= 2;
}

Vec2.prototype.adjust_ = function(rhs, amount) {
    this.x += rhs.x * amount;
    this.y += rhs.y * amount;
}

//
// Scalar

Vec2.prototype.eq = function(rhs) {
    return this.x === rhs.x && this.y === rhs.y;
}

Vec2.prototype.distance = function(rhs) {
    var dx = this.x - rhs.x,
        dy = this.y - rhs.y;
    return sqrt(dx*dx + dy*dy);
}

Vec2.prototype.distancesq = function(rhs) {
    var dx = this.x - rhs.x,
        dy = this.y - rhs.y;
    return dx*dx + dy*dy;
}

Vec2.prototype.magnitude = function() {
    return sqrt(this.x*this.x + this.y*this.y);
}

Vec2.prototype.magnitudesq = function() {
    return this.x*this.x + this.y*this.y;
}

Vec2.prototype.cross = function(rhs) {
    return this.x*rhs.y - this.y*rhs.x;
}

Vec2.prototype.dot = function(rhs) {
    return this.x*rhs.x + this.y*rhs.y;
}

// returns angle through which this vector must be rotated to equal rhs
Vec2.prototype.angle = function(rhs) {
    return atan2(rhs.cross(this), rhs.dot(this));
}
},{}],"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-vec2/index.js":[function(require,module,exports){
var sqrt    = Math.sqrt,
    cos     = Math.cos,
    sin     = Math.sin,
    atan2   = Math.atan2;

//
// Smart constructor

module.exports = exports = smartConstructor;
function smartConstructor(x, y) {
    switch (arguments.length) {
        case 0: return zero();
        case 1: return clone(x);
        case 2: return make(x, y);
        default: throw new Error("invalid number of arguments to vec2 smart constructor");
    }
}

//
// Class

var Vec2 = require('./Vec2');
exports.Vec2 = Vec2;

//
// Constructors

exports.zero = zero;
function zero() {
    return new Vec2(0, 0);
}

exports.clone = clone;
function clone(vec) {
    return new Vec2(vec.x, vec.y);
}

exports.make = make;
function make(x, y) {
    return new Vec2(x, y);
}

//
// Library

exports.eq = function(v1, v2) {
    return v1.x === v2.x && v1.y === v2.y;
}

exports.add = function(v1, v2, out) {
    out.x = v1.x + v2.x;
    out.y = v1.y + v2.y;
}

exports.sub = function(v1, v2, out) {
    out.x = v1.x - v2.x;
    out.y = v1.y - v2.y;
}

exports.mul = function(v, s, out) {
    out.x = v.x * s;
    out.y = v.y * s;
}

exports.div = function(v, s, out) {
    out.x = v.x / s;
    out.y = v.y / s;
}

exports.normalize = function(v, out) {
    var mag = sqrt(v.x * v.x + v.y * v.y);
    out.x = v.x / mag;
    out.y = v.y / mag;
}

// exports.transform = function(vec, pos, rotation, out) {
//     var nx = pos.x + (Math.cos(rotation) * vec.x - Math.sin(rotation) * vec.y);
//     out.y = pos.y + (Math.sin(rotation) * vec.x - Math.sin(rotation) * vec.y);
//     out.x = nx;
// }

exports.distance = function(v1, v2) {
    var dx = v1.x - v2.x, dy = v1.y - v2.y;
    return Math.sqrt(dx*dx + dy*dy);
}

exports.distancesq = function(v1, v2) {
    var dx = v1.x - v2.x, dy = v1.y - v2.y;
    return dx*dx + dy*dy;
}

exports.magnitude = magnitude;
function magnitude(v) {
    return sqrt(v.x*v.x + v.y*v.y);
}

exports.magnitudesq = function(v) {
    return v.x*v.x + v.y*v.y;
}

exports.midpoint = function(v, out) {
    out.x = v.x / 2;
    out.y = v.y / 2;
}

exports.adjust = function(v, delta, amount, out) {
    out.x = v.x + delta.x * amount;
    out.y = v.y + delta.y * amount;
}

exports.cross = cross;
function cross(v1, v2) {
    return v1.x*v2.y - v1.y*v2.x;
}

exports.dot = dot;
function dot(v1, v2) {
    return v1.x*v2.x + v1.y*v2.y;
}

// returns angle through which v1 must be rotated to equal v2
exports.angle = function(v1, v2) {
    return atan2(cross(v2, v1), dot(v2, v1));
}

},{"./Vec2":"/Users/jason/dev/projects/fd-body-2d-collision/node_modules/fd-vec2/Vec2.js"}]},{},["/Users/jason/dev/projects/fd-body-2d-collision/demo/main.js"]);
