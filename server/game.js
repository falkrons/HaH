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

		// zero out card selection
		player.selection = null;

		// draw necessary number of cards from deck
		var additions = game.deck.dealWhiteCards(
			10 + (structs.Deck.blackCardList[black].numDraws || 0) - player.hand.length
		);

		// add cards to hand
		player.hand.push.apply(player.hand, additions);

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

function cardSelection(handIndex)
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
	if(Array.isArray(handIndex)){
		for(var i=0; i<handIndex.length; i++){
			if(!player.hand[i]){
				this.emit('error', 'Invalid card selection');
				return;
			}
		}
	}
	else if(!player.hand[handIndex]){
		this.emit('error', 'Invalid card selection');
		return;
	}

	// save hand
	player.selection = handIndex;
	this.server.to(game.id+'_clients').emit('cardSelection', handIndex, player.id);

	// check for last submission
	var submissions = {};
	for(var i=0; i<game.turnOrder.length; i++)
	{
		var p = game.turnOrder[i];

		// we're done here if someone hasn't selected yet
		if(i !== game.czar && p.hand.length > 0 && p.selection === null)
			return;
		else if(i === game.czar)
			continue;
		else if(Array.isArray(p.selection))
			submissions[p.id] = p.selection.map(function(c){
				return structs.Deck.whiteCardList[ p.hand[c] ];
			});
		else
			submissions[p.id] = structs.Deck.whiteCardList[ p.hand[p.selection] ];
	}

	// move on to the next stage if everyone has submitted
	this.server.to(game.id+'_clients').emit('cardSelectionComplete', submissions);
}

module.exports = {
	dealCards: dealCards,
	roundStart: roundStart,
	cardSelection: cardSelection
};

