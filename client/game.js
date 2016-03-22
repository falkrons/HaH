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

		(function(seat){
			generateNameplate(turnOrder[i].displayName, function(model){
				model.position.set(0, 0.3, -0.64);
				model.rotation.set(0, 0, Math.PI/2);
				seat.add(model);
			});
		})(seat);

		root.add(seat);
	}
}
