'use strict';

var players = require('./players.js');
var Deck = require('./deck.js');

var decks = {};

var hands = {};

function dealCards()
{
	// initialize deck if none yet
	if( !decks[this.gameId] ){
		decks[this.gameId] = new Deck();
	}
	
	// deal the black card
	var black = decks[this.gameId].dealBlackCard();
	
	// for each player in the game
	for(var i=0; i<players.turnOrder[this.gameId].length; i++)
	{
		var player = players.turnOrder[this.gameId][i];
		
		// initialize hand as needed
		if(!player.hand)
			player.hand = [];
		
		// draw necessary number of cards from deck
		var additions = decks[this.gameId].dealWhiteCards(
			10 + Deck.blackCardList[black].numDraws - player.hand.length
		);
		
		
	}
}



module.exports = {
	decks: decks,
	dealCards: dealCards
};

