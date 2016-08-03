'use strict';


(function(exports)
{
	function Seat(owner, pointModel)
	{
		THREE.Object3D.call(this);

		this.name = 'seat_'+owner;

		this.pointModel = pointModel;
		this.numPoints = 0;
		this.pointContainer = new THREE.Object3D();
		this.pointContainer.rotation.x = Math.PI / 2;
		this.pointContainer.scale.multiplyScalar(0.01);
		this.pointContainer.position.set(0, 0.5, -0.66);
		this.add(this.pointContainer);
	}

	Seat.prototype = new THREE.Object3D();
	Seat.prototype.constructor = Seat;

	Seat.prototype.addPoint = function()
	{
		var point = this.pointModel.clone();
		point.position.x = this.numPoints * 5;
		this.pointContainer.add(point);
		this.pointContainer.position.x = -this.numPoints * 5 * 0.01 / 2;
		this.numPoints++;
	}

	exports.Seat = Seat;

})(window.Utils = window.Utils || {});
