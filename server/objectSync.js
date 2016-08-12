'use strict';

var config = require('./config.js');

var io;
var transformStates = {};

function updateTransform(objectId, matrix)
{
	if(!io) io = this.server;
	transformStates[this.gameId] = transformStates[this.gameId] || {};
	transformStates[this.gameId][objectId] = matrix;
}

// every syncInterval ms
setInterval(function()
{
	// for all rooms
	for(var room in transformStates)
	{
		// check for updates from clients
		if( Object.keys(transformStates[room]).length !== 0 )
		{
			// broadcast updates
			io.sockets.to(room+'_clients').emit('objectUpdate', transformStates[room]);

			// reset updates
			transformStates[room] = {};
		}
	}

}, config.syncInterval);

exports.updateTransform = updateTransform;
