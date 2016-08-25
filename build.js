var UglifyJS = require('uglify-js');
var fs = require('fs');
var result = UglifyJS.minify(
	[
		'client/lib/socket.io-1.4.5.js',

		'client/lib/three.min.js',
		'client/lib/ColladaLoader.js',
		'client/lib/OBJLoader.js',
		'client/lib/MTLLoader.js',
		'client/lib/altspace.js',

		'client/lib/Tween.js',

		'client/behaviors.js',
		'client/util.js',
		'client/game.js',
		'client/confetti.js',
		'client/crown.js',
		'client/seat.js',

		'client/client.js'
	],
	{
		compress: false
	}
);

fs.writeFileSync('client/bundle.js', result.code);
