'use strict';

var socket;

function connectToGame(gameId)
{
	socket = io('http://localhost:7878/?gameId='+gameId);
	socket.on('error', function(msg){
		console.error(msg);
	});
}