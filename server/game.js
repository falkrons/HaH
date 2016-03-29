var fs = require('fs'),
	libpath = require('path');

var decks = {};

function getShuffledDeck(length)
{
	// generate list of card indices
	var list = [];
	for(var i=0; i<length; i++)
		list.push(i);

	// mix them up
	for(var i=0; i<length-1; i++)
	{
		// swap each in-order element with some random element
		var j = Math.floor((length-i-1)*Math.random() + i+1);
		var temp = list[i];
		list[i] = list[j];
		list[j] = temp;
	}

	return list;
}



function loadDecks()
{
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
			if( /\.json$/i.test(names[i]) )
			{
				fs.readFile( libpath.join(__dirname, '../decks/', name), 'utf8', function(err, data)
				{
					if(err){
						console.error(err);
						return;
					}

					try {
						decks[name.slice(0,-5)] = JSON.parse(data);
					}
					catch(e){
						console.error('Error parsing', name);
						console.error(e);
					}
				});
			}
		});
	});
}

module.exports = {
	loadDecks: loadDecks
};

