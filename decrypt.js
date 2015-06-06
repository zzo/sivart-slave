'use strict';

var decryptMe = process.argv[2];
var repoName = process.env.TRAVIS_REPO_SLUG;
var RepoCrypto = require('./RepoCrypto');

RepoCrypto.decrypt(repoName, decryptMe, function(err, val) {
  if (err) {
    throw new Error(err);
  } else {
    console.log(val);
  }
});

