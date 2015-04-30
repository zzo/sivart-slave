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
    bucket = storage.bucket(bucketname);
  } 
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
    file.createReadStream().pipe(fs.createWriteStream(tmpPath));
    new targz().extract(tmpPath, '.', function(err) {
      if (err) {
        console.log('Error extracting cache file');
        console.log(err);
      }
    });
  });

  if (nextQuery) {
    this.getFiles(nextQuery, handleResults);
  }
}
