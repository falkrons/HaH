'use strict';

var express = require('express'),
	morgan = require('morgan'),
	libpath = require('path'),
	socketio = require('socket.io'),
	liburl = require('url');

var players = require('./players.js'),
	game = require('./game.js'),
	config = require('../config.json');

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
	if(url.query.gameId)
	{
		socket.gameId = url.query.gameId;
		socket.join(socket.gameId+'_clients');
		registerGameListeners(socket);
		socket.emit('init', players.turnOrder[socket.gameId]);

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

	// register player events
	socket.on('playerJoinRequest', players.joinRequest);
	socket.on('playerJoinDenied', players.joinDenied);
	socket.on('playerJoin', players.join);
	socket.on('playerLeave', players.leave);
	socket.on('playerKickRequest', players.kickRequest);
	socket.on('playerKickResponse', players.kickResponse);


}
