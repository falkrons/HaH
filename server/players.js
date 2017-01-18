'use strict';
var config = require('./config.js'),
	structs = require('./structures.js'),
	libgame = require('./game.js');

var activeGames = structs.activeGames;

/*
 * Handle requests to join the game
 */
function joinRequest(id, displayName)
{
	var game = activeGames[this.gameId];

	if( game.lockIds && game.lockIds.indexOf(id) === -1 ) {
		this.emit('error', 'This game is locked to certain players.');
		console.log('['+this.gameId+'] Player join rejected: non-VIP request');
		return;
	}

	// check if this player is already pending or joined
	if( game.playerForSocket(this) ){
		this.emit('error', 'You are already a player. Ignoring redundant request.');
		console.log('['+this.gameId+'] Player join rejected: already in game');
		return;
	}
	else if( game.joinRequestForSocket(this) ){
		this.emit('error', 'You already have a pending join request. Ignoring redundant request.');
		console.log('['+this.gameId+'] Player join rejected: prior request pending');
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
		console.log('['+this.gameId+'] Player join rejected: room is full');
	}

	// otherwise ask current players to join
	else
	{
		game.pendingJoinRequests.push(player);
		this.server.to(game.id+'_players').emit('playerJoinRequest', id, displayName);
		console.log('['+this.gameId+'] Player '+id+' is trying to join');
	}
}


/*
 * Request to join has been denied
 */
function joinDenied(id)
{
	var game = activeGames[this.gameId];

	// check if player denying join is actually in the game
	var denier = game.playerForSocket(this);
	if(!denier){
		this.emit('error', 'Only current players can deny a join request');
		console.log('['+this.gameId+'] Player '+denier.id+' submitted invalid join denial');
		return;
	}

	// check for pending request
	var request = game.joinRequestForId(id);
	if(!request){
		this.emit('error', 'No such pending request. Ignoring denial.');
		console.log('['+this.gameId+'] Player '+denier.id+' submitted non-existent join denial');
		return;
	}

	// remove pending request
	var index = game.pendingJoinRequests.indexOf(request);
	game.pendingJoinRequests.splice(index, 1);

	// inform requester of denial
	request.socket.emit('playerJoinDenied', request.id, request.displayName, 'A player has denied your request to join.');
	this.server.to(game.id+'_players').emit('playerJoinDenied', request.id, request.displayName,
		denier.displayName+' has declined '+request.displayName+'\'s request to join.');
	console.log('['+this.gameId+'] Player '+id+' join rejected');
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
		console.log('['+this.gameId+'] Player '+approver.id+' submitted invalid join approval');
		return;
	}

	// make sure request is valid
	var player = game.joinRequestForId(id);
	if(!player){
		this.emit('error', 'No join request with that ID, ignoring.');
		console.log('['+this.gameId+'] Player '+approver.id+' submitted non-existent join approval');
		return;
	}

	if(game.playerForId(id)){
		this.emit('error', 'Player '+id+' is already in the game');
		console.log('['+this.gameId+'] Player '+approver.id+' approved existing player');
		return;
	}

	// remove pending join request
	var index = game.pendingJoinRequests.indexOf(player);
	game.pendingJoinRequests.splice(index, 1);

	// subscribe client to player-only events
	player.socket.join(game.id+'_players');

	// determine correct seat for new player
	// will be the first untaken seat in the order defined
	var seatPriority = [0,4,8, 2,6,10, 1,5,9, 3,7,11];
	player.seatNum = seatPriority.find(function(seat){
		var seatIndex = game.turnOrder.findIndex(p => p.seatNum === seat);
		return seatIndex < 0;
	});
	console.log('['+this.gameId+'] Seating player '+player.id+' at '+player.seatNum);

	// add player to the end of the turn order
	var placeInTurnOrder = game.turnOrder.findIndex(p => p.seatNum > player.seatNum);
	game.turnOrder.splice(placeInTurnOrder, 0, player);

	// push back czar index if joiner is before them
	if(placeInTurnOrder <= game.czar){
		game.czar = (game.czar+1) % game.turnOrder.length;
		console.log('['+this.gameId+'] Advancing czar index to '+game.czar+' because of join');
	}

	// let other clients know about new player
	this.server.to(game.id+'_clients').emit('playerJoin', player.id, player.displayName, game.getCleanTurnOrder());
	console.log('['+this.gameId+'] Player '+player.displayName+' ('+player.id+') has joined');
}


