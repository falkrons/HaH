'use strict';
var config = require('../config.json'),
	structs = require('./structures.js'),
	libgame = require('./game.js');

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

	if(game.playerForId(id)){
		this.emit('error', 'Player '+id+' is already in the game');
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
	this.server.to(game.id+'_clients').emit('playerJoin', player.id, player.displayName, game.getCleanTurnOrder());

	console.log('Player', displayName, 'has joined game', game.id);
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

	// discard player's hand
	game.deck.discardWhiteCards(player.hand);

	// disconnect given client from players-only channel
	player.socket.leave(game.id+'_players');

	// remove pending kick votes (if any)
	var kickIndex = game.pendingKickVotes.indexOf(game.kickVoteForId(player.id));
	if(kickIndex > -1){
		game.pendingKickVotes.splice(kickIndex, 1);
	}

	// inform other clients of player's departure
	this.server.to(game.id+'_clients').emit('playerLeave',
		player.id, player.displayName, game.getCleanTurnOrder(), message);

	console.log('Player', player.displayName, 'has left the game.');

	// reinitialize game if last player leaves
	if(game.turnOrder.length === 0){
		activeGames[this.gameId] = new structs.Game(this.gameId);
	}

	// game is interrupted, reset
	else if(game.turnOrder.length < 3 || index === game.czar){
		game.resetRound(this.server);
		game.czar = game.czar % game.turnOrder.length;
	}

	// keep czar index up to date
	else if(index < game.czar){
		console.log(index, game.czar);
		game.czar--;
	}

	// see if left player was holding up game
	if(game.state === 'playerSelectionPending'){
		libgame.checkForLastSelection.call(this, game);
	}
}

function kickRequest(id)
{
	var game = activeGames[this.gameId];

	// check if player is in game
	var player = game.playerForId(id);
	if(!player){
		this.emit('error', 'No player with id '+id);
		return;
	}

	// check if kicker is in the game
	var kicker = game.playerForSocket(this);
	if(!kicker){
		this.emit('error', 'Only players can vote to kick');
		return;
	}

	if(game.kickVoteForId(id)){
		this.emit('error', 'Vote to kick player already in progress');
		return;
	}

	console.log('Voting to kick', player.id);

	// vote to kick
	game.pendingKickVotes.push({
		'player': player,
		'yes': 0, 'no': 0,
		'majority': Math.ceil((turnOrder[playerGame].length-1)/2),
		'voters': []
	});
	kickResponse.call(this, player.id, player.displayName, true);

	// ask everyone else (if one vote isn't enough)
	if(game.turnOrder.length > 3)
		this.server.to(game.id+'_players').emit('playerKickRequest', player.id, player.displayName);

}

function kickResponse(id, displayName, response)
{
	var game = activeGames[this.gameId];
	var vote = game.kickVoteForId(id);
	var voter = game.playerForSocket(this);


	// check if vote in progress
	if(!vote){
		this.emit('error', 'No active vote to kick '+id);
		return;
	}

	// check if kicker is actually in the game
	else if(!voter){
		this.emit('error', 'Only players can vote to kick.');
		return;
	}

	// check for multiple votes
	else if(vote.voters.indexOf(voter) > -1){
		this.emit('error', 'Can only vote once');
		return;
	}

	else if(voter.id === vote.player.id){
		this.emit('error', 'Cannot participate in vote to kick yourself.');
		return;
	}

	// log vote
	vote[response ? 'yes' : 'no']++;
	vote.voters.push(voter);

	// check results
	if(vote.yes >= vote.majority)
	{
		// vote passes
		console.log('Vote to kick', vote.player.displayName, 'passes');
		leave.call(this, vote.player.id, vote.player.displayName,
			vote.player.displayName+' was kicked from the game.');

		// clear pending vote
		var index = game.pendingKickVotes.indexOf(vote);
		game.pendingKickVotes.splice(index, 1);
	}
	else if(vote.no >= vote.majority)
	{
		// vote fails
		console.log('Vote to kick', vote.player.displayName, 'fails');
		this.server.to(game.id+'_players').emit('kickVoteAborted', vote.player.id, vote.player.displayName);

		// clear pending vote
		var index = game.pendingKickVotes.indexOf(vote);
		game.pendingKickVotes.splice(index, 1);
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
