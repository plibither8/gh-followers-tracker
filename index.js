const {Octokit} = require('@octokit/rest');
const fetch = require('node-fetch');

// GitHub Gists env variables
const {
	GIST_ID,
	GITHUB_TOKEN
} = process.env;