/*
 * Leave game, voluntarily or otherwise
 */
function leave(id, displayName, message, reason)
{
	var game = activeGames[this.gameId];

	// check if player is actually in the game
	var player = game.playerForId(id);
	if(!player){
		this.emit('error', 'No such player with id '+id);
		console.log('['+this.gameId+'] Non-player '+id+' trying to leave');
		return;
	}

	// check if kicker is actually in the game (can't actually happen)
	var kicker = game.playerForSocket(this);
	if(!kicker){
		this.emit('error', 'Only current players can leave the game');
		console.log('['+this.gameId+'] Non-player '+id+' trying to kick (impossibru!)');
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
		player.id, player.displayName, game.getCleanTurnOrder(), message, reason);

	console.log('['+this.gameId+'] Player '+player.displayName+' ('+player.id+') has left the game');

	// reinitialize game if last player leaves
	if(game.turnOrder.length === 0){
		activeGames[this.gameId] = new structs.Game(this.gameId, this.lockIds);
		console.log('['+this.gameId+'] Resetting game');
	}

	// round is interrupted, reset
	else if(game.turnOrder.length < 3 || index === game.czar){
		game.resetRound(this.server);
		game.czar = game.czar % game.turnOrder.length;
	}

	// keep czar index up to date
	else if(index < game.czar){
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
		console.log('['+this.gameId+'] Non-player '+id+' cannot be kicked');
		return;
	}

	// check if kicker is in the game
	var kicker = game.playerForSocket(this);
	if(!kicker){
		this.emit('error', 'Only players can vote to kick');
		console.log('['+this.gameId+'] Non-player '+id+' cannot kick');
		return;
	}

	if(game.kickVoteForId(id)){
		this.emit('error', 'Vote to kick player already in progress');
		console.log('['+this.gameId+'] Kick vote already in progress for '+id);
		return;
	}

	console.log('['+this.gameId+'] Voting to kick '+player.id);

	// vote to kick
	game.pendingKickVotes.push({
		'player': player,
		'yes': 0, 'no': 0,
		'majority': Math.ceil((game.turnOrder.length-1)/2),
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
		console.log('['+this.gameId+'] No such vote '+id);
		return;
	}

	// check if kicker is actually in the game
	else if(!voter){
		this.emit('error', 'Only players can vote to kick.');
		console.log('['+this.gameId+'] Non-player '+voter.id+' cannot vote to kick');
		return;
	}

	// check for multiple votes
	else if(vote.voters.indexOf(voter) > -1){
		this.emit('error', 'Can only vote once');
		console.log('['+this.gameId+'] Voter '+voter.id+' cannot vote again');
		return;
	}

	else if(voter.id === vote.player.id){
		this.emit('error', 'Cannot participate in vote to kick yourself.');
		console.log('['+this.gameId+'] Cannot vote to kick yourself');
		return;
	}

	// log vote
	vote[response ? 'yes' : 'no']++;
	vote.voters.push(voter);

	var index;
	// check results
	if(vote.yes >= vote.majority)
	{
		// vote passes
		console.log('['+this.gameId+'] Vote to kick '+vote.player.displayName+' passes');
		leave.call(this, vote.player.id, vote.player.displayName,
			vote.player.displayName+' was kicked from the game.', 'vote-kicked');

		// clear pending vote
		index = game.pendingKickVotes.indexOf(vote);
		game.pendingKickVotes.splice(index, 1);
	}
	else if(vote.no >= vote.majority)
	{
		// vote fails
		console.log('['+this.gameId+'] Vote to kick', vote.player.displayName, 'fails');
		this.server.to(game.id+'_players').emit('kickVoteAborted', vote.player.id, vote.player.displayName);

		// clear pending vote
		index = game.pendingKickVotes.indexOf(vote);
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
