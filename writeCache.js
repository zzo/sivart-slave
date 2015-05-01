'use strict';

var fs = require('fs');
var path = require('path');
var Auth = require('sivart-GCE/Auth');
var os = require('os');
var printf = require('util').format;
var exec = require('child_process').exec;

// Get info
var cacheDir = process.argv[2];
var repoName = process.argv[3];
var branch = process.argv[4];

/////////////////////////////////////
/*
cacheDir = '/Users/trostler/tmp/angular/node_modules';
repoName = 'ww';
branch = 'master';
*/
/////////////////////////////////////

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

var safeDir = cacheDir.replace(/\//g, '-');
var tarFile = path.join(os.tmpdir(), printf('cache-%s.tar', safeDir));
var lzoFile = tarFile + '.lzo';
var baseName = path.basename(lzoFile);

// Save files
var safeRepo = repoName.replace(/\//g, '-');
var bucketname = ['sivart', safeRepo, branch].join('-');

function getHash(file, cb) {
  fs.lstat(file, function(err, stat) {
    cb(stat.size);
  });
}

function createTarFile(outputFile, inputDirectory, cb) {
  //exec(printf('tar caf %s %s', tarFile, cacheDir), { cwd: process.cwd() }, cb);
  var command = printf('tar -caf %s %s', outputFile, inputDirectory);
  console.log('command: ' + command);
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
        getHash(tarFile, function(hashValue) {
          bucket.getFiles({prefix: baseName}, function handleResults(gferr, files) {
            if (gferr || !files[0]) {
              files[0] = bucket.file(baseName);
              files[0].metadata.metadata = {};
              console.log(gferr || 'cache file does not exist: ' + baseName);
            }
            if (files[0]) {
              console.log(files[0].metadata);
              console.log(hashValue);
              if (files[0].metadata.metadata.uncompressedSize != hashValue) {
                createTarFile(lzoFile, cacheDir, function(lzoErr) {
                  if (lzoErr) {
                    console.log('Error compressing tar file');
                    console.log(lzoErr);
                  } else {
                    // ship it
                    console.log(printf('Directory changed - uploading...'));
                    bucket.upload(lzoFile, { destination: baseName, metadata: { metadata: { uncompressedSize: hashValue } } },
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
        });
      }
    });
});
