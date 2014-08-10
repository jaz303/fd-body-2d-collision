var vec2		= require('fd-vec2');
var body		= require('fd-body-2d');
var collision	= require('..');
var T 			= body.types;

function makeObject(x, y, body) {
	return {
		position: vec2(x, y),
		body: body,
		velocity: vec2.zero()
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
			});

			//
			// Check collisions

			objects.forEach(function(obj, ix) {
				if (ix !== focusIx) {
					if (collision(obj, objects[focusIx], result)) {
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

				ctx.strokeStyle = (ix === focusIx) ? 'green' : 'black';

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
