'use strict';
var config = require('../config.json');

var turnOrder = {};
var socketForPlayer = {};

/*
 * Handle requests to join the game
 */
function joinRequest(id, displayName)
{
	// initialize game when first player requests to join
	if( !turnOrder[this.gameId] )
		turnOrder[this.gameId] = [];

	// don't allow double-register; one player name per socket
	for(var j=0, playerIn=false; j<turnOrder[this.gameId].length && !playerIn; j++){
		playerIn = playerIn || turnOrder[this.gameId][j].playerId === id;
	}
	if(this.playerId && (this.playerId !== id || playerIn)){
		console.log('Attempting to double-register client. Ignoring.');
		return;
	}
	else {
		// associate socket with player
		this.playerId = id;	
		socketForPlayer[id] = this;
	}

	// automatically accept players when the game is under minimum
	if( !turnOrder[this.gameId] || turnOrder[this.gameId].length < 4 )
	{
		join.call(this, id, displayName);
	}

	// deny new players when the game is at max
	else if( turnOrder[this.gameId].length >= 12 )
	{
		this.emit('playerJoinDenied', 'Game is already full.');
	}

	// otherwise ask current players to join
	else
	{
		this.server.to(this.gameId+'_players').emit('playerJoinRequest', id, displayName);
		console.log('Player', displayName, 'is trying to join', this.gameId);
	}
}


/*
 * Request to join has been denied
 */
function joinDenied(id, displayName, message)
{	
	// check if player denying join is actually in the game
	var denierInGame = false;
	for(var i=0; i<turnOrder[this.gameId].length; i++){
		denierInGame = denierInGame || turnOrder[this.gameId][i].playerId === this.playerId;
	}

	// ignore join denial if denier isn't in the same game as player requested
	// (shouldn't ever happen, but better safe than sorry)
	if( socketForPlayer[id].gameId !== this.gameId || !denierInGame )
		return;

	// inform requester of denial
	socketForPlayer[id].emit('playerJoinDenied', id, displayName, 'A player has denied your request to join.');
}


/*
 * Request to join has been accepted
 */
function join(id, displayName)
{
	// check if player approving join is actually in the game
	var joinerInGame = false;
	for(var i=0; i<turnOrder[this.gameId].length; i++){
		joinerInGame = joinerInGame || turnOrder[this.gameId][i].playerId === this.playerId;
	}

	// ignore join approval if approver isn't in the same game as player requested
	// (shouldn't ever happen, but better safe than sorry)
	if( socketForPlayer[id].gameId !== this.gameId
		|| turnOrder[this.gameId].length >=4 && !joinerInGame
	){
		console.log('Client not authorized');
		return;
	}

	// subscribe client to player-only events
	socketForPlayer[id].join(this.gameId+'_players');

	// add player to the end of the turn order
	var newPlayer = {'playerId': id, 'displayName': displayName};
	turnOrder[this.gameId].push(newPlayer);

	// let other clients know about new player
	this.server.to(this.gameId+'_clients').emit('playerJoin', id, displayName, turnOrder[this.gameId]);

	// trigger leave if socket is disconnected
	socketForPlayer[id].on('disconnect', function(){
		leave.call(this, id, displayName, displayName+' has disconnected.');
	});

	console.log('Player', displayName, 'has joined game', this.gameId);
}


/*
 * Leave game, voluntarily or otherwise
 */
function leave(id, displayName, message)
{
	// check if kicker is actually in the game
	var kickerInGame = false;
	for(var i=0; i<turnOrder[this.gameId].length; i++){
		kickerInGame = kickerInGame || turnOrder[this.gameId][i].playerId === this.playerId;
	}

	// ignore kick if kicker isn't in the same game as player requested
	// (shouldn't ever happen, but better safe than sorry)
	if( socketForPlayer[id].gameId !== this.gameId || !kickerInGame )
		return;

	// find player in turn order
	for(var i=0; i<turnOrder[this.gameId].length; i++)
	{
		// remove specified player
		if(turnOrder[this.gameId][i].playerId === id){
			turnOrder[this.gameId].splice(i, 1);
			break;
		}
	}

	// disconnect given client from players-only channel
	socketForPlayer[id].leave(this.gameId+'_players');

	// inform other clients of player's departure
	this.server.to(this.gameId+'_clients').emit('playerLeave', id, displayName, turnOrder[this.gameId], message);

	console.log('Player', displayName, 'has left the game.');
}


// export player info
exports.turnOrder = turnOrder;
exports.socketForPlayer = socketForPlayer;

// export event handlers
exports.joinRequest = joinRequest;
exports.joinDenied = joinDenied;
exports.join = join;
exports.leave = leave;

