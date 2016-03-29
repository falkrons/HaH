'use strict';
var config = require('../config.json');

var turnOrder = {};
var socketForPlayer = {};

/*
 * Handle requests to join the game
 */
var pendingJoinRequests = {};
function joinRequest(id, displayName)
{
	// initialize game when first player requests to join
	if( !turnOrder[this.gameId] )
		turnOrder[this.gameId] = [];

	if( !pendingJoinRequests[this.gameId] )
		pendingJoinRequests[this.gameId] = [];

	// don't allow a single client two usernames
	if(!this.playerId){
		// associate socket with player
		this.playerId = id;	
		socketForPlayer[id] = this;
	}
	else if(this.playerId !== id){
		return;
	}

	// check if requesting player is already in the game
	for(var i=0, playerIn = false; i<turnOrder[this.gameId].length && !playerIn; i++){
		playerIn = playerIn || turnOrder[this.gameId][i].playerId === id;
	}

	// ignore join requests if there's already a request pending
	// or the player is already in the game
	if(playerIn || pendingJoinRequests[this.gameId].indexOf(id) > -1){
		return;
	}

	// automatically accept players when the game is under minimum
	else if( turnOrder[this.gameId].length < config.minPlayers )
	{
		join.call(this, id, displayName);
	}

	// deny new players when the game is at max
	else if( turnOrder[this.gameId].length >= config.maxPlayers )
	{
		this.emit('playerJoinDenied', 'Game is already full.');
	}

	// otherwise ask current players to join
	else
	{
		pendingJoinRequests[this.gameId].push(id);
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
	var playerGame = socketForPlayer[id].gameId;
	var denierInGame = false;
	for(var i=0; i<turnOrder[playerGame].length; i++){
		if(turnOrder[playerGame][i].playerId === this.playerId){
			denierInGame = true;
			break;
		}
	}
	if(!denierInGame)
		return;

	// remove pending request
	var index = pendingJoinRequests[playerGame].indexOf(id);
	if(index > -1)
		pendingJoinRequests[playerGame].splice(index, 1);

	// inform requester of denial
	socketForPlayer[id].emit('playerJoinDenied', id, displayName, 'A player has denied your request to join.');
	this.server.to(playerGame+'_players').emit('playerJoinDenied', id, displayName);
}


/*
 * Request to join has been accepted
 */
function join(id, displayName)
{
	// check if player is already in the game
	for(var i=0, playerIn = false; i<turnOrder[this.gameId].length && !playerIn; i++){
		playerIn = playerIn || turnOrder[this.gameId][i].playerId === id;
	}

	// ignore joins from current players
	if(playerIn){
		console.log('Ignoring double-join for', displayName);
		return;
	}

	// check if player approving join is actually in the game
	var playerGame = socketForPlayer[id].gameId;
	var joinerInGame = false;
	for(var i=0; i<turnOrder[playerGame].length; i++){
		if(turnOrder[playerGame][i].playerId === this.playerId){
			joinerInGame = true;
			break;
		}
	}

	// deny join if authorization required, but not present
	if( turnOrder[playerGame].length >= config.minPlayers && !joinerInGame ){
		console.log('Client not authorized');
		return;
	}

	// subscribe client to player-only events
	socketForPlayer[id].join(playerGame+'_players');

	// add player to the end of the turn order
	var newPlayer = {'playerId': id, 'displayName': displayName};
	turnOrder[playerGame].push(newPlayer);

	// let other clients know about new player
	this.server.to(playerGame+'_clients').emit('playerJoin', id, displayName, turnOrder[playerGame]);

	// trigger leave if socket is disconnected
	socketForPlayer[id].on('disconnect', function(){
		leave.call(this, id, displayName, displayName+' has disconnected.');
	});

	// remove pending request
	var index = pendingJoinRequests[playerGame].indexOf(id);
	if(index > -1)
		pendingJoinRequests[playerGame].splice(index, 1);

	console.log('Player', displayName, 'has joined game', playerGame);
}


/*
 * Leave game, voluntarily or otherwise
 */
function leave(id, displayName, message)
{
	if(!id)
		return;
	
	// check if kicker is actually in the game
	var playerGame = socketForPlayer[id].gameId;
	var kickerInGame = false;
	for(var i=0; i<turnOrder[playerGame].length; i++){
		if(turnOrder[playerGame][i].playerId === this.playerId){
			kickerInGame = true;
			break;
		}
	}
	if( !kickerInGame )
		return;

	// find player in turn order
	for(var i=0; i<turnOrder[playerGame].length; i++)
	{
		// remove specified player
		if(turnOrder[playerGame][i].playerId === id){
			turnOrder[playerGame].splice(i, 1);
			break;
		}
	}

	// disconnect given client from players-only channel
	socketForPlayer[id].leave(playerGame+'_players');

	// inform other clients of player's departure
	this.server.to(playerGame+'_clients').emit('playerLeave', id, displayName, turnOrder[playerGame], message);

	console.log('Player', displayName, 'has left the game.');
}

var votesInProgress = {};

function kickRequest(id, displayName)
{
	// check if kicker is actually in the game
	var playerGame = socketForPlayer[id].gameId;
	var kickerInGame = false;
	for(var i=0; i<turnOrder[playerGame].length; i++){
		if(turnOrder[playerGame][i].playerId === this.playerId){
			kickerInGame = true;
			break;
		}
	}
	if( !kickerInGame )
		return;

	// vote to kick, and ask everyone else
	votesInProgress[id] = {
		'yes': 0, 'no': 0,
		'majority': Math.ceil((turnOrder[playerGame].length-1)/2)
	};
	kickResponse.call(this, id, displayName, true);
	if(turnOrder[playerGame].length > 2)
		this.server.to(playerGame+'_players').emit('playerKickRequest', id, displayName);
}

function kickResponse(id, displayName, response)
{
	// check if kicker is actually in the game
	var playerGame = socketForPlayer[id].gameId;
	var kickerInGame = false;
	for(var i=0; i<turnOrder[playerGame].length; i++){
		if(turnOrder[playerGame][i].playerId === this.playerId){
			kickerInGame = true;
			break;
		}
	}
	if( !kickerInGame )
		return;

	// log vote
	var vote = votesInProgress[id];
	vote[response ? 'yes' : 'no']++;
	
	// check results
	if(vote.yes >= vote.majority)
	{
		// vote passes
		leave.call(this, id, displayName, displayName+' was kicked from the game.');
	}
	else if(vote.no >= vote.majority)
	{
		// vote fails
		this.server.to(playerGame+'_players').emit('kickVoteAborted', id, displayName);
	}
	// else keep waiting for responses
}

module.exports = {
	//export player info
	turnOrder: turnOrder,
	socketForPlayer: socketForPlayer,

	// export event handlers
	joinRequest: joinRequest,
	joinDenied: joinDenied,
	join: join,
	leave: leave,
	kickRequest: kickRequest
};
