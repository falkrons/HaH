'use strict';

var express = require('express'),
	morgan = require('morgan'),
	libpath = require('path'),
	socketio = require('socket.io'),
	liburl = require('url');

var structures = require('./structures.js'),
	players = require('./players.js'),
	game = require('./game.js'),
	config = require('../config.json');

var activeGames = structures.activeGames;


// set defaults for config
config.port = config.port || 7878;
config.minPlayers = config.minPlayers || 4;
config.maxPlayers = config.maxPlayers || 12;

// initialize http router
var app = express();

// enable logging
app.use(morgan('dev'));

// get static files from <project>/client
app.use(express.static( libpath.join(__dirname, '../client') ));

// return 404 on all other requests
app.use(function(req,res,next)
{
	res.status(404).send('404 File Not Found');
});

// start server on configured port
var server = app.listen(config.port, function(){
	console.log('Listening on port', config.port);
});

// set up sockets
var io = socketio(server);
io.on('connection', function(socket)
{
	// get gameId, put socket in correct room
	var url = liburl.parse(socket.request.url, true);
	var gameId = url.query.gameId;

	if(gameId)
	{
		// initialize game
		if(!activeGames[gameId])
			activeGames[gameId] = new structures.Game(gameId);

		// associate socket with game
		socket.gameId = gameId;
		socket.join(gameId+'_clients');
		registerGameListeners(socket);

		// initialize new client
		socket.emit('init', activeGames[gameId].turnOrder);
		console.log('Client connected to', socket.gameId);
	}
	else {
		socket.emit('error', 'No gameId specified');
	}
});


function registerGameListeners(socket)
{
	socket.on('error', function(err){
		console.error(err);
	});

	// trigger leave if socket is disconnected
	socket.on('disconnect', function()
	{
		var player = activeGames[this.gameId].playerForSocket(this);
		if(player)
			players.leave.call(this, player.id, player.displayName, player.displayName+' has disconnected.');
	});


	// register player events
	socket.on('playerJoinRequest', players.joinRequest);
	socket.on('playerJoinDenied', players.joinDenied);
	socket.on('playerJoin', players.join);
	socket.on('playerLeave', players.leave);
	socket.on('playerKickRequest', players.kickRequest);
	socket.on('playerKickResponse', players.kickResponse);

	socket.on('dealCards', game.dealCards);
}


