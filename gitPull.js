var http = require('http');
var repo = require('simple-git')();

var server = http.createServer(function(req,res){
	repo.pull(function(err, data){
		if(err){
			console.log(err);
			res.statusCode = 500;
			res.end();
		}
		else if(data.summary.changes + data.summary.insertions + data.summary.deletions === 0){
			res.statusCode = 304;
			res.end();
		}
		else {
			res.statusCode = 304;
			res.end();
		}
	});
});

server.listen(8080);

