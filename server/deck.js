'use strict';

var fs = require('fs'),
	libpath = require('path');

var whiteCardList = [];
var blackCardList = [];


function getShuffledList(length, excludeList)
{
	excludeList = excludeList || [];
	
	// generate list of card indices
	var list = [];
	for(var i=0; i<length; i++){
		if(excludeList.indexOf(i) === -1)
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
	this.whiteOrder = getShuffledList(whiteCardList.length);
	this.blackOrder = getShuffledList(blackCardList.length);
}

Deck.loadCards = function()
{
	whiteCardList = [];
	blackCardList = [];
	
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
					
					if(data){
						whiteCardList.push.apply(whiteCardList, data.white);
						blackCardList.push.apply(blackCardList, data.black);
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
		if(whiteCardList.length == 0)
		{
			
		}
		
		hand.push( whiteCardList.pop() );
	}
	
	return hand;
}

Deck.loadCards();
module.exports = Deck;
