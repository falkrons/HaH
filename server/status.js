'use strict';

var pug = require('pug');
var Structs = require('./structures.js');

var templateString = [
	'doctype html',
	'html',
	'	head',
	'		title Active games | Holograms Against Humanity',
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
	'					td: a(href=`/play?gameId=${game.id}`)= game.id',
	'					td #{game.turnOrder.length} / 12',
	'		a(href="/play") Create new game'
].join('\n');

var template = pug.compile(templateString, {});

module.exports = function(req, res)
{
	res.send(template({activeGames: Structs.activeGames}));
}

