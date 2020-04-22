# :octocat: GitHub Followers Tracker

![Build Status](https://github.com/plibither8/gh-followers-tracker/workflows/GitHub%20Followers%20Tracker/badge.svg)

> Tracking my GitHub following and un-following with notification on Telegram

Checks every two hours (GitHub Actions, cron-based workflow) and notifies me on my Telgram bot.

Yeah I know this seems a bit creepy but oh well ¯\\\_(ツ)\_/¯.

## Usage

Create a Gist, note it's ID. This is where we will store the (old) followers list.

* Clone this repo.
* Set `GIST_ID` and `GH_TOKEN` environment variables (GitHub Personal Access Token should have _gists_ scope).
* Install npm dependencies: `npm install`
* Make changes to the `notify()` function
* Run the script: `node index`

The `notify()` function is tailor-made for my use-case only and will surely not come into general-purpose use (it's basically a wrapper I built for accessing all my Telegram bots quickly: [tg-bots](https://github.com/plibither8/tg-bots)).

For you to make use of it, make edits to the `notify()` function how so ever you want to be notified. If it's via Telegram, check their bots API out, [(or this)](https://github.com/plibither8/tg-bots/blob/master/index.js#L27).

## License

[MIT](LICENSE)
