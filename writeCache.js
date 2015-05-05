'use strict';

var fs = require('fs');
var path = require('path');
var Auth = require('sivart-GCE/Auth');
var os = require('os');
var printf = require('util').format;
var exec = require('child_process').exec;
var nodeVersion = process.env.TRAVIS_NODE_VERSION;

// Get info
var cacheDir = process.argv[2];
var repoName = process.argv[3];
var branch = process.argv[4];

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

var safeDir = cacheDir.replace(/\//g, '-');
var tarFile = path.join(os.tmpdir(), printf('cache-%s-%s.tar', nodeVersion, safeDir));
var lzoFile = tarFile + '.lzo';
var baseName = path.basename(lzoFile);

// Save files
var safeRepo = repoName.toLowerCase().replace(/[^0-9a-z-]/g, '-');
var safeBranch = branch.toLowerCase().replace(/[^0-9a-z-]/g, '-');
var bucketname = ['sivart', safeRepo, safeBranch].join('-').slice(0, 63);

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
        console.log('error compressing:');
        console.log(exerr);
      } else {
        // Get current file & see if we wanna re-save it
        //    if hash values are different
        var uncompressedSize = fs.lstatSync(tarFile).size;
        bucket.getFiles({prefix: baseName}, function handleResults(gferr, files) {
          console.log(gferr || 'cache file does not exist: ' + baseName);
          if (gferr || !files || !files[0]) {
            if (!files) {
              files = [];
            }
            files[0] = bucket.file(baseName);
            files[0].metadata.metadata = {};
          }
          if (files[0]) {
            if (files[0].metadata.metadata.uncompressedSize !== String(uncompressedSize)) {
              createTarFile(lzoFile, cacheDir, function(lzoErr) {
                if (lzoErr) {
                  console.log('Error compressing tar file');
                  console.log(lzoErr);
                } else {
                  // ship it
                  console.log(printf('Directory changed - uploading...'));
                  bucket.upload(lzoFile, { destination: baseName, metadata: { metadata: { uncompressedSize: uncompressedSize } } },
                    function(uperr) {
                      if (uperr) {
                        console.log(printf('Error updating cached directory'));
                        console.log(uperr);
                      } else {
                        console.log(printf('Successfully saved directory'));
                      }
                    }
                  );
                }
              });
            } else {
              console.log(printf('Directory unchanged - not updating'));
            }
          }
        });
      }
    });
});
