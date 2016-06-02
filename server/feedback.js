'use strict';

const request = require('request'),
	config = require('../config.json');

function feedbackRequest(req, res, next)
{
	if(!req.body.title){
		res.status(400).send('No title supplied');
		return;
	}
	else if(!req.body.body){
		res.status(400).send('No message supplied');
		return;
	}
	else if(!req.body.username){
		res.status(400).send('No username supplied');
		return;
	}

	// set up request
	var options = {
		method: 'POST',
		url: 'https://api.github.com/repos/falkrons/HaH/issues',
		headers: {
			'Accept': 'application/vnd.github.v3+json',
			'Authorization': 'token '+config.githubAccessToken
		},
		json: true,
		body: {
			title: req.body.title,
			body: `${req.body.body}\n\n-- ${req.body.username}`,
			labels: ['bug','enhancement','card-idea'].indexOf(req.body.label) >= 0 ? [req.body.label] : undefined
		}
	};

	console.log('Attempting to submit feedback from', req.body.username);
	request(options, function(err, response, body)
	{
		if(err){
			
		}
	});	
}

exports.feedbackRequest = feedbackRequest;

