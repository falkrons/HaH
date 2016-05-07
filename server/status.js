'use strict';

var pug = require('pug');
var Structs = require('./structures.js');

var templateString = [
	'doctype html',
	'html',
	'	head',
	'		style.',
	'			tr:nth-child(even) {',
	'				background-color: whitesmoke;',
	'			}',
	'	body',
	'		h1 Holograms Against Humanity Active Games',
	'		table',
	'			tr',
	'				th Game ID',
	'				th Players',
	'			each game in activeGames',
	'				tr',
	'					td: a(href=`/client/?gameId=${game.id}`)= game.id',
	'					td #{game.turnOrder.length} / 12'
].join('\n');

var template = pug.compile(templateString, {});

module.exports = function(req,res,next)
{
	res.send(template({activeGames: Structs.activeGames}));
}

