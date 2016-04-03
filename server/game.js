'use strict';

var players = require('./players.js');
var Deck = require('./deck.js');

var decks = {};
var hands = {};
var gameState = {};
var czar = {};



function dealCards()
{
	// manage state
	if( !gameState || gameState[this.gameId] === 'roundOver' )
		gameState[this.gameId] = 'roundStarted';
	
	// initialize deck if none yet
	if( !decks[this.gameId] ){
		decks[this.gameId] = new Deck();
	}
	
	// initialize hand set if none yet
	if( !hands[this.gameId] ){
		hands[this.gameId] = {};
	}
	
	if( !czar[this.gameId] ){
		czar[this.gameId] = 0;
	}
	
	// deal the black card
	var black = decks[this.gameId].dealBlackCard();
	
	// for each player in the game
	for(var i=0; i<players.turnOrder[this.gameId].length; i++)
	{
		var player = players.turnOrder[this.gameId][i];
		
		// initialize hand as needed
		if( !hands[this.gameId][player.playerId] )
			hands[this.gameId][player.playerId] = [];
		
		// draw necessary number of cards from deck
		var additions = decks[this.gameId].dealWhiteCards(
			10 + Deck.blackCardList[black].numDraws - hands[this.gameId][player.playerId].length
		);
		
		hands[this.gameId][player.playerId] = additions.concat(hands[this.gameId][player.playerId]);
		
		var additionsFull = additions.map(function(cur){
			return JSON.parse(JSON.stringify(Deck.whiteCardList[cur]));
		});
		var additionsFull = additions.map(function(cur){
			return JSON.parse(JSON.stringify(Deck.whiteCardList[cur]));
		});
		
		hands[this.gameId][player.playerId] = additions.concat(hands[this.gameId][player.playerId]);
		
		var socket = players.socketForPlayer[player.playerId];
		socket.emit('dealCards', additions, black, czar[this.gameId]);
	}
}



module.exports = {
	decks: decks,
	dealCards: dealCards
};

