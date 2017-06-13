/* global THREE */
'use strict';


(function(exports)
{
	function Seat(owner, models)
	{
		THREE.Object3D.call(this);

		this.name = 'seat_'+owner;

		this.pointModel = models.pointModel;
		this.numPoints = 0;
		this.pointContainer = new THREE.Object3D();
		this.pointContainer.rotation.x = Math.PI / 2;
		this.pointContainer.scale.multiplyScalar(0.01);
		this.pointContainer.position.set(0, 0.3, -0.71);
		this.add(this.pointContainer);

		var playerIndicator = models.playerIndicator.clone();
		playerIndicator.name = 'playerIndicator';
		var playerIndicatorSlice = playerIndicator.getObjectByName('PlayerSlice');
		playerIndicatorSlice.material = playerIndicatorSlice.material.clone();
		playerIndicatorSlice.material.map = playerIndicatorSlice.material.map.clone();
		playerIndicatorSlice.material.map.needsUpdate = true;
		this.playerIndicatorTexture = playerIndicatorSlice.material.map;
		this.playerIndicatorTexture.offset.set(0, 0.5);
		this.setIndicatorState('waiting');
		this.add(playerIndicator);
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

	var indicatorOffsets = {
		waiting: {x: 0, y: 0.75},
		submitting: {x: 0, y: 0},
		submitted: {x: 0, y: 0.5},
		czar: {x: 0.5, y: 0}
	}
	Seat.prototype.setIndicatorState = function (newState)
	{
		var reset = new TWEEN.Tween(this.playerIndicatorTexture.offset)
			.to({x: 0.25, y: 0.5}, 500)
			.easing(TWEEN.Easing.Quartic.In);
		var tweenToNew = new TWEEN.Tween(this.playerIndicatorTexture.offset)
			.to(indicatorOffsets[newState], 500)
			.easing(TWEEN.Easing.Quartic.Out);
		reset.chain(tweenToNew).start();
		this.indicatorState = newState;
	};

	exports.Seat = Seat;

})(window.Utils = window.Utils || {});
