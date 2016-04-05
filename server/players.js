'use strict';
var config = require('../config.json'),
	structs = require('./structures.js');

var activeGames = structs.activeGames;


/*
 * Handle requests to join the game
 */
function joinRequest(id, displayName)
{
	var game = activeGames[this.gameId];

	// check if this player is already pending or joined
	if( game.playerForSocket(this) ){
		this.emit('error', 'You are already a player. Ignoring redundant request.');
		return;
	}
	else if( game.joinRequestForSocket(this) ){
		this.emit('error', 'You already have a pending join request. Ignoring redundant request.');
		return;
	}

	var player = new structs.Player(id, displayName, this);

	// automatically accept players when the game is under minimum
	if( game.turnOrder.length < config.minPlayers )
	{
		game.pendingJoinRequests.push(player);
		join.call(this, id, displayName);
	}

	// deny new players when the game is at max
	else if( game.turnOrder.length >= config.maxPlayers )
	{
		this.emit('playerJoinDenied', 'Game is already full.');
	}

	// otherwise ask current players to join
	else
	{
		game.pendingJoinRequests.push(player);
		this.server.to(game.id+'_players').emit('playerJoinRequest', id, displayName);
		console.log('Player', displayName, 'is trying to join', game.id);
	}
}


/*
 * Request to join has been denied
 */
function joinDenied(id, displayName, message)
{
	var game = activeGames[this.gameId];

	// check if player denying join is actually in the game
	var denier = game.playerForSocket(this);
	if(!denier){
		this.emit('error', 'Only current players can deny a join request');
		return;
	}

	// check for pending request
	var request = game.joinRequestForId(id);
	if(!request){
		this.emit('error', 'No such pending request. Ignoring denial.');
		return;
	}

	// remove pending request
	var index = game.pendingJoinRequests.indexOf(request);
	game.pendingJoinRequests.splice(index, 1);

	// inform requester of denial
	request.socket.emit('playerJoinDenied', request.id, request.displayName, 'A player has denied your request to join.');
	this.server.to(game.id+'_players').emit('playerJoinDenied', request.id, request.displayName,
		denier.displayName+' has declined '+request.displayName+'\'s request to join.');
}


/*
 * Request to join has been accepted
 */
function join(id, displayName)
{
	var game = activeGames[this.gameId];

	// make sure person clearing join request is in game
	var approver = game.playerForSocket(this);
	if( game.turnOrder.length >= config.minPlayers && !approver ){
		this.emit('error', 'Only current players can approve join requests. Ignoring.');
		return;
	}

	// make sure request is valid
	var player = game.joinRequestForId(id);
	if(!player){
		this.emit('error', 'No join request with that ID, ignoring.');
		return;
	}

	// remove pending join request
	var index = game.pendingJoinRequests.indexOf(player);
	game.pendingJoinRequests.splice(index, 1);

	// subscribe client to player-only events
	player.socket.join(game.id+'_players');

	// add player to the end of the turn order
	game.turnOrder.push(player);

	// let other clients know about new player
	this.server.to(game.id+'_clients').emit('playerJoin', player.id, player.displayName, game.turnOrder);

	console.log('Player', displayName, 'has joined game', playerGame);
}


/*
 * Leave game, voluntarily or otherwise
 */
function leave(id, displayName, message)
{
	var game = activeGames[this.gameId];

	// check if player is actually in the game
	var player = game.playerForId(id);
	if(!player){
		this.emit('error', 'No such player with id '+id);
		return;
	}

	// check if kicker is actually in the game (can't actually happen)
	var kicker = game.playerForSocket(this);
	if(!kicker){
		this.emit('error', 'Only current players can leave the game');
		return;
	}

	// remove player from turn order
	var index = game.turnOrder.indexOf(player);
	game.turnOrder.splice(index, 1);

	// disconnect given client from players-only channel
	player.socket.leave(game.id+'_players');

	// inform other clients of player's departure
	this.server.to(game.id+'_clients').emit('playerLeave', player.id, player.displayName, game.turnOrder, message);

	console.log('Player', player.displayName, 'has left the game.');
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

	// abort for invalid player or vote in progress
	if( !kickerInGame || votesInProgress[id] )
		return;

	console.log('Voting to kick', displayName);

	// vote to kick, and ask everyone else
	votesInProgress[id] = {
		'yes': 0, 'no': 0,
		'majority': Math.ceil((turnOrder[playerGame].length-1)/2),
		'voters': []
	};
	kickResponse.call(this, id, displayName, true);
	if(turnOrder[playerGame].length > 3)
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
	// only non-accused players of the current game that haven't voted yet
	if( !kickerInGame || id === this.playerId || votesInProgress[id].voters.indexOf(this.playerId) > -1)
		return;

	// log vote
	var vote = votesInProgress[id];
	vote[response ? 'yes' : 'no']++;
	vote.voters.push(this.playerId);
	
	// check results
	if(vote.yes >= vote.majority)
	{
		// vote passes
		console.log('Vote to kick', displayName, 'passes');
		leave.call(this, id, displayName, displayName+' was kicked from the game.');
		delete votesInProgress[id];
	}
	else if(vote.no >= vote.majority)
	{
		// vote fails
		console.log('Vote to kick', displayName, 'fails');
		this.server.to(playerGame+'_players').emit('kickVoteAborted', id, displayName);
		delete votesInProgress[id];
	}
	// else keep waiting for responses
}

module.exports = {
	// export event handlers
	joinRequest: joinRequest,
	joinDenied: joinDenied,
	join: join,
	leave: leave,
	kickRequest: kickRequest,
	kickResponse: kickResponse
};
