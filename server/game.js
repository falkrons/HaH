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

	// deal the black card
	var black = game.deck.dealBlackCard();
	
	// for each player in the game
	for(var i=0; i<game.turnOrder.length; i++)
	{
		var player = game.turnOrder[i];
		
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
}



module.exports = {
	dealCards: dealCards
};

