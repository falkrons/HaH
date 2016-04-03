'use strict';

var fs = require('fs'),
	libpath = require('path');



function getShuffledList(length)
{
	excludeList = excludeList || [];
	
	// generate list of card indices
	var list = [];
	for(var i=0; i<length; i++){
		list.push(i);
	}

	return shuffleList(list);
}

function shuffleList(list)
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

function Deck()
{
	this.whiteDeck = getShuffledList(whiteCardList.length);
	this.blackDeck = getShuffledList(blackCardList.length);
	
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
						console.error('Error parsing', name);
						console.error(e);
					}
					
					if(data)
					{
						for(int j=0; j<data.white.length; j++){
							data.white[j].index = w++;
						}
						for(int j=0; j<data.black.length; j++){
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
			this.whiteDeck = shuffleList( this.whiteDiscard );
			this.whiteDiscard = [];
		}
		
		hand.push( this.whiteDeck.pop() );
	}
	
	return hand;
}

Deck.prototype.dealBlackCard = function()
{
	if(this.blackDeck.length == 0){
		this.blackDeck = shuffleList( this.blackDiscard );
		this.blackDiscard = [];
	}
	
	return this.blackDeck.pop();
}

Deck.prototype.discardWhiteCards = function(cards)
{
	this.whiteDiscard.push.apply(this.whiteDiscard, cards);
}

Deck.prototype.discardBlackCards = function(cards)
{
	this.blackDiscard.push.apply(this.blackDiscard, cards);
}

Deck.loadCards();
module.exports = Deck;
