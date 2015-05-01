var fs = require('fs');
var path = require('path');
var os = require('os');
var Auth = require('sivart-GCE/Auth');
var targz = require('tar.gz');

//Get info 
var repoName = process.argv[2];
var branch = process.argv[3];

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

var safeRepo = repoName.replace(/\//g, '-');
var bucketname = ['sivart', safeRepo, branch].join('-');

// Get files
storage.createBucket(bucketname, function(err, bucket) {

  if (err) {
    // Bucket already exists...
    bucket = storage.bucket(bucketname);
  } 

  // Get all the cache files for this repo+branch combination
  bucket.getFiles({prefix: 'cache-'}, handleResults);
});

function handleResults(err, files, nextQuery) {
  if (err) {
    console.log('Error getting cached directory:');
    console.log(err);
  }

  // Extract results
  files.forEach(function(file) {
    var tmpPath = path.join(os.tmpdir(), file.name);
    file.download(
      { destination: tmpPath }, 
      function(err) {
        if (err) {
          console.log('Error getting cache directory: ' + tmpPath);
        } else {
          var exec = require('child_process').exec;
          exec(printf('tar xaf %s', tmpPath), { cwd: process.cwd() },
            function(err, stdout, stderr) {
                if (err) {
                  console.log("error decompressing:");
                  console.log(err);
                } else {
                  console.log('Restored cache directory: ' + path.basename(tmpPath));
                }

          // tar xaf tmpPath
          /*
          new targz().extract(tmpPath, process.cwd(), function(err) {
            if (err) {
              console.log('Error extracting cache file');
              console.log(err);
            } else {
              console.log('Restored cache directory: ' + path.basename(tmpPath));
            }
          });
          */
        }
      }
    );
  });

  if (nextQuery) {
    this.getFiles(nextQuery, handleResults);
  }
}
