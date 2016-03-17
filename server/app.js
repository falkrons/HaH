var express = require('express'),
	libpath = require('path');

// initialize http router
var app = express();

// get static files from <project>/client
app.use(express.static( libpath.join(__dirname, '../client') ));

// return 404 on all other requests
app.use(function(req,res,next)
{
	res.status(404).send('404 File Not Found');
});

// start server on port 7373
app.listen(7373);
