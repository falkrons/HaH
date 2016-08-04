var fs = require('fs'),
	parseCsv = require('csv-parse');

var blackCsv = process.argv[2];
var whiteCsv = process.argv[3];
var outputJson = process.argv[4];

var cards = {
	black: [],
	white: []
};

function forEachLine(file, cb) {
	return new Promise(function (resolve, reject) {
		fs.readFile(file, 'utf8', function (err, data) {
			if (err) {
				console.error('Could not read', file, err);
				reject();
				return;
			}
			parseCsv(data, function (err, lines) {
				if (err) {
					console.error('Could parse csv', file, err);
					reject();
					return;
				}
				lines.forEach(cb);
				console.info(`Read ${lines.length} lines`);
				resolve();
			});
		});
	});
}

var processedBlack = forEachLine(blackCsv, function (line, i) {
	if (i === 0) { return; }
	card = {
		text: line[0],
		numResponses: parseInt(line[1], 10) || 1
	};
	if (card.numResponses === 3) {
		card.numDraws = 2;
	}
	cards.black.push(card);
});

var processedWhite = forEachLine(whiteCsv, function (line, i) {
	if (i === 0) { return; }
	cards.white.push({ text: line[0] });
});

Promise.all([processedBlack, processedWhite]).then(function () {
	fs.writeFile(outputJson, JSON.stringify(cards, null, 2), function (err) {
		if (err) {
			console.error('Could not write', outputJson, err);
		}
	});
});
