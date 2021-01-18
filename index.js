require('dotenv').config();

const {Octokit} = require('@octokit/rest');
const fetch = require('node-fetch');

// GitHub Gists env variables
const {
	GIST_ID,
	GH_TOKEN,
	TG_BOT_NAME,
	TG_BOT_SECRET
} = process.env;

const octokit = new Octokit({ auth: `token ${GH_TOKEN}` }) // Instantiate Octokit

const getOldData = async () => {
	const gist = await octokit.gists.get({ gist_id: GIST_ID });
	return JSON.parse(gist.data.files['gh-followers.json'].content);
};

const getNewData = async () => {
	let newData = [];
	let page = 1;
	while (true) {
		const list = (
				await fetch('https://api.github.com/users/plibither8/followers?per_page=100&page='+(page++))
				.then(res => res.json())
			).map(fol => fol.login);

		if (list.length == 0) {
			break;
		}

		newData = newData.concat(list);
	}
	return newData;
};

const compareData = (oldData, newData) => ({
	removed: oldData.filter(fol => newData.indexOf(fol) === -1),
	added: newData.filter(fol => oldData.indexOf(fol) === -1)
});

const notify = async (changes, followerCount) => {
	let message = '*🔔 GitHub followers list updated!*';
	message += `\nNumber of followers: ${followerCount}`;

	if (changes.removed.length > 0) {
		message += '\n\nUnfollowed:\n';
		message += changes.removed.map(fol => `- [${fol}](https://github.com/${fol})`).join('\n');
	}
	if (changes.added.length > 0) {
		message += '\n\nFollowed:\n';
		message += changes.added.map(fol => `- [${fol}](https://github.com/${fol})`).join('\n');
	}

	await fetch(`https://tg.mihir.ch/${TG_BOT_NAME}`, {
		method: 'POST',
		body: JSON.stringify({
			text: message,
			secret: TG_BOT_SECRET
		}),
		headers: {
			'Content-Type': 'application/json'
		}
	});
};

const putNewData = async newData => {
	await octokit.gists.update({
		gist_id: GIST_ID,
		files: {
			'gh-followers.json': {
				content: JSON.stringify(newData, null, '  ')
			}
		}
	});
};

const main = async () => {
	const oldData = await getOldData();
	const newData = await getNewData();

	const changes = compareData(oldData, newData);
	if (changes.removed.length + changes.added.length === 0) return;

	await notify(changes, newData.length);
	await putNewData(newData);
};

(async () => await main())();
