'use strict';

(function(exports)
{

	/*
	 * Rotate the target over time
	 */

	function Rotate(deltaX, deltaY, deltaZ)
	{
		this.deltaX = deltaX || 0;
		this.deltaY = deltaY || 0;
		this.deltaZ = deltaZ || 0;
	}

	Rotate.prototype.awake = function(obj)
	{
		this.target = obj;
	};

	Rotate.prototype.update = function(deltaT)
	{
		var oldAngles = this.target.rotation;

		this.target.rotation.set(
			oldAngles.x + this.deltaX*deltaT/1000,
			oldAngles.y + this.deltaY*deltaT/1000,
			oldAngles.z + this.deltaZ*deltaT/1000
		);
	};


	/*
	 * Animate the target from transform to transform over time
	 */

	function Animate(finalPos, finalRot, finalScale, duration, callback)
	{
		this.finalPos = finalPos;
		this.finalRot = finalRot;
		this.finalScale = finalScale;
		this.duration = duration || 600;
		this.callback = callback;
	}

	Animate.prototype.awake = function(obj)
	{
		this.target = obj;

		this.initialPos = obj.position;
		this.initialRot = obj.rotation;
		this.initialScale = obj.scale;
		this.startTime = Date.now();
	};

	Animate.prototype.update = function(deltaT)
	{
		function easeOutQuad(mix, startVal, endVal){
			if(mix <= 0)
				return startVal;
			else if(mix >= 1)
				return endVal;
			else
				return -(endVal-startVal) * mix * (mix-2) + startVal;
		}

		var mix = (Date.now()-this.startTime) / this.duration;

		// animate position if requested
		if( this.finalPos )
		{
			this.target.position.set(
				easeOutQuad(mix, this.initialPos.x, this.finalPos.x),
				easeOutQuad(mix, this.initialPos.y, this.finalPos.y),
				easeOutQuad(mix, this.initialPos.z, this.finalPos.z)
			);
		}

		// animate rotation if requested
		if( this.finalRot )
		{
			this.target.rotation.set(
				easeOutQuad(mix, this.initialRot.x, this.finalRot.x),
				easeOutQuad(mix, this.initialRot.y, this.finalRot.y),
				easeOutQuad(mix, this.initialRot.z, this.finalRot.z)
			);
		}

		// animate scale if requested
		if( this.finalScale )
		{
			this.target.scale.set(
				easeOutQuad(mix, this.initialScale.x, this.finalScale.x),
				easeOutQuad(mix, this.initialScale.y, this.finalScale.y),
				easeOutQuad(mix, this.initialScale.z, this.finalScale.z)
			);
		}

		// terminate animation when done
		if(mix >= 1){
			this.target.removeBehavior(this);
			this.callback.call(this.target);
		}
	};


	/*
	 * Grow object on hover
	 */
	function CursorFeedback(){}

	CursorFeedback.prototype.awake = function(obj)
	{
		var activeAnimation = null;
		var origScale = obj.scale.clone();

		obj.addEventListener('cursorenter', function(evt)
		{
			if(activeAnimation){
				obj.removeBehavior(activeAnimation);
			}
			
			activeAnimation = new Behaviors.Animate(null, null, origScale.clone().multiplyScalar(1.2), 400);
			activeAnimation.callback = function(){
				activeAnimation = null;
			};

			obj.addBehavior(activeAnimation);
		});

		obj.addEventListener('cursorleave', function(evt)
		{
			if(activeAnimation){
				obj.removeBehavior(activeAnimation);
			}
			
			activeAnimation = new Behaviors.Animate(null, null, origScale, 600);
			activeAnimation.callback = function(){
				activeAnimation = null;
			};

			obj.addBehavior(activeAnimation);
		});
	};

	CursorFeedback.prototype.update = function(deltaT){};


	exports.Rotate = Rotate;
	exports.Animate = Animate;
	exports.CursorFeedback = CursorFeedback;

})(window.Behaviors = window.Behaviors || {});

