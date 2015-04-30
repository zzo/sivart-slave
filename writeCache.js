var fs = require('fs');
var path = require('path');
var Auth = require('sivart-GCE/Auth');
var os = require('os');
var targz = require('tar.gz');
var printf = require('util').format;

//Get info 
var cacheDir = process.argv[2];
var reopName = process.argv[3];
var branch = process.argv[4];

var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

var safeDir = cacheDir.replace(/\//g, '-');
var tmpFile = path.join(os.tmpdir(), printf('cache-%s.tgz', safeDir));

// Save files
var safeRepo = repoName.replace(/\//g, '-');
var bucketname = ['sivart', safeRepo, branch].join('-');
storage.createBucket(bucketname, function(err, bucket) {
  if (err) {
    bucket = storage.bucket(bucketname);
  } 

  new targz().compress(cacheDir, tmpFile, function(err){
    if (err) {
      console.log("Error compressing cache - skipping");
      console.log(err);
    } else {
      fs.createReadStream(tmpFile).pipe(bucket.file(path.basename(tmpFile)).createWriteStream());
    }
  });
});
