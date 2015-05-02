'use strict';

var path = require('path');
var os = require('os');
var Auth = require('sivart-GCE/Auth');
var printf = require('util').format;

// Get info
var repoName = process.argv[2];
var branch = process.argv[3];

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

var safeRepo = repoName.replace(/\//g, '-');
var bucketname = ['sivart', safeRepo, branch].join('-');

function handleResults(hrerr, files, nextQuery) {
  if (hrerr) {
    console.log('Error getting cached directory:');
    console.log(hrerr);
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

  // Get all the cache files for this repo+branch combination
  bucket.getFiles({prefix: 'cache-'}, handleResults);
});
