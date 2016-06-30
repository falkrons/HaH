'use strict';

var fs = require('fs'),
	libpath = require('path');



/***********************************************
	Deck class
	Responsible for managing the list of cards,
	and permutations of said list
***********************************************/

function Deck()
{
	this.whiteDeck = Deck.getShuffledList(Deck.whiteCardList.length);
	this.blackDeck = Deck.getShuffledList(Deck.blackCardList.length);

	this.whiteDiscard = [];
	this.blackDiscard = [];
}


Deck.loadCards = function()
{
	Deck.whiteCardList = [];
	Deck.blackCardList = [];
	var b = 0, w = 0;

	// get list of files in decks folder
	fs.readdir( libpath.join(__dirname, '../decks'), function(err, names)
	{
		if(err){
			console.error(err);
			return;
		}

		names.forEach(function(name)
		{
			// try to read ones ending in .json
			if( /\.json$/i.test(name) )
			{
				fs.readFile( libpath.join(__dirname, '../decks/', name), 'utf8', function(err, data)
				{
					if(err){
						console.error(err);
						return;
					}

					try {
						var data = JSON.parse(data);
					}
					catch(e){
						data = null;
						console.error('Error parsing', name);
						console.error(e);
					}

					if(data)
					{
						for(var j=0; j<data.white.length; j++){
							data.white[j].index = w++;
						}
						for(var j=0; j<data.black.length; j++){
							data.black[j].index = b++;
						}

						Deck.whiteCardList.push.apply(Deck.whiteCardList, data.white);
						Deck.blackCardList.push.apply(Deck.blackCardList, data.black);
						console.log('deck added:', name.slice(0,-5));
					}
				});
			}
		});
	});
}

Deck.prototype.dealWhiteCards = function(count)
{
	var hand = [];
	for(var i=0; i<count; i++)
	{
		if(this.whiteDeck.length == 0){
			console.log('Shuffling white deck');
			this.whiteDeck = Deck.shuffleList(this.whiteDiscard);
			this.whiteDiscard = [];
		}

		hand.push( this.whiteDeck.pop() );
	}

	console.log('Dealing white', hand);
	return hand;
}

Deck.prototype.dealBlackCard = function()
{
	if(this.blackDeck.length == 0){
		console.log('Shuffling black deck');
		this.blackDeck = Deck.shuffleList(this.blackDiscard);
		this.blackDiscard = [];
	}

	console.log('Dealing black', this.blackDeck[this.blackDeck.length-1]);
	return this.blackDeck.pop();
}

Deck.prototype.discardWhiteCards = function(cards)
{
	console.log('Discarding white', cards);
	this.whiteDiscard.push.apply(this.whiteDiscard, cards);
}

Deck.prototype.discardBlackCards = function(cards)
{
	console.log('Discarding black', cards);
	this.blackDiscard.push.apply(this.blackDiscard, cards);
}

Deck.getShuffledList = function(length)
{
	// generate list of card indices
	var list = [];
	for(var i=0; i<length; i++){
		list.push(i);
	}

	return Deck.shuffleList(list);
}

Deck.shuffleList = function(list)
{
	// mix them up
	for(var i=0; i<list.length-1; i++)
	{
		// swap each in-order element with some random element
		var j = Math.floor((list.length-i-1)*Math.random() + i+1);
		var temp = list[i];
		list[i] = list[j];
		list[j] = temp;
	}
	return list;
}

// load the card lists on load
Deck.loadCards();


/***********************************************
	Player class
	Stores relevant information about a client
	participating in a Game
***********************************************/

function Player(playerId, displayName, socket)
{
	this.id = playerId;
	this.displayName = displayName;
	this.socket = socket;

	this.hand = [];
	this.selection = null;
}


/***********************************************
	Game class
	Stores all the information about a
	particular game in progress
***********************************************/

function Game(id)
{
	// the game's id
	this.id = id;

	// this particular game's order of cards
	this.deck = new Deck();

	// one of 'roundStarted', 'playerSelectionPending',
	//   'czarSelectionPending', 'roundFinished'
	this.state = 'roundFinished';

	// index of player in turnOrder that is czar this round
	this.czar = 0;

	this.currentBlackCard = null;

	// in-order array of Player objects
	this.turnOrder = [];

	// array of Players waiting for approval to join
	this.pendingJoinRequests = [];

	// array of Players with active kick votes
	this.pendingKickVotes = [];
}

Game.prototype.playerForSocket = function(socket)
{
	// check current players for socket
	for(var i=0; i<this.turnOrder.length; i++){
		if(this.turnOrder[i].socket === socket)
			return this.turnOrder[i];
	}

	// otherwise socket not found
	return null;
}

Game.prototype.joinRequestForSocket = function(socket)
{
	// check pending join requests for socket
	for(var i=0; i<this.pendingJoinRequests.length; i++){
		if(this.pendingJoinRequests[i].socket === socket)
			return this.pendingJoinRequests[i];
	}

	// otherwise socket not found
	return null;
}

Game.prototype.playerForId = function(id)
{
	// check current players for id
	for(var i=0; i<this.turnOrder.length; i++){
		if(this.turnOrder[i].id === id)
			return this.turnOrder[i];
	}

	// otherwise id not found
	return null;
}

Game.prototype.joinRequestForId = function(id)
{
	// check current players for id
	for(var i=0; i<this.pendingJoinRequests.length; i++){
		if(this.pendingJoinRequests[i].id === id)
			return this.pendingJoinRequests[i];
	}

	// otherwise id not found
	return null;
}

Game.prototype.kickVoteForId = function(id)
{
	// check current players for id
	for(var i=0; i<this.pendingKickVotes.length; i++){
		if(this.pendingKickVotes[i].player.id === id)
			return this.pendingKickVotes[i];
	}

	// otherwise id not found
	return null;
}

Game.prototype.getCleanTurnOrder = function()
{
	return this.turnOrder.map(function(cur){
		return {id: cur.id, displayName: cur.displayName, hand: cur.hand};
	});
}

Game.prototype.resetRound = function(sockets)
{
	this.state = 'roundFinished';
	if(this.currentBlackCard !== null){
		this.deck.discardBlackCards([this.currentBlackCard]);
		this.currentBlackCard = null;
	}

	for(var i=0; i<this.turnOrder.length; i++){
		this.turnOrder[i].selection = null;
	}

	sockets.to(this.id+'_clients').emit('roundReset');
}


/**********************************************
	Export classes
**********************************************/

module.exports = {

	Deck: Deck,
	Player: Player,
	Game: Game,

	// maps game ids to Game objects
	activeGames: {}
};

