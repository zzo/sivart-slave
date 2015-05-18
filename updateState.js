'use strict';

var Datastore = require('sivart-data/Datastore');
var newState = process.argv[2];

var datastore = new Datastore(process.env.TRAVIS_REPO_SLUG);

var buildId = process.env.SIVART_BUILD_ID;
var buildNumber = process.env.SIVART_BUILD_NUMBER;

datastore.updateRunState(buildId, buildNumber, newState, function(err) {
  if (err) {
    throw new Error('Update build state error: ' + err);
  }
});
