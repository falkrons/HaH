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
		if(!this.target.visible) return;

		var oldAngles = this.target.rotation;

		this.target.rotation.set(
			oldAngles.x + this.deltaX*deltaT/1000,
			oldAngles.y + this.deltaY*deltaT/1000,
			oldAngles.z + this.deltaZ*deltaT/1000
		);
	};


	/*
	 * Animate the target from transform to transform over time
	 * Alternate prototype: Animate(finalMatrix, duration, callback)
	 */

	function Animate(finalPos, finalRot, finalScale, duration, callback)
	{
		if(finalPos instanceof THREE.Matrix4)
		{
			// extract position/rotation/scale from matrix
			this.finalPos = new THREE.Vector3();
			var quat = new THREE.Quaternion();
			this.finalScale = new THREE.Vector3();
			finalPos.decompose(this.finalPos, quat, this.finalScale);
			this.finalRot = new THREE.Euler().setFromQuaternion(quat);

			// shift other arguments
			duration = finalRot;
			callback = finalScale;
		}
		else
		{
			this.finalPos = finalPos;
			this.finalRot = finalRot;
			this.finalScale = finalScale;
		}
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
			if(this.callback)
				this.callback.call(this.target);
		}
	};


	/*
	 * Grow object on hover
	 */
	function CursorFeedback()
	{
		var self = this;
		var activeAnimation = null;

		this._onCursorEnter = function(evt)
		{
			if(activeAnimation){
				self.target.removeBehavior(activeAnimation);
			}

			activeAnimation = new Behaviors.Animate(null, null, self._origScale.clone().multiplyScalar(1.2), 400);
			activeAnimation.callback = function(){
				activeAnimation = null;
			};

			self.target.addBehavior(activeAnimation);
		};

		this._onCursorLeave = function(evt)
		{
			if(activeAnimation){
				self.target.removeBehavior(activeAnimation);
			}

			activeAnimation = new Behaviors.Animate(null, null, self._origScale, 600);
			activeAnimation.callback = function(){
				activeAnimation = null;
			};

			self.target.addBehavior(activeAnimation);
		};

	}

	CursorFeedback.prototype.awake = function(obj)
	{
		this.target = obj;
		this._origScale = obj.scale.clone();

		this.target.addEventListener('cursorenter', this._onCursorEnter);
		this.target.addEventListener('cursorleave', this._onCursorLeave);
	};

	CursorFeedback.prototype.dispose = function(obj)
	{
		this.target.removeEventListener('cursorenter', this._onCursorEnter);
		this.target.removeEventListener('cursorleave', this._onCursorLeave);
	}

	CursorFeedback.prototype.update = function(deltaT){};


	exports.Rotate = Rotate;
	exports.Animate = Animate;
	exports.CursorFeedback = CursorFeedback;

})(window.Behaviors = window.Behaviors || {});

