'use strict';

var fs = require('fs');
var path = require('path');
var Auth = require('sivart-GCE/Auth');
var os = require('os');
var printf = require('util').format;
var exec = require('child_process').exec;
var nodeVersion = process.env.TRAVIS_NODE_VERSION;
var WriteData = require('sivart-data/WriteBuildData');

// Get info
var cacheDir = process.argv[2];

var repoName = process.env.TRAVIS_REPO_SLUG;
var branch = process.env.TRAVIS_BRANCH;

var writeData = new WriteData(repoName);
var bucketname = writeData.getBucketName();

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

var safeBranch = branch.toLowerCase().replace(/[^0-9a-z-]/g, '-');
var safeDir = cacheDir.replace(/\//g, '-');
var basicFileName = ['cache', safeBranch, nodeVersion, safeDir].join('-');
var tarFile = path.join(os.tmpdir(), basicFileName);
var lzoFile = tarFile + '.lzo';
var baseName = path.basename(lzoFile);

function createTarFile(outputFile, inputDirectory, cb) {
  var command = printf('tar -caf %s %s', outputFile, inputDirectory);
  exec(command, { cwd: process.cwd() }, cb);
}

console.log(printf('Upload cache directory "%s" on branch "%s" (maybe)', cacheDir, branch));
storage.createBucket(bucketname, function(cberr, bucket) {
  if (cberr) {
    bucket = storage.bucket(bucketname);
  }

  createTarFile(tarFile, cacheDir,
    function(exerr) {
      if (exerr) {
        console.log('Error tarring directory:');
        console.log(exerr);
      } else {
        // Get current file & see if we wanna re-save it
        //    if hash values are different
        var uncompressedSize = fs.lstatSync(tarFile).size;
        bucket.getFiles({prefix: baseName}, function handleResults(gferr, files) {
          if (gferr) {
            console.log('Error downloading cache files:');
            console.log(gferr);
          } else if (!files.length) {
            console.log('Cache file does not exist: ' + baseName);
          }
          if (gferr || !files || !files[0]) {
            console.log('Creating new cache file: ' + baseName);
            if (!files) {
              files = [];
            }
            files[0] = bucket.file(baseName);
            files[0].metadata.metadata = {};
          }
          if (files[0]) {
            if (files[0].metadata.metadata.uncompressedSize !== String(uncompressedSize)) {
              console.log('Cache file size changed (or did not yet exist): ' + baseName);
              createTarFile(lzoFile, cacheDir, function(lzoErr) {
                if (lzoErr) {
                  console.log('Error compressing cache file:');
                  console.log(lzoErr);
                } else {
                  // ship it
                  console.log(printf('Directory changed - uploading...'));
                  bucket.upload(lzoFile, { destination: baseName, metadata: { metadata: { uncompressedSize: uncompressedSize } } },
                    function(uperr) {
                      if (uperr) {
                        console.log(printf('Error updating cached directory:'));
                        console.log(uperr);
                      } else {
                        console.log(printf('Successfully updated cache for %s', baseName));
                      }
                    }
                  );
                }
              });
            } else {
              console.log(printf('Directory unchanged - not updating: ' + baseName));
            }
          }
        });
      }
    });
});
