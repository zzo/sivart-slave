'use strict';

var Build = require('./Build');
var path = require('path');

// fill out common args from github
function getBuild(args, githubEvent) {
  args.repoName = githubEvent.repository.full_name;
  args.cloneURL = githubEvent.repository.clone_url;
  args.yamlURL = printf('https://raw.githubusercontent.com/%s/%s/.travis.yml', args.repoName, args.branch);

  return new Build(args, githubEvent);
};

module.exports = function(eventName, githubEvent) {
  if (eventName == 'push') {
    return getBuild({
      eventName: eventName,
      branch: path.basename(githubEvent.ref),
      commit: githubEvent.after,
    }, githubEvent);
  } else if (eventName === 'pull_request') {
    return new getBuild({
      eventName: eventName,
      pr: githubEvent.number,
      action: githubEvent.action, // 'synchronize' or 'closed' or 'unlabeled'
      branch: 'master',
    }, githubEvent);
  } else {
    throw new Error('I do not handle github event: ' + eventName);
  }
};
