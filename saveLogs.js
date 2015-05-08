'use strict';

var fs = require('fs');
var path = require('path');
var hostname = require('os').hostname();
var Auth = require('sivart-GCE/Auth');
var gcloud = require('gcloud');
var WriteData = require('sivart-data/WriteBuildData');
var storage = gcloud.storage(Auth);

// Get info
var logDir = process.env.SIVART_BASE_LOG_DIR;
var repoName = process.env.TRAVIS_REPO_SLUG;
var branch = process.env.TRAVIS_BRANCH;
var buildId = process.env.SIVART_BUILD_ID;
var buildNumber = process.env.SIVART_BUILD_NUMBER;

var writeData = new WriteData(repoName);
var bucketname = writeData.getBucketName();

fs.writeFileSync(path.join(logDir, 'environment.json'), JSON.stringify(process.env));

// Save files
var basepath = path.join(branch, buildId, buildNumber);

// Store files
storage.createBucket(bucketname, function(err, bucket) {
  if (err) {
    bucket = storage.bucket(hostname);
  }
  var files = fs.readdirSync(logDir);
  files.forEach(function(file) {
    fs.createReadStream(path.join(logDir, file)).pipe(bucket.file(path.join(basepath, file)).createWriteStream());
  });
  fs.createReadStream('/tmp/user-script.sh').pipe(bucket.file(path.join(basepath, 'user-script.sh')).createWriteStream());
  fs.createReadStream('/tmp/user-script.log').pipe(bucket.file(path.join(basepath, 'user-script.log')).createWriteStream());
  fs.createReadStream('/var/log/startupscript.log').pipe(bucket.file(path.join(basepath, 'startupscript.log')).createWriteStream());
});
