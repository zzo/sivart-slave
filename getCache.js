'use strict';

var path = require('path');
var fs = require('fs');
var os = require('os');
var Auth = require('sivart-GCE/Auth');
var printf = require('util').format;
var nodeVersion = process.env.TRAVIS_NODE_VERSION;

// Get info
var repoName = process.argv[2];
var branch = process.argv[3];

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

var safeRepo = repoName.toLowerCase().replace(/[^0-9a-z-]/g, '-');
var safeBranch = branch.toLowerCase().replace(/[^0-9a-z-]/g, '-');
var bucketname = ['sivart', safeRepo, safeBranch].join('-');
console.log('bucket name is: ' + bucketname);

function handleResults(hrerr, files, nextQuery) {
  if (hrerr) {
    console.log('Error getting cached directory:');
    console.log(hrerr);
    return;
  }

  // Extract results
  files.forEach(function(file) {
    var tmpPath = path.join(os.tmpdir(), file.name);
    file.download(
      { destination: tmpPath },
      function(dlerr) {
        if (dlerr) {
          console.log('Error getting cache directory: ' + tmpPath);
        } else {
          var exec = require('child_process').exec;
          exec(printf('tar xaf %s', tmpPath), { cwd: process.cwd() },
            function(execerr) { // , stdout, stderr) {
                if (execerr) {
                  console.log('error decompressing:');
                  console.log(execerr);
                } else {
                  console.log('Restored cache directory from ' + path.basename(tmpPath));
                }
            }
          );
        }
      }
    );
  });

  if (nextQuery) {
    this.getFiles(nextQuery, handleResults);
  }
}
// Get files
storage.createBucket(bucketname, function(err, bucket) {

  if (err) {
    // Bucket already exists...
    bucket = storage.bucket(bucketname);
  }

console.log('get cache files: cache-' + nodeVersion);
  // Get all the cache files for this repo+branch combination
  bucket.getFiles({prefix: 'cache-' + nodeVersion }, handleResults);
});
