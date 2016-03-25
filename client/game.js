'use strict';


var socket;
var turnOrder = [];
var playerInfo = null;

function connectToGame(gameId)
{
	// save player info
	if(altspace.inClient){
		altspace.getUser().then(function(userInfo){
			playerInfo = {
				playerId: userInfo.userId,
				displayName: userInfo.displayName
			};
			gameObjects.box.addEventListener('cursorup', emitPlayerJoinRequest);
		});
	}
	else {
		playerInfo = {};
	}

	// initialize the socket connection
	socket = io('/?gameId='+gameId);

	// debug listener
	var onevent = socket.onevent;
	socket.onevent = function(packet){
		var args = packet.data || [];
		onevent.call(this, packet);
		packet.data = ['*'].concat(args);
		onevent.call(this, packet);
	};
	socket.on('*', function(){
		console.log(arguments);
	});

	socket.on('error', function(msg){
		console.error(msg);
	});

	socket.on('init', function(newTurnOrder){
		rebalanceTable(newTurnOrder, turnOrder);
		turnOrder = newTurnOrder;
	});

	socket.on('playerJoin', playerJoin);
	socket.on('playerLeave', playerLeave);
}

function emitPlayerJoinRequest(evt)
{
	socket.emit('playerJoinRequest', playerInfo.playerId, playerInfo.displayName);
}

function playerJoin(id, displayName, newTurnOrder)
{
	if(id === playerInfo.playerId){
		gameObjects.box.removeEventListener('cursorup', emitPlayerJoinRequest);
	}

	rebalanceTable(newTurnOrder, turnOrder);
	turnOrder = newTurnOrder;
	console.log('New player joined:', displayName);
}

function playerLeave(id, displayName, newTurnOrder)
{
	rebalanceTable(newTurnOrder, turnOrder);
	turnOrder = newTurnOrder;
	console.log('Player', displayName, 'has left the game.');
	
}


/*
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
*/
