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

	function Animate(finalParent, finalPos, finalQuat, finalScale, duration, callback)
	{
		this.parent = finalParent || null;

		if(finalPos instanceof THREE.Matrix4)
		{
			// extract position/rotation/scale from matrix
			this.finalPos = new THREE.Vector3();
			this.finalQuat = new THREE.Quaternion();
			this.finalScale = new THREE.Vector3();
			finalPos.decompose(this.finalPos, this.finalQuat, this.finalScale);

			// shift other arguments
			duration = finalQuat;
			callback = finalScale;
		}
		else
		{
			this.finalPos = finalPos;
			this.finalQuat = finalQuat;
			this.finalScale = finalScale;
		}
		this.parent = finalParent || null;
		this.duration = duration || 600;
		this.callback = callback;
	}

	Animate.prototype.awake = function(obj)
	{
		this.target = obj;

		// shuffle hierarchy, but keep world transform the same
		if(this.parent && this.parent !== obj.parent)
		{
			obj.matrix.copy( new THREE.Matrix4().getInverse(this.parent.matrixWorld).multiply(obj.matrixWorld) );
			this.parent.add(obj);
		}

		// read initial positions
		this.initialPos = obj.position.clone();
		this.initialQuat = obj.quaternion.clone();
		this.initialScale = obj.scale.clone();
		this.startTime = Date.now();
	};

	Animate.prototype.update = function(deltaT)
	{
		// compute ease-out based on duration
		var mix = (Date.now()-this.startTime) / this.duration;
		mix = mix < 1 ? -mix * (mix-2) : 1;

		// animate position if requested
		if( this.finalPos ){
			this.target.position.lerpVectors(this.initialPos, this.finalPos, mix);
		}

		// animate rotation if requested
		if( this.finalQuat ){
			THREE.Quaternion.slerp(this.initialQuat, this.finalQuat, this.target.quaternion, mix)
		}

		// animate scale if requested
		if( this.finalScale ){
			this.target.scale.lerpVectors(this.initialScale, this.finalScale, mix);
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
			//console.log(self.target._listeners);
			if(self.target._listeners.cursorup && self.target._listeners.cursorup.length > 0)
			{
				if(activeAnimation){
					self.target.removeBehavior(activeAnimation);
				}

				activeAnimation = new Behaviors.Animate(null, null, null, self._origScale.clone().multiplyScalar(1.2), 400);
				activeAnimation.callback = function(){
					activeAnimation = null;
				};

				self.target.addBehavior(activeAnimation);
			}
		};

		this._onCursorLeave = function(evt)
		{
			if(self.target._listeners.cursorup && self.target._listeners.cursorup.length > 0)
			{
				if(activeAnimation){
					self.target.removeBehavior(activeAnimation);
				}

				activeAnimation = new Behaviors.Animate(null, null, null, self._origScale, 600);
				activeAnimation.callback = function(){
					activeAnimation = null;
				};

				self.target.addBehavior(activeAnimation);
			}
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

