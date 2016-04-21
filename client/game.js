'use strict';

// don't pollute the global namespace
(function(exports)
{
	var socket;
	var turnOrder = [];
	var playerInfo = {};
	var hand = [];
	var selection = []; // just from my hand

	var submissionMap = {};
	var submissionList = []; // from everyone's hand

	var blackCard = null;
	var czarId = '';

	function connectToGame(gameId)
	{
		// save player info
		if(altspace.inClient){
			altspace.getUser().then(function(userInfo)
			{
				if(userInfo && userInfo.userId && userInfo.displayName){
					playerInfo.id = userInfo.userId;
					playerInfo.displayName = userInfo.displayName;
				}
				else
				{
					var message = document.createElement('h1');
					message.innerHTML = 'You\'ve been logged out of Coherent. Log in to join.';
					document.body.insertBefore(message, document.body.children[0]);
				}
			});
		}
		else {
			playerInfo.id = Math.round(Math.random()*0x8000);
			playerInfo.displayName = 'anon'+playerInfo.id;
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

		socket.on('init', init);
		socket.on('roundReset', roundReset);

		socket.on('playerJoinRequest', playerJoinRequest);
		socket.on('playerJoin', playerJoin);
		socket.on('playerJoinDenied', playerJoinDenied);
		socket.on('playerLeave', playerLeave);
		socket.on('playerKickRequest', playerKickRequest);

		socket.on('dealCards', dealCards);
		socket.on('roundStart', roundStart);
		socket.on('cardSelection', animateSelection);

		socket.on('cardSelectionComplete', cardSelectionComplete);
	}


	function emitPlayerJoinRequest(evt){
		if(playerInfo.id)
			socket.emit('playerJoinRequest', playerInfo.id, playerInfo.displayName);
	}

	function emitPlayerLeave(evt){
		socket.emit('playerLeave', playerInfo.id, playerInfo.displayName,
			playerInfo.displayName+' has left the game.'
		);
	}

	function init(newTurnOrder, gameState, blackCard, czarId, submissions)
	{
		if(newTurnOrder.length === 0){
			gameObjects.box.rotation.set(Math.PI, 0, 0);
			gameObjects.titleCard.visible = true;
		}
		else {
			gameObjects.box.rotation.set(0, 0, 0);
			gameObjects.titleCard.visible = false;
		}

		var card = gameObjects.presentation.getObjectByName('blackCard');
		if(card){
			gameObjects.presentation.remove(card);
		}

		// generate seats for current players
		Utils.rebalanceTable(newTurnOrder, turnOrder);

		// save turn order (without reassigning obj)
		turnOrder.splice(0); turnOrder.push.apply(turnOrder, newTurnOrder);

		// hook up click-to-join handler
		gameObjects.box.removeEventListener('cursorup');
		gameObjects.box.addEventListener('cursorup', emitPlayerJoinRequest);

		// sync game state
		var states = ['roundFinished', 'roundStarted', 'playerSelectionPending', 'czarSelectionPending'];
		// deal placeholder cards to all players
		if(states.indexOf(gameState) >= 1)
			dealCards(turnOrder.length > 0 ? turnOrder[0].hand.length : 0, blackCard, czarId);
		if(states.indexOf(gameState) >= 2)
			roundStart();
		if(states.indexOf(gameState) >= 3)
			cardSelectionComplete(submissions);


	}

	// something screwed up the turn order, so restart round
	function roundReset()
	{
		// zero out black card
		if(blackCard)
		{
			blackCard.parent.remove(blackCard);
			blackCard = null;
		}
		
		// zero out czar
		czarId = '';

		// TODO: return any selected cards to their hands

		// TODO: reset any click handlers
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

		// auto-join
		//socket.emit('playerJoin', id, displayName);
	}

	function playerJoin(id, displayName, newTurnOrder)
	{
		Utils.rebalanceTable(newTurnOrder, turnOrder);
		turnOrder.splice(0); turnOrder.push.apply(turnOrder, newTurnOrder);

		gameObjects.box.rotation.set(0, 0, 0);
		gameObjects.titleCard.visible = false;

		if(id === playerInfo.id)
		{
			gameObjects.box.removeEventListener('cursorup');
			gameObjects.box.addEventListener('cursorup', function(){
				socket.emit('dealCards');
			});
		}

		// hide request dialog if present
		var seat = root.getObjectByName(playerInfo.id);
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
		var seat = root.getObjectByName(playerInfo.id);
		var dialog;
		if(dialog = seat.getObjectByName('join_'+id)){
			seat.remove(dialog);
		}
	}

	function playerLeave(id, displayName, newTurnOrder)
	{
		Utils.rebalanceTable(newTurnOrder, turnOrder);
		turnOrder.splice(0); turnOrder.push.apply(turnOrder, newTurnOrder);

		if(id === playerInfo.id)
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
		var seat = root.getObjectByName(playerInfo.id);
		if(seat)
		{
			var dialog;
			if(dialog = seat.getObjectByName('kick_'+id)){
				seat.remove(dialog);
			}
		}

		if(newTurnOrder.length === 0){
			gameObjects.box.rotation.set(Math.PI, 0, 0);
			gameObjects.titleCard.visible = true;
		}

		console.log('Player', displayName, 'has left the game.');
	}

	function playerKickRequest(id, displayName)
	{
		if(id !== playerInfo.id){
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


	function dealCards(newHand, newBlackCard, newCzarId)
	{
		if( newBlackCard && (!blackCard || newBlackCard.index !== blackCard.userData.index) )
		{
			// kill old black card
			if(blackCard && blackCard.parent){
				blackCard.parent.remove(blackCard);
			}

			// generate new card
			blackCard = Utils.generateCard(newBlackCard, 'black');
			blackCard.applyMatrix( Utils.sphericalToMatrix(0, -Math.PI/4, 0.4, 'zyx') );
			blackCard.applyMatrix( new THREE.Matrix4().makeScale(2,2,2) );
			blackCard.name = 'blackCard';
		}

		// manage player hand
		if(Array.isArray(newHand)){
			updatePlayerHand(newHand, newCzarId);
		}

		// manage the placeholders that are everyone else's hands
		else
		{
			updateAllHands(newHand, newCzarId);
		}

		czarId = newCzarId;
	}

	function updatePlayerHand(newHand, newCzarId)
	{
		// set hand
		hand = newHand;

		var seat = root.getObjectByName(playerInfo.id);

		// build a list of card positions and their contents
		var cardRoots = [];
		var curCards = {};
		for(var temp=0; temp<12; temp++)
		{
			var cardRoot = seat.getObjectByName('card'+temp);
			if(cardRoot.children.length > 0){
				var child = cardRoot.children[0];
				curCards[child.userData.index] = child;
			}

			cardRoots.push(cardRoot);
		}

		// move things around to line up with the new hand
		for(var i=0; i<hand.length; i++)
		{
			// move cards that didn't change to new position
			if(curCards[hand[i].index])
			{
				// animate from old position to new position
				curCards[hand[i].index].addBehavior(new Behaviors.Animate(cardRoots[i],
					new THREE.Vector3(0,0,0), new THREE.Quaternion(), new THREE.Vector3(2,2,2))
				);
			}
			// generate new cards for those dealt this round
			else
			{
				if(hand[i])
					var card = Utils.generateCard(hand[i], 'white');
				else
					card = Models.blankCard.clone();

				// animate from card box
				gameObjects.box.add(card);
				card.addBehavior(new Behaviors.Animate(cardRoots[i],
					new THREE.Vector3(0,0,0), new THREE.Quaternion(), new THREE.Vector3(2,2,2)
				));
			}

			if(newCzarId === playerInfo.id)
				card.visible = false;
		}

		// now hide hand if you're actually the czar this round
		if(playerInfo.id === newCzarId)
		{
			// show black card
			seat.add(blackCard);
			blackCard.addBehavior( new Behaviors.CursorFeedback() );
			blackCard.addEventListener('cursorup', function(evt){
				socket.emit('roundStart');
			});
		}
		else
		{
			// show hand
			seat.traverse(function(o){
				if( /^card/.test(o.parent.name) )
					o.visible = true;
			});
		}
	}

	function updateAllHands(handLength, newCzarId)
	{
		// update scene for all other players
		for(var playerIdx=0; playerIdx<turnOrder.length; playerIdx++)
		{
			// skip self, already done
			var player = turnOrder[playerIdx];
			if(player.id === playerInfo.id)
				continue;

			var seat = root.getObjectByName(player.id);

			var cardRoots = [];
			for(var temp=0; temp<12; temp++){
				cardRoots.push(seat.getObjectByName('card'+temp));
			}

			// generate and place new cards
			for(var i=0; i<cardRoots.length; i++)
			{
				if(cardRoots[i].children.length === 0)
				{
					// steal from position 11 first
					if(handLength <= 10 && cardRoots[10].children.length > 0){
						cardRoots[i].add(cardRoots[10].children[0]);
					}
					// steal from position 12 next
					else if(handLength <= 10 && cardRoots[11].children.length > 0){
						cardRoots[i].add(cardRoots[11].children[0]);
					}
					// if those are empty, generate new card
					else if(i < handLength)
					{
						var card = Models.blankCard.clone();

						if(player.id === newCzarId)
							card.visible = false;

						// animate from card box
						gameObjects.box.add(card);
						card.addBehavior( new Behaviors.Animate(cardRoots[i], new THREE.Vector3(0,0,0)) );
					}
				}

				if(player.id === newCzarId && cardRoots[i].children[0]){
					cardRoots[i].children[0].visible = false;
				}
			}

			if(blackCard && player.id === newCzarId)
			{
				// show black card
				seat.add(blackCard);
			}
			else
			{
				// show hand
				seat.traverse(function(o){
					if( /^card/.test(o.parent.name) )
						o.visible = true;
				});
			}

		}
	}


	function roundStart()
	{
		// identify pres area
		var seat = root.getObjectByName(playerInfo.id);
		if(seat)
			var center = seat.getObjectByName('presentation');
		else
			center = root.getObjectByName('presentation');

		// add black card to presentation area
		blackCard.removeAllBehaviors();
		blackCard.position.set(0,0,0);
		blackCard.rotation.set(-Math.PI/2,0,Math.PI);
		center.add(blackCard);

		// enable clicking on cards
		if(seat && playerInfo.id !== czarId)
		{
			// loop over hand and add click handlers
			[0,1,2,3,4,5,6,7,8,9,10,11].forEach(function(i)
			{
				var card = seat.getObjectByName('card'+i);
				card.addEventListener('cursorup', function(evt){
					handleCardSelection(i);
				});
			});

		}
	}

	function handleCardSelection(handIndex)
	{
		var seat = root.getObjectByName(playerInfo.id);
		var cardRoot = seat.getObjectByName('card'+handIndex);

		// don't add any more cards after the necessary amount
		if(selection.length >= (blackCard.userData.numResponses || 1)){
			return;
		}

		var spacing = 0.3;
		var card = cardRoot.children[0];
		card.name = 'selection'+selection.length;

		// animate
		var mat = Utils.sphericalToMatrix(spacing*selection.length/2, 0, 0.5);
		mat.multiply( new THREE.Matrix4().makeScale(2,2,2) );
		card.addBehavior( new Behaviors.Animate(seat, mat) );

		// move other cards aside for new one
		var oldCard = seat.getObjectByName('selection'+(selection.length-1));
		if(oldCard){
			mat = Utils.sphericalToMatrix(spacing*selection.length/2 - spacing, 0, 0.5);
			mat.multiply( new THREE.Matrix4().makeScale(2,2,2) );
			oldCard.addBehavior( new Behaviors.Animate(null, mat));
		}
		oldCard = seat.getObjectByName('selection'+(selection.length-2));
		if(oldCard){
			mat = Utils.sphericalToMatrix(spacing*selection.length/2 - 2*spacing, 0, 0.5);
			mat.multiply( new THREE.Matrix4().makeScale(2,2,2) );
			oldCard.addBehavior( new Behaviors.Animate(null, mat));
		}

		// add to selection
		selection.push(handIndex);

		if(selection.length === (blackCard.userData.numResponses || 1))
		{
			// clear click handlers from cards
			/*[0,1,2,3,4,5,6,7,8,9,10,11].forEach(function(i)
			{
				var card = seat.getObjectByName('card'+i);
				card.removeEventListener('cursorup');
			});*/


			// spawn confirmation boxes
			var yes = new THREE.Mesh(
				new THREE.BoxGeometry(0.01, 0.1, 0.1),
				new THREE.MeshBasicMaterial({
					map: new THREE.TextureLoader().load('check.png')
				})
			);

			var no = new THREE.Mesh(
				new THREE.BoxGeometry(0.01, 0.1, 0.1),
				new THREE.MeshBasicMaterial({
					map: new THREE.TextureLoader().load('cross.png')
				})
			);

			// place confirmation boxes
			yes.name = 'yes';
			yes.addBehavior( new Behaviors.CursorFeedback() );
			yes.applyMatrix( Utils.sphericalToMatrix(0.6, 0, 0.5, 'xyz') );
			seat.add(yes);

			no.name = 'no';
			no.addBehavior( new Behaviors.CursorFeedback() );
			no.applyMatrix( Utils.sphericalToMatrix(-0.6, 0, 0.5, 'xyz') );
			seat.add(no);

			yes.addEventListener('cursorup', exports.confirmSelection = function(evt){
				socket.emit('cardSelection', selection);
				seat.remove(yes, no);
			});

			no.addEventListener('cursorup', function(evt)
			{
				// put all the cards back
				selection.forEach(function(handIndex, selectionIndex)
				{
					var card = seat.getObjectByName('selection'+selectionIndex);
					var spot = seat.getObjectByName('card'+handIndex);
					card.position.set(0,0,0);
					card.rotation.set(0,0,0);

					// add back click handlers
					card.addEventListener('cursorup', function(evt){
						handleCardSelection(handIndex);
					});
					spot.add(card);
				});

				// zero out selection
				selection = [];

				// kill boxes
				seat.remove(yes, no);
			});
		}
	}

	function animateSelection(handIndexes, playerId)
	{
		var seat = root.getObjectByName(playerId);

		// kill confirmation boxes if necessary
		var yes = seat.getObjectByName('yes');
		if(yes){
			seat.remove(yes);
		}
		var no = seat.getObjectByName('no');
		if(no){
			seat.remove(no);
		}

		// find where selected cards should go
		var czarSeat = root.getObjectByName(czarId);
		var finalPos = new THREE.Vector3(czarSeat.position.x/2, czarSeat.position.y/2, 0.825);
		var finalRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, czarSeat.rotation.z));

		// animate to in front of czar
		for(var i=0; i<handIndexes.length; i++)
		{
			var tempCard = seat.getObjectByName('selection'+i) 
				|| seat.getObjectByName('card'+handIndexes[i]).children[0];
			if(tempCard)
			{
				// animate, and remove all but one on completion
				tempCard.addBehavior( new Behaviors.Animate(root, finalPos, finalRot, null, 600,
					function(){
						if(!root.getObjectByName('czarStack')){
							console.log('naming something czarStack');
							this.name = 'czarStack';
						}
						else {
							this.parent.remove(this);
						}
					}
				) );
			}
		}
	}

	function cardSelectionComplete(selections)
	{
		// put responses in some random order
		var displayList = [];
		for(var user in selections)
		{
			// generate card models from descriptions
			for(var i=0; i<selections[user].length; i++){
				selections[user][i] = Utils.generateCard(selections[user][i], 'white');
			}

			selections[user].playerId = user;

			// insert submission into random spot in the presentation order
			var index = Math.floor(Math.random() * displayList.length);
			displayList.splice(index, 0, selections[user]);
		}
	
		submissionMap = selections;
		submissionList = displayList;

		// replace placeholder stack with real cards
		var temp = root.getObjectByName('czarStack');
		if(temp) temp.parent.remove(temp);

		var czarSeat = root.getObjectByName(czarId);
		var finalPos = new THREE.Vector3(czarSeat.position.x/2, czarSeat.position.y/2, 0.825);
		var finalRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, czarSeat.rotation.z));

		displayList.forEach(function(item, index)
		{
			var submissionSpot = czarSeat.getObjectByName('card'+index);
			for(var j=0; j<item.length; j++)
			{
				// put card in pile
				item[j].position.copy(finalPos);
				item[j].quaternion.copy(finalRot);
				root.add(item[j]);

				// animate card to czar's hand
				item[j].addBehavior(new Behaviors.Animate(submissionSpot,
					new THREE.Vector3(0,0.01*j,-0.01*j), new THREE.Quaternion(), new THREE.Vector3(2,2,2)
				));
			}

			// add selection handlers to submissions
			if(czarId === playerInfo.id)
			{
				submissionSpot.addEventListener('cursorup', function()
				{
					console.log('Selecting submission at', index);
					handleCzarSelection(index);
				});
			}
		});

	}

	var czarSelectionIndex = -1;
	function handleCzarSelection(submissionIndex)
	{
		var seat = root.getObjectByName(czarId);
		var submission = submissionList[submissionIndex];

		// present the submission
		socket.emit('presentSubmission', submission.playerId);

		// put previous selection back
		if(czarSelectionIndex >= 0 && czarSelectionIndex !== submissionIndex)
		{
			for(var i=0; i<submissionList[czarSelectionIndex].length; i++)
			{
				var card = submissionList[czarSelectionIndex][i];
				var spot = seat.getObjectByName('card'+czarSelectionIndex);

				card.addBehavior(new Behaviors.Animate(spot,
					new THREE.Vector3(0,0.01*i,-0.01*i), new THREE.Quaternion(), new THREE.Vector3(2,2,2)
				));
			}
		}

		czarSelectionIndex = submissionIndex;

		// animate
		var spacing = 0.3;
		for(var i=0; i<submission.length; i++)
		{
			var mat = Utils.sphericalToMatrix(spacing*(-(submission.length-1)/2 + i), 0, 0.5);
			mat.multiply( new THREE.Matrix4().makeScale(2,2,2) );
			submission[i].addBehavior( new Behaviors.Animate(seat, mat) );
		}

		// spawn confirmation boxes
		var yes = new THREE.Mesh(
			new THREE.BoxGeometry(0.01, 0.1, 0.1),
			new THREE.MeshBasicMaterial({
				map: new THREE.TextureLoader().load('check.png')
			})
		);

		var no = new THREE.Mesh(
			new THREE.BoxGeometry(0.01, 0.1, 0.1),
			new THREE.MeshBasicMaterial({
				map: new THREE.TextureLoader().load('trash.png')
			})
		);

		// place confirmation boxes
		yes.name = 'yes';
		yes.addBehavior( new Behaviors.CursorFeedback() );
		yes.applyMatrix( Utils.sphericalToMatrix(0.6, 0, 0.5, 'xyz') );
		seat.add(yes);

		no.name = 'no';
		no.addBehavior( new Behaviors.CursorFeedback() );
		no.applyMatrix( Utils.sphericalToMatrix(-0.6, 0, 0.5, 'xyz') );
		seat.add(no);
	}

	var czarSelectionPlayer = '';
	function presentSubmission(playerId)
	{
		var seat = root.getObjectByName(playerInfo.id);
		if(seat)
			var center = seat.getObjectByName('presentation');
		else
			center = root.getObjectByName('presentation');

		var submission = submissionMap[playerId];

		// clear old cards
		if(czarSelectionPlayer && czarSelectionPlayer !== playerId)
		{
			var oldSubmission = submissionMap[czarSelectionPlayer];
			for(var i=0; i<oldSubmission.length; i++){
				center.remove(oldSubmission[i]);
			}
		}

		czarSelectionPlayer = playerId;

		// reposition black card
	}

	// export objects from scope
	exports.socket = socket;
	exports.turnOrder = turnOrder;
	exports.playerInfo = playerInfo;

	exports.connectToGame = connectToGame;

})(window.Game = window.Game || {});
