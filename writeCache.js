'use strict';

var fs = require('fs');
var path = require('path');
var Auth = require('sivart-GCE/Auth');
var os = require('os');
var printf = require('util').format;
var hash = require('crypto').createHash('md5');

// Get info
var cacheDir = process.argv[2];
var repoName = process.argv[3];
var branch = process.argv[4];

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

var safeDir = cacheDir.replace(/\//g, '-');
var tmpFile = path.join(os.tmpdir(), printf('cache-%s.lzo', safeDir));
var baseName = path.basename(tmpFile);

// Save files
var safeRepo = repoName.replace(/\//g, '-');
var bucketname = ['sivart', safeRepo, branch].join('-');

function getHash(file, cb) {
  var stream = fs.createReadStream(file);

  stream.on('data', function (data) {
    hash.update(data, 'utf8');
  });

  stream.on('end', function () {
    cb(hash.digest('base64'));
  });
}

console.log(printf('Upload cache directory "%s" on branch "%s" (maybe)', cacheDir, branch));
storage.createBucket(bucketname, function(cberr, bucket) {
  if (cberr) {
    bucket = storage.bucket(bucketname);
  }

  var exec = require('child_process').exec;
  exec(printf('tar caf %s %s', tmpFile, cacheDir), { cwd: process.cwd() },
    function(exerr) { // , stdout, stderr) {
      if (exerr) {
        console.log('error compressing:');
        console.log(exerr);
      } else {
      // Get current file & see if we wanna re-save it
      //    if hash values are different
      getHash(tmpFile, function(hashValue) {
        bucket.getFiles({prefix: baseName}, function handleResults(gferr, files) {
          if (gferr || !files[0]) {
            files[0] = bucket.file(baseName);
            console.log(gferr || 'cache file does not exist: ' + baseName);
          }
          if (files[0]) {
            console.log(files[0].metadata);
            console.log(hashValue);
            var stat = fs.lstatSync(tmpFile);
            console.log(stat);
            if (files[0].metadata.md5Hash !== hashValue) {
    files[0].download(
      { destination: tmpFile + '.orig' },
      function(err) {
        /*
        if (err) {
          console.log('Error getting cache directory: ' + tmpFile);
        } else {
          */
              // ship it
              console.log(printf('Directory changed - uploading...'));
              bucket.upload(tmpFile, { destination: baseName },
                function(uperr) { // , file) {
                  if (uperr) {
                    console.log(printf('Error updating cached directory'));
                    console.log(uperr);
                  } else {
                    console.log(printf('Successfully saved directory'));
                  }
                }
              );
        }
       // }
        );
            } else {
              console.log(printf('Directory unchanged - not updating'));
            }
          }
        });
      });
    }
      });
    });


/*
  new targz().compress(cacheDir, tmpFile, function(err){
    if (err) {
      console.log("Error compressing cache - skipping");
      console.log(err);
    } else {
      // Get current file & see if we wanna re-save it
      //    if hash values are different
      getHash(tmpFile, function(hashValue) {
        bucket.getFiles({prefix: baseName}, function handleResults(err, files) {
          if (err || !files[0]) {
            files[0] = { metadata: { hashValue: 0 } };
            console.log(err || 'cache file does not exist: ' + baseName);
          }
          if (files[0]) {
            console.log(files[0].metadata);
            console.log(hashValue);
            var stat = fs.lstatSync(tmpFile);
            console.log(stat);
            if (files[0].metadata.md5Hash != hashValue) {
    files[0].download(
      { destination: tmpFile + '.orig' },
      function(err) {
        if (err) {
          console.log('Error getting cache directory: ' + tmpPath);
        } else {

              // ship it
              console.log(printf('Directory changed - uploading...'));
              bucket.upload(tmpFile, { destination: baseName },
                function(err, file) {
                  if (err) {
                    consoloe.log(printf('Error updating cached directory'));
                    console.log(err);
                  } else {
                    console.log(printf('Successfully saved directory'));
                  }
                }
              );
        }});
            } else {
              console.log(printf('Directory unchanged - not updating'));
            }
          }
        });
      });
    }
  });
});
  */


