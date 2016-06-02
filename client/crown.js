'use strict';

(function(exports)
{
	// card positions
	var cardPosition = [
		new THREE.Matrix4().set(1.6,0,0,0,0,3.55271373174006e-16,1.6,0,0,-1.6,3.55271373174006e-16,0,0,-0.125,0.175,1),
		[1.6,0,0,0,0,3.55271373174006e-16,1.6,0,0,-1.6,3.55271373174006e-16,0,0,-0.125,0.175,1],
		[-2, 2.4492937051703357e-16, -4.930380657631324e-32, 0, 0, 4.440892098500626e-16, 2, 0, 2.4492937051703357e-16, 2, -4.440892098500626e-16, 0, 0, 0.125, 0.17499999701976776, 1]
	];

	function Crown(opts)
	{
		THREE.Object3D.call(this);

		var head = new THREE.Mesh(
			new THREE.SphereGeometry(0.15, 16,16),
			new THREE.MeshBasicMaterial({color: 0x00ffff})
		);
		this.add(head);
	}

	Crown.prototype = new THREE.Object3D();
	Crown.prototype.constructor = Crown;

	Crown.prototype.addCard = function(card)
	{
		//card.matrix.identity();
		card.matrix.set.apply(card.matrix, cardPosition[1]);
		//card.applyMatrix(cardPosition[0]);
		this.add(card);
	}

	exports.Crown = Crown;

})(window.Utils = window.Utils || {});
