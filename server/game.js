'use strict';

var players = require('./players.js'),
	structs = require('./structures.js');

var activeGames = structs.activeGames;


function dealCards()
{
	var game = activeGames[this.gameId];

	// check that requester is in game
	if( !game.playerForSocket(this) ){
		this.emit('error', 'Anonymous clients can\'t deal');
		return;
	}

	// check that the time is right
	if(game.state !== 'roundFinished'){
		this.emit('error', 'Unexpected signal "dealCards"');
		return;
	}

	// check for minimum player count
	if(game.turnOrder.length < 3){
		this.emit('error', 'Too few players to deal');
		return;
	}

	// deal the black card
	if(game.currentBlackCard !== null){
		game.deck.discardBlackCards([game.currentBlackCard]);
	}
	var black = game.currentBlackCard = game.deck.dealBlackCard();

	// for each player in the game
	for(var i=0; i<game.turnOrder.length; i++)
	{
		var player = game.turnOrder[i];

		if(i !== game.czar)
		{
			// zero out card selection
			player.selection = null;

			// draw necessary number of cards from deck
			var additions = game.deck.dealWhiteCards(
				10 + (structs.Deck.blackCardList[black].numDraws || 0) - player.hand.length
			);

			// add cards to hand
			player.hand.push.apply(player.hand, additions);
		}

		// convert indexes to full card descriptions
		var fullHand = player.hand.map(function(cur){
			return structs.Deck.whiteCardList[cur];
		});

		// emit new cards
		player.socket.emit('dealCards', fullHand, structs.Deck.blackCardList[black],
			game.turnOrder[game.czar].id);
	}

	// prompt observers to show updated hands
	this.server.to(game.id+'_clients').emit('dealCards',
		10 + (structs.Deck.blackCardList[black].numDraws || 0),
		structs.Deck.blackCardList[black],
		game.turnOrder[game.czar].id
	);

	game.state = 'roundStarted';
}

function roundStart()
{
	var game = activeGames[this.gameId];

	if(game.state !== 'roundStarted'){
		this.emit('error', 'Unexpected signal: roundStart');
		return;
	}

	var player = game.playerForSocket(this);
	if(game.turnOrder.indexOf(player) !== game.czar){
		this.emit('error', 'Only the czar can confirm the black card');
		return;
	}

	game.state = 'playerSelectionPending';
	this.server.to(game.id+'_clients').emit('roundStart');
}

function cardSelection(indexes)
{
	var game = activeGames[this.gameId];

	// check signal validity
	if(game.state !== 'playerSelectionPending'){
		this.emit('error', 'Unexpected signal: cardSelection');
		return;
	}

	// check player validity
	var player = game.playerForSocket(this);
	if(!player){
		this.emit('error', 'Anonymous clients cannot submit cards');
		return;
	}

	// check submission validity
	var numResponses = structs.Deck.blackCardList[game.currentBlackCard].numResponses || 1;
	if(indexes.length !== numResponses)
	{
		this.emit('error', 'Invalid card selection, given '+indexes.length+' and needs '+numResponses);
		return;
	}
	for(var i=0; i<indexes.length; i++){
		// check for index-out-of-bounds and double-select
		if(!player.hand[i] || indexes.indexOf(indexes[i]) !== i){
			this.emit('error', 'Invalid card selection: out of bounds or duplicate');
			return;
		}
	}

	// save hand
	player.selection = indexes;
	this.server.to(game.id+'_clients').emit('cardSelection', indexes, player.id);

	// check for last submission
	checkForLastSelection.call(this, game);
}

function checkForLastSelection(game)
{
	// check for last submission
	var submissions = {};
	for(var i=0; i<game.turnOrder.length; i++)
	{
		var p = game.turnOrder[i];

		// we're done here if someone hasn't selected yet
		if(i === game.czar)
			continue;
		else if(p.hand.length > 0 && p.selection === null)
			return;
		else if(p.selection !== null)
			submissions[p.id] = p.selection.map(function(c){
				return structs.Deck.whiteCardList[ p.hand[c] ];
			});
	}

	// move on to the next stage if everyone has submitted
	game.state = 'czarSelectionPending';
	game.submissions = submissions;
	this.server.to(game.id+'_clients').emit('cardSelectionComplete', submissions);
}

function presentSubmission(playerId)
{
	var game = activeGames[this.gameId];
	var player = game.playerForSocket(this);
	if(!player || player !== game.turnOrder[game.czar]){
		this.emit('error', 'You are not the czar');
		return;
	}

	if(!game.submissions || playerId !== '' && !game.submissions[playerId]){
		this.emit('error', 'The specified player does not have a submission');
		return;
	}

	this.server.to(game.id+'_clients').emit('presentSubmission', playerId);
}

function winnerSelection(playerId)
{
	var game = activeGames[this.gameId];
	var player = game.playerForSocket(this);
	if(!player || player !== game.turnOrder[game.czar]){
		this.emit('error', 'You are not the czar');
		return;
	}

	if(!game.submissions || !game.submissions[playerId]){
		this.emit('error', 'The specified player does not have a submission');
		return;
	}

	// remove previous round selections from hands
	game.submissions = {};
	for(var i=0; i<game.turnOrder.length; i++)
	{
		if(i === game.czar) continue;

		var player = game.turnOrder[i];
		if(player.selection)
		{
			game.deck.discardWhiteCards(player.selection.map(x => player.hand[x]));
			for(var j=0; j<player.selection.length; j++){
				player.hand.splice(player.selection[j]-j, 1);
			}
		}
	}

	this.server.to(game.id+'_clients').emit('winnerSelection', playerId);
	game.state = 'roundFinished';
	game.czar = (game.czar+1) % game.turnOrder.length;
}

module.exports = {
	dealCards: dealCards,
	roundStart: roundStart,
	cardSelection: cardSelection,
	checkForLastSelection: checkForLastSelection,
	presentSubmission: presentSubmission,
	winnerSelection: winnerSelection
};

