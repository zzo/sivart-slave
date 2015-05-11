'use strict';

var WriteData = require('sivart-data/WriteBuildData');
var newState = process.argv[2];

var eventType = process.env.TRAVIS_PULL_REQUEST === 'false' ? 'push' : 'pull_request';
var writeData = new WriteData(process.env.TRAVIS_REPO_SLUG, eventType);

var buildId = process.env.SIVART_BUILD_ID;
var buildNumber = process.env.SIVART_BUILD_NUMBER;

writeData.updateState(buildId, buildNumber, newState, function(err) {
  if (err) {
    console.log('Update build state error:');
    console.log(err);
  }
});
