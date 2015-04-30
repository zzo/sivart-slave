var fs = require('fs');
var path = require('path');
var os = require('os');
var projectId = 'focal-inquiry-92622';
var targz = require('tar.gz');

//Get info 
var reopName = process.argv[2];
var branch = process.argv[3];

var gcloud = require('gcloud');
var storage = gcloud.storage({
    projectId: projectId,
//    keyFilename: '/Users/trostler/Downloads/sivart-6ddd2fa23c3b.json'
});

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
