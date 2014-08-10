var Vec2 = require('fd-vec2').Vec2;

module.exports = Result;

/**
 * Stores metadata about collision
 */
function Result() {
	this.mtv = new Vec2(0, 0);
}