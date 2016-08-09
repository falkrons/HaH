/* global THREE, Behaviors, Game, root */
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

		// remove any other animations in progress
		var self = this;
		obj.__behaviorList.forEach(function(subobj){
			if( subobj instanceof Animate && subobj != self )
			{
				if(subobj.callback) subobj.callback(obj);
				obj.removeBehavior(subobj);
			}
		});

		// shuffle hierarchy, but keep world transform the same
		if(this.parent && this.parent !== obj.parent)
		{
			obj.applyMatrix(obj.parent.matrixWorld);
			var mat = new THREE.Matrix4().getInverse(this.parent.matrixWorld);
			obj.applyMatrix(mat);

			this.parent.add(obj);
		}

		// read initial positions
		this.initialPos = obj.position.clone();
		this.initialQuat = obj.quaternion.clone();
		this.initialScale = obj.scale.clone();
		this.startTime = Date.now();
	};

	Animate.prototype.update = function()
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

	/*Animate.prototype.finishNow = function()
	{
		if( this.finalPos ){
			this.target.position.copy(this.finalPos);
		}

		if( this.finalQuat ){
			this.target.quaternion.copy(this.finalQuat);
		}

		if( this.finalScale ){
			this.target.scale.copy(this.finalScale);
		}

		if(this.target)
			this.target.removeBehavior(this);

		if(this.callback)
			this.callback(this.target);
	};*/


	/*
	 * Grow object on hover
	 */
	function CursorFeedback()
	{
		var self = this;
		var activeAnimation = null;

		this._onCursorEnter = function()
		{
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

		this._onCursorLeave = function()
		{
			if(self.target._listeners.cursorup && self.target._listeners.cursorup.length > 0)
			{
				if(activeAnimation){
					self.target.removeBehavior(activeAnimation);
				}

				activeAnimation = new Behaviors.Animate(null, null, null, self._origScale, 400);
				activeAnimation.callback = function(){
					activeAnimation = null;
				};

				self.target.addBehavior(activeAnimation);
			}
		};
	}

	CursorFeedback.prototype.type = 'CursorFeedback';

	CursorFeedback.prototype.awake = function(obj)
	{
		this.target = obj;
		this._origScale = obj.scale.clone();

		this.target.addEventListener('cursorenter', this._onCursorEnter);
		this.target.addEventListener('cursorleave', this._onCursorLeave);
	};

	CursorFeedback.prototype.dispose = function()
	{
		this.target.removeEventListener('cursorenter', this._onCursorEnter);
		this.target.removeEventListener('cursorleave', this._onCursorLeave);
	}

	CursorFeedback.prototype.update = function(){};


	/*
	 * Synchronize Object3D's transform over the socket
	 */
	function Object3DSync(socket, owner)
	{
		this.socket = socket;
		this.owner = owner;
		this.lastMatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
	}

	Object3DSync.prototype.constructor = Object3DSync;

	Object3DSync.prototype.awake = function(obj)
	{
		this.target = obj;
		obj.matrixAutoUpdate = false;
	}

	Object3DSync.prototype.update = function()
	{
		if(Game.playerInfo.id === this.owner)
		{
			this.target.updateMatrixWorld();

			var rootMat = new THREE.Matrix4().getInverse(root.matrixWorld);
			rootMat = rootMat.multiply(this.target.matrixWorld);

			var matrixChanged = false, i = 0;
			while(!matrixChanged && i < 16){
				matrixChanged = matrixChanged || rootMat.elements[i] !== this.lastMatrix[i];
				i++;
			}

			if(matrixChanged)
			{
				this.lastMatrix = rootMat.toArray();
				this.socket.emit('objectUpdate', this.target.name, this.lastMatrix);
			}
		}
		else if(this.target && window._syncStates && window._syncStates[this.target.name]){
			this.target.matrix.fromArray(window._syncStates[this.target.name]);
		}
	}


	exports.Rotate = Rotate;
	exports.Animate = Animate;
	exports.CursorFeedback = CursorFeedback;
	exports.Object3DSync = Object3DSync;

})(window.Behaviors = window.Behaviors || {});

