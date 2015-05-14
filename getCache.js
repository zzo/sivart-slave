'use strict';

var path = require('path');
var os = require('os');
var Auth = require('sivart-GCE/Auth');
var printf = require('util').format;
var nodeVersion = process.env.TRAVIS_NODE_VERSION;
var Filestore = require('sivart-data/Filestore');

// Get info
var repoName = process.env.TRAVIS_REPO_SLUG;
var branch = process.env.TRAVIS_BRANCH;

var filestore = new Filestore(repoName);
var bucketname = filestore.bucketName;

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

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
          console.log('Error getting cache file: ' + tmpPath);
          console.log(dlerr);
        } else {
          var exec = require('child_process').exec;
          exec(printf('tar xaf %s', tmpPath), { cwd: process.cwd() },
            function(execerr) { // , stdout, stderr) {
                if (execerr) {
                  console.log('Error decompressing cache file:');
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

  var safeBranch = branch.toLowerCase().replace(/[^0-9a-z-]/g, '-');
  var fileStart = ['cache', safeBranch, nodeVersion].join('-');
  console.log('try to restore cache files: ' + fileStart + ' from ' + bucketname);

  // Get all the cache files for this repo+branch combination
  bucket.getFiles({prefix: fileStart }, handleResults);
});
