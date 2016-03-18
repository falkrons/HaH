var express = require('express'),
	morgan = require('morgan'),
	libpath = require('path'),
	socketio = require('socket.io'),
	liburl = require('url');

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

// start server on port 7373
var server = app.listen(7878, function(){
	console.log('Listening on port 7878');
});

// set up sockets
var io = socketio(server);

io.on('connection', function(socket)
{
	// get gameId, put socket in correct room
	var url = liburl.parse(socket.request.url, true);
	if(url.query.gameId)
	{
		socket.join(url.query.gameId);
		console.log('Client connected to', url.query.gameId, '!');
	}
	else {
		socket.emit('error', 'No gameId specified');
	}
});