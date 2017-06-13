'use strict';

const request = require('request'),
	config = require('./config.js');

function feedbackRequest(req, res)
{
	if(!req.body){
		res.status(400).send('No JSON body supplied');
		return;
	}
	else if(!req.body.title){
		res.status(400).send('No title supplied');
		return;
	}
	else if(!req.body.body){
		res.status(400).send('No body supplied');
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
			'Authorization': 'token '+config.githubAccessToken,
			'User-Agent': 'hologramsbot / Holograms Against Humanity Feedback Form'
		},
		json: true,
		body: {
			title: req.body.title,
			body: `${req.body.body}\n\n-- ${req.body.username}`,
			labels: ['bug','enhancement','card-idea'].indexOf(req.body.label) >= 0 ? [req.body.label] : []
		}
	};

	request(options, function(err, response, body)
	{
		if(err){
			console.error(err);
			res.sendStatus(500);
			return;
		}

		console.log(body);
		console.log(`Submitted feedback from ${req.body.username} (#${body.number})`);
		res.status(201).json({
			message: `Feedback successfully submitted. See https://github.com/falkrons/HaH/issues/${body.number} for details.`,
			issue: body.number
		});
	});
}

exports.feedbackRequest = feedbackRequest;

