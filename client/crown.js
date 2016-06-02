'use strict';

(function(exports)
{
	// card positions
	var cardPosition = [
		[1.6,0,0,0,0,3.5e-16,1.6,0,0,-1.6,3.5e-16,0,0,-0.125,0.175,1]
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
		this.add(card);
		card.matrix.fromArray(cardPosition[0]);
		card.matrixAutoUpdate = false;
		card.worldMatrixNeedsUpdate = true;
	}

	exports.Crown = Crown;

})(window.Utils = window.Utils || {});
