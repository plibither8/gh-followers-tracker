require('dotenv').config()

const { Octokit } = require('@octokit/rest')
const fetch = require('node-fetch')

// GitHub Gists env variables
const {
  GIST_ID,
  GH_TOKEN,
  TG_BOT_NAME,
  TG_BOT_SECRET
} = process.env

const octokit = new Octokit({ auth: `token ${GH_TOKEN}` }) // Instantiate Octokit

async function getOldData () {
  const gist = await octokit.gists.get({ gist_id: GIST_ID })
  return JSON.parse(gist.data.files['gh-followers.json'].content)
}

async function getNewData () {
  let newData = []
  let page = 1

  while (true) {
    const list = (
      await fetch('https://api.github.com/users/plibither8/followers?per_page=100&page=' + (page++))
        .then(res => res.json())
    ).map(fol => fol.login)

    if (!Number(list.length)) {
      break
    }

    newData = newData.concat(list)
  }

  return newData
}

function compareData (oldData, newData) {
  return {
    removed: oldData.filter(fol => newData.indexOf(fol) === -1),
    added: newData.filter(fol => oldData.indexOf(fol) === -1)
  }
}

async function notify (changes, followerCount) {
  let message = '*🐙 GitHub followers list updated!*'
  message += `\nNumber of followers: ${followerCount}`

  if (changes.removed.length > 0) {
    message += '\n\nUnfollowed:\n'
    message += changes.removed.map(fol => `- [${fol}](https://github.com/${fol})`).join('\n')
  }
  if (changes.added.length > 0) {
    message += '\n\nFollowed:\n'
    message += changes.added.map(fol => `- [${fol}](https://github.com/${fol})`).join('\n')
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
  })
}

async function putNewData (newData) {
  await octokit.gists.update({
    gist_id: GIST_ID,
    files: {
      'gh-followers.json': {
        content: JSON.stringify(newData, null, '  ')
      }
    }
  })
}

async function checkAndUpdate (oldData) {
  console.log('Fetching new data from GitHub...')
  const newData = await getNewData()
  console.log('New data fetched from GitHub')

  const changes = compareData(oldData, newData)
  const delta = changes.removed.length + changes.added.length

  console.log('delta:', delta)

  if (delta > 0) {
    console.log('Data changed, notifying and updating to gist...')
    await notify(changes, newData.length)
    await putNewData(newData)
  } else {
    console.log('Data unchanged')
  }

  return newData
}

async function main () {
  console.log('Fetching old data from gist...')
  let oldData = await getOldData()
  console.log('Old data fetched from gist')

  oldData = await checkAndUpdate(oldData)
  setInterval(async () => {
    oldData = await checkAndUpdate(oldData)
  }, 1200000) // 20 minutes
}

main()
