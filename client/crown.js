/* global THREE, Behaviors, Utils, socket */
'use strict';

// the hats example:
//  https://github.com/AltspaceVR/AltspaceSDK/blob/master/examples/hats.html

(function(exports)
{
	// card positions
	var cardPosition = [
		[-1.6, 3.9443045848797766e-32, -1.9594349641362686e-16, 0, -1.9594349641362686e-16, -3.55271373174006e-16, 1.6, 0, 0, 1.6, 3.55271373174006e-16, 0, 0, 0.125, 0.175, 1],
		[-0.9729368090629578, 0.5315178036689758, 0.45922014117240906, 0, 0.4030035734176636, -0.22016185522079468, 1.1086554527282715, 0, 0.5753107070922852, 1.0530991554260254, 3.3009173172615647e-9, 0, 0.07848304510116577, 0.10530146211385727, 0.15576119720935822, 1],
		[-0.9729368090629578, -0.531517744064331, -0.45922020077705383, 0, -0.40300360321998596, -0.22016192972660065, 1.1086554527282715, 0, -0.5753106474876404, 1.0530991554260254, 6.713475642072808e-8, 0, -0.07848304510116577, 0.10530146211385727, 0.15576119720935822, 1],
		[1.1102230246251565e-16, -2.7755575615628914e-17, -1, 0, -0.46656057238578796, 0.8844892382621765, -1.1102230246251565e-16, 0, 0.8844892382621765, 0.46656057238578796, 1.1102230246251565e-16, 0, 0.11284460872411728, 0.05446406826376915, 0.11999999731779099, 1],
		[5.225140320419541e-9, 2.110491337248277e-8, 1, 0, 0.46656060218811035, 0.8844892382621765, -2.110491337248277e-8, 0, -0.8844892382621765, 0.46656060218811035, -5.225140764508751e-9, 0, -0.11284460872411728, 0.05446406826376915, 0.11999999731779099, 1],
		[5.2251394322411215e-9, -4.163336342344337e-17, -1, 0, 0.11435113847255707, 0.9934403896331787, -2.0816681711721685e-17, 0, 0.9934403896331787, -0.11435113847255707, 5.2251394322411215e-9, 0, 0.12503184378147125, -0.02170942910015583, 0.11999999731779099, 1],
		[7.59392548843607e-9, 4.356159044593966e-10, 1, 0, -0.11435118317604065, 0.9934403896331787, 4.356159044593966e-10, 0, -0.9934403896331787, -0.11435118317604065, 7.59392548843607e-9, 0, -0.12503184378147125, -0.02170942910015583, 0.11999999731779099, 1]
	];

	function Crown(owner, wins)
	{
		THREE.Object3D.call(this);

		this.name = 'crown_'+owner;

		this.root = new THREE.Object3D();
		this.root.rotation.set(-Math.PI/2, 0, Math.PI);
		this.root.scale.multiplyScalar(1.4);

		this.add(this.root);
		this.addBehavior(new Behaviors.Object3DSync(socket, owner));

		// add head model (temp)
		/*var head = new THREE.Mesh(
			new THREE.SphereGeometry(0.10, 16,16),
			new THREE.MeshBasicMaterial({color: 0x00ffff})
		);
		this.add(head);*/

		wins = wins || [];
		for(var i=0; i<wins.length; i++)
			this.addCard( Utils.generateCard(wins[i], 'black') );
	}

	Crown.prototype = new THREE.Object3D();
	Crown.prototype.constructor = Crown;

	Crown.prototype.addCard = function(card)
	{
		var index = this.root.children.length;
		if(index >= cardPosition.length){
			console.log('card overflow', index);
			if(card && card.parent)
				card.parent.remove(card);
			return;
		}

		card.matrix.fromArray(cardPosition[index]);
		card.matrix.decompose(card.position, card.quaternion, card.scale);
		this.root.add(card);
	}

	exports.Crown = Crown;

})(window.Utils = window.Utils || {});
