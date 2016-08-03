var jsonConfig;
try {
	jsonConfig = require('../config.json');
}
catch (e) {
	console.log('Could not load config.json');
	jsonConfig = {};
}
// defaults for config
module.exports = {
	port: jsonConfig.port || process.env.PORT || 7878,
	minPlayers: jsonConfig.minPlayers || 4,
	maxPlayers: jsonConfig.maxPlayers || 12,
	syncInterval: jsonConfig.syncInterval || 100,
	githubAccessToken: jsonConfig.githubAccessToken
}
