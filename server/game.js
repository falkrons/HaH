'use strict';

var players = require('./players.js');
var Deck = require('./deck.js');

function Game(id){
	this.id = id;
	this.deck = new Deck();
	this.hands = {};
	this.gameState = 'roundStarted';
	this.czar = 0;
	this.turnOrder = players.turnOrder[id];
}

var games = {};


function dealCards()
{
	var game;
	
	// manage state
	if( !games[this.gameId])
		game = games[this.gameId] = new Game(this.gameId);
	else
		game = games[this.gameId];

	if(!this.playerId){
		this.emit('error', 'Anonymous clients can\'t deal');
		return;
	}
		
	// validate deal requester
	var dealerInGame = false;
	for(var i=0; i<game.turnOrder.length; i++){
		if(game.turnOrder[i].playerId === this.playerId){
			dealerInGame = true;
			break;
		}
	}
	
	if(!dealerInGame){
		this.emit('error', 'Can only deal your own game');
		return;
	}
	
	// deal the black card
	var black = game.deck.dealBlackCard();
	
	// for each player in the game
	for(var i=0; i<game.turnOrder.length; i++)
	{
		var player = game.turnOrder[i];
		
		// initialize hand as needed
		if( !game.hands[player.playerId] )
			game.hands[player.playerId] = [];
		
		// draw necessary number of cards from deck
		var additions = game.deck.dealWhiteCards(
			10 + (Deck.blackCardList[black].numDraws || 0) - game.hands[player.playerId].length
		);
		
		// add cards to hand
		game.hands[player.playerId] = additions.concat(game.hands[player.playerId]);
		
		// convert indexes to full card descriptions
		var additionsFull = additions.map(function(cur){
			return Deck.whiteCardList[cur];
		});
		
		// emit new cards
		var socket = players.socketForPlayer[player.playerId];
		socket.emit('dealCards', additionsFull, Deck.blackCardList[black],
			game.turnOrder[game.czar].playerId);
	}
}



module.exports = {
	games: games,
	
	dealCards: dealCards
};

