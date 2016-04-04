'use strict';

// don't pollute the global namespace
(function(exports)
{
	var socket;
	var turnOrder = [];
	var playerInfo = {};
	var hand = [];
	var blackCard = null;
	
	var cardNodes = [null,null,null,null,null,null,null,null,null,null,null,null];
	var blackCardNode = null;

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
		
		socket.on('dealCards', dealCards);
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

		if(id === playerInfo.playerId)
		{
			gameObjects.box.removeEventListener('cursorup');
			gameObjects.box.addEventListener('cursorup', function(){
				socket.emit('dealCards');
			});
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

	
	function dealCards(newCards, newBlackCard, czarId)
	{
		var seat = root.getObjectByName(playerInfo.playerId);
		var cardRadius = 0.5, row1Angle = Math.PI/5, row2Angle = Math.PI/3,
			row1Sep = Math.PI/10, row2Sep = 1.5*Math.PI/10;
		
		// add cards to hand
		hand.push.apply(hand, newCards);
		blackCard = newBlackCard;
		
		// generate and place new cards
		for(var i=0; i<newCards.length; i++)
		{
			var card = Utils.generateCard(newCards[i].text.split('\n'));
			for(var j=0; j<cardNodes.length; j++){
				if(cardNodes[j] === null)
					break;
			}
			card.name = 'card'+j;
			cardNodes[j] = card;
			
			// place card
			if(j<5){
				var theta = (j-2)*row1Sep;
				var phi = -row1Angle;
			}
			else if(j < 10){
				theta = (j-7)*row2Sep;
				phi = -row2Angle;
			}
			else if(j === 10){
				var theta = -3*row1Sep;
				var phi = -row1Angle;
			}
			else if(j === 11){
				var theta = 3*row1Sep;
				var phi = -row1Angle;
			}

			card.applyMatrix( Utils.sphericalToMatrix(theta, phi, cardRadius, 'zyx') );
			card.scale.set(2,2,2);
			seat.add(card);
		}
		
		
		if(playerInfo.playerId === czarId)
		{
			// hide hand
			/*for(var i=0; i<hand.length; i++){
				if( hand[i] ){
					hand[i].visible = false;
				}
			}*/
			
			
		}
		else
		{
			for(var i=0; i<cardNodes.length; i++){
				if( cardNodes[i] ){
					cardNodes[i].visible = true;
				}
			}
		}
	}
	
	// export objects from scope
	exports.socket = socket;
	exports.turnOrder = turnOrder;
	exports.playerInfo = playerInfo;

	exports.connectToGame = connectToGame;

})(window.Game = window.Game || {});
