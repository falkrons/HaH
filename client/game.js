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

	for(var i=0; i<turnOrder.length; i++)
	{
		var seat = new THREE.Object3D();
		seat.name = 'seat'+i;
		seat.position.set(-1.6*Math.sin(i*angle), -1.6*Math.cos(i*angle), 1.5);
		seat.rotation.set(0, 0, -angle*i);

		// scope seat for the async methods
		(function(seat)
		{
			generateNameplate(turnOrder[i].displayName, function(model){
				model.position.set(0, 0.3, -0.64);
				model.rotation.set(0, 0, Math.PI/2);
				seat.add(model);
			});

			function handleCard(theta, phi, radius)
			{
				return function(card)
				{
					card.applyMatrix( sphericalToMatrix(theta, phi, radius) );
					card.scale.set(2, 2, 2);
					seat.add(card);
				};
			}

			var cardRadius = 0.5, row1Angle = Math.PI/5, row2Angle = Math.PI/3, row1Sep = Math.PI/10, row2Sep = 1.5*Math.PI/10;

			generateCard(['Being on fire.'],                 handleCard(-2*row1Sep, -row1Angle, cardRadius));
			generateCard(['Racism'],                         handleCard(-1*row1Sep, -row1Angle, cardRadius));
			generateCard(['Old-people','smell.'],            handleCard( 0,         -row1Angle, cardRadius));
			generateCard(['A micropenis.'],                  handleCard( 1*row1Sep, -row1Angle, cardRadius));
			generateCard(['Women in yogurt','commercials.'], handleCard( 2*row1Sep, -row1Angle, cardRadius));

			generateCard(['Classist','undertones.'],         handleCard(-2*row2Sep, -row2Angle, cardRadius));
			generateCard(['Not giving a shit','about the Third','World.'], handleCard(-1*row2Sep, -row2Angle, cardRadius));
			generateCard(['Inserting a','mason jar into','my anus.'], handleCard( 0,-row2Angle, cardRadius));
			generateCard(['Court-ordered','rehab.'],         handleCard( 1*row2Sep, -row2Angle, cardRadius));
			generateCard(['A windmill','full of corpses.'],  handleCard( 2*row2Sep, -row2Angle, cardRadius));

		})(seat);

		root.add(seat);
	}
}
