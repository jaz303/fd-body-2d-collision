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
            colliding = lineSegment_lineSegment(p1, b1, p2, b2, result);
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

function AABB_lineSegment(obj1, obj2, result) {
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

function lineSegment_lineSegment(obj1, obj2, result) {
    return false;
}
