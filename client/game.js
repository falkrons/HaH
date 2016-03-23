'use strict';

var socket;

function connectToGame(gameId)
{
	socket = io('http://localhost:7878/?gameId='+gameId);
	socket.on('error', function(msg){
		console.error(msg);
	});

	socket.on('playerJoin', playerJoin);

	socket.emit('playerJoinRequest', 'asdf', 'stevenp');
}

function playerJoin(id, displayName, turnOrder)
{

}


var seatForPlayer = {};
function rebalanceTable(turnOrder)
{
	var angle = 2*Math.PI/turnOrder.length;
	var cardRadius = 0.5, row1Angle = Math.PI/5, row2Angle = Math.PI/3, row1Sep = Math.PI/10, row2Sep = 1.5*Math.PI/10;

	for(var i=0; i<turnOrder.length; i++)
	{
		// create origin point for player's UI
		var seat = new THREE.Object3D();
		seat.name = 'seat'+i;
		seat.position.set(-1.6*Math.sin(i*angle), -1.6*Math.cos(i*angle), 1.5);
		seat.rotation.set(0, 0, -angle*i);

		// add nameplate for the player
		var nameplate = generateNameplate(turnOrder[i].displayName);
		nameplate.position.set(0, 0.3, -0.64);
		nameplate.rotation.set(0, 0, Math.PI/2);
		seat.add(nameplate);

		var hand = [
			['Being on fire.'],
			['Racism'],
			['Old-people','smell.'],
			['A micropenis.'],
			['Women in yogurt','commercials.'],
			['Classist','undertones.'],
			['Not giving a shit','about the Third','World.'],
			['Inserting a','mason jar into','my anus.'],
			['Court-ordered','rehab.'],
			['A windmill','full of corpses.']
		];

		for(var j=0; j<hand.length; j++)
		{
			if(i===0) var card = generateCard(hand[j]);
			else card = blankCard.clone();

			var theta = j<5 ? (j-2)*row1Sep : (j-7)*row2Sep;
			var phi = j<5 ? -row1Angle : -row2Angle;

			card.applyMatrix( sphericalToMatrix(theta, phi, cardRadius) );
			card.scale.set(2,2,2);
			seat.add(card);
		}

		root.add(seat);
	}
}
