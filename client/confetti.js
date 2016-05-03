'use strict';

/*
 * confetti.js
 * A new Object3D-like class to simulate a shower of confetti
 */

(function(exports){

	function Confetti(particleCount, explosionForce)
	{
		THREE.Object3D.call(this);
		this.particleCount = particleCount;
		this.explosionForce = explosionForce;

		this.particleArray = [];

		// colors
		var colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

		// generate particles
		for(var i=0; i<particleCount; i++)
		{
			var p = new THREE.Mesh(
				new THREE.PlaneGeometry(.01, .06),
				new THREE.MeshBasicMaterial({side: THREE.DoubleSide, color: colors[Math.floor(Math.random()*6)]})
			);

			// init velocity in random direction at random speed up to explosionForce
			p._velocity = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5)
			p._velocity.setLength(explosionForce*Math.random());

			this.particleArray.push(p);
		}

		// generate sphere
		this.sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.4, 16, 16),
			new THREE.MeshBasicMaterial({color: 0xe2cc77})
		);
		this.add(this.sphere);

	}

	// Confetti inherits from Object3D
	Confetti.prototype = new THREE.Object3D;

	Confetti.prototype.play = function()
	{
		this.sphere.visible = false;
		this.add.apply(this, this.particleArray);
	}

	Confetti.prototype.updateParticles = function(deltaT)
	{
		
	}

	exports.Confetti = Confetti;

})(window.Utils = window.Utils || {});
