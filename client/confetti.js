'use strict';

/*
 * confetti.js
 * A new Object3D-like class to simulate a shower of confetti
 */

(function(exports){

	function Confetti(opts)
	{
		THREE.Object3D.call(this);

		opts = opts || {};
		var particleCount = opts.particleCount || 40;
		var explosiveForce = opts.explosiveForce || 10;
		var delay = opts.delay || 500;

		this.particleArray = [];

		// colors
		var colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

		// generate particles
		for(var i=0; i<particleCount; i++)
		{
			var p = new THREE.Mesh(
				new THREE.BoxGeometry(0.06, 0.06, 0.06),
				new THREE.MeshBasicMaterial({color: colors[Math.floor(Math.random()*6)]})
			);

			// init velocity in random direction at random speed up to explosionForce
			p.velocity = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5)
			p.velocity.setLength(explosiveForce*Math.random());

			this.particleArray.push(p);
		}

		// generate sphere
		this.sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.4, 16, 16),
			new THREE.MeshBasicMaterial({color: 0xe2cc77})
		);
		this.add(this.sphere);

		// deploy fun after delay
		var self = this;
		setTimeout(function(){
			self.play();
		}, delay);

	}

	// Confetti inherits from Object3D
	Confetti.prototype = new THREE.Object3D;

	Confetti.prototype.play = function()
	{
		this.sphere.visible = false;
		this.add.apply(this, this.particleArray);
		this.addBehavior(new ConfettiUpdater());

		setTimeout(function(){
			this.parent.remove(this);
		}.bind(this), 3000);
	}

	Confetti.prototype.updateParticles = function(deltaT)
	{
		var g = new THREE.Vector3(0,0,-9.8);

		for(var i=0; i<this.particleArray.length; i++)
		{
			var p = this.particleArray[i];
			var sumAccel = new THREE.Vector3(0,0,0);

			var drag = new THREE.Vector3();
			drag.copy(p.velocity).negate().setLength( 0.9 * p.velocity.lengthSq() );
			sumAccel.add(drag);

			sumAccel.add(g);
			sumAccel.multiplyScalar(deltaT/1000);

			p.velocity.add(sumAccel);
			p.position.add( p.velocity.clone().multiplyScalar(deltaT/1000) );
		}
	}

	function ConfettiUpdater()
	{
		this.awake = function(o){
			this.target = o;
		}
		this.update = function(deltaT){
			this.target.updateParticles(deltaT);
		}
	}

	exports.Confetti = Confetti;

})(window.Utils = window.Utils || {});
