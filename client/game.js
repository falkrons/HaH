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

			function sphericalToXYZ(theta, phi, radius)
			{
				var x = radius * Math.cos(phi) * Math.sin(theta);
				var y = radius * Math.cos(phi) * Math.cos(theta);
				var z = radius * Math.sin(phi);
				return [x,y,z];
			}

			function handleCard(theta, phi, radius)
			{
				return function(card)
				{
					card.position.set.apply(card.position, sphericalToXYZ(theta, phi, radius));
					card.rotation.set(Math.PI/2 + phi, -theta, 0);
					card.scale.set(2, 2, 2);
					seat.add(card);
				};
			}

			var cardRadius = 0.5, row1Angle = Math.PI/5, row2Angle = Math.PI/3, horizAngle = Math.PI/10;

			generateCard(['Being on fire.'], handleCard(-2*horizAngle, -row1Angle, cardRadius));
			generateCard(['Racism'], handleCard(-1*horizAngle, -row1Angle, cardRadius));
			generateCard(['Old-people','smell.'], handleCard(0, -row1Angle, cardRadius));
			generateCard(['A micropenis.'], handleCard(1*horizAngle, -row1Angle, cardRadius));
			generateCard(['Women in yogurt','commercials.'], handleCard(2*horizAngle, -row1Angle, cardRadius));

			generateCard(['Being on fire.'], handleCard(-2.2*horizAngle, -row2Angle, cardRadius));
			generateCard(['Racism'], handleCard(-1.1*horizAngle, -row2Angle, cardRadius));
			generateCard(['Old-people','smell.'], handleCard(0, -row2Angle, cardRadius));
			generateCard(['A micropenis.'], handleCard(1.1*horizAngle, -row2Angle, cardRadius));
			generateCard(['Women in yogurt','commercials.'], handleCard(2.2*horizAngle, -row2Angle, cardRadius));

		})(seat);

		root.add(seat);
	}
}
