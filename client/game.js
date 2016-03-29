'use strict';

// don't pollute the global namespace
(function(exports)
{
	var socket;
	var turnOrder = [];
	var playerInfo = {};

	function connectToGame(gameId)
	{
		// save player info
		if(altspace.inClient){
			altspace.getUser().then(function(userInfo)
			{
				playerInfo.playerId = userInfo.userId;
				playerInfo.displayName = userInfo.displayName;
			});
		}
		else {
			playerInfo.playerId = Math.round(Math.random()*0x8000);
			playerInfo.displayName = 'anon'+playerInfo.playerId;
		}

		// initialize the socket connection
		Game.socket = socket = io('/?gameId='+gameId);

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
			Utils.rebalanceTable(newTurnOrder, turnOrder);
			turnOrder.splice(0); turnOrder.push.apply(turnOrder, newTurnOrder);
			gameObjects.box.removeEventListener('cursorup');
			gameObjects.box.addEventListener('cursorup', emitPlayerJoinRequest);
		});

		socket.on('playerJoinRequest', playerJoinRequest);
		socket.on('playerJoin', playerJoin);
		socket.on('playerJoinDenied', playerJoinDenied);
		socket.on('playerLeave', playerLeave);
		socket.on('playerKickRequest', playerKickRequest);
	}

	
	function emitPlayerJoinRequest(evt){
		socket.emit('playerJoinRequest', playerInfo.playerId, playerInfo.displayName);
	}

	function emitPlayerLeave(evt){
		socket.emit('playerLeave', playerInfo.playerId, playerInfo.displayName,
			playerInfo.displayName+' has left the game.'
		);
	}
	
	function playerJoinRequest(id, displayName)
	{
		var dialog = Utils.generateDialog('Can this player join?\n'+displayName,
			function(){
				socket.emit('playerJoin', id, displayName);
			},
			function(){
				socket.emit('playerJoinDenied', id, displayName);
			}
		);
		dialog.name = 'join_'+id;
	}
	
	function playerJoin(id, displayName, newTurnOrder)
	{
		Utils.rebalanceTable(newTurnOrder, turnOrder);
		turnOrder.splice(0); turnOrder.push.apply(turnOrder, newTurnOrder);

		if(id === playerInfo.playerId){
			gameObjects.box.removeEventListener('cursorup');
			// add listener "deal"
		}

		// hide request dialog if present
		var seat = root.getObjectByName(playerInfo.playerId);
		if(seat)
		{
			var dialog;
			if(dialog = seat.getObjectByName('join_'+id)){
				seat.remove(dialog);
			}
		}

		console.log('New player joined:', displayName);
	}

	function playerJoinDenied(id, displayName)
	{
		// hide request dialog if present
		var seat = root.getObjectByName(playerInfo.playerId);
		var dialog;
		if(dialog = seat.getObjectByName('join_'+id)){
			seat.remove(dialog);
		}
	}

	function playerLeave(id, displayName, newTurnOrder)
	{
		Utils.rebalanceTable(newTurnOrder, turnOrder);
		turnOrder.splice(0); turnOrder.push.apply(turnOrder, newTurnOrder);

		if(id === playerInfo.playerId)
		{
			gameObjects.box.removeEventListener('cursorup');
			gameObjects.box.addEventListener(emitPlayerJoinRequest);
			
			root.traverse(function(model){
				if(model.name === 'nameplate'){
					model.removeEventListener('cursorup');
				}
			});
		}

		// hide request dialog if present
		var seat = root.getObjectByName(playerInfo.playerId);
		if(seat)
		{
			var dialog;
			if(dialog = seat.getObjectByName('kick_'+id)){
				seat.remove(dialog);
			}

		}

		console.log('Player', displayName, 'has left the game.');
	}
	
	function playerKickRequest(id, displayName)
	{
		if(id !== playerInfo.playerId){
			var dialog = Utils.generateDialog('Do you want to kick\n'+displayName+'?',
				function(){
					socket.emit('playerKickResponse', id, displayName, true);
				},
				function(){
					socket.emit('playerKickResponse', id, displayName, false);
				}
			);
			dialog.name = 'kick_'+id;
		}
	}

	
	// export objects from scope
	exports.socket = socket;
	exports.turnOrder = turnOrder;
	exports.playerInfo = playerInfo;

	exports.connectToGame = connectToGame;

})(window.Game = window.Game || {});

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
