var fs = require('fs');
var path = require('path');
var hostname = require('os').hostname();
var Auth = require('sivart-GCE/Auth');
var gcloud = require('gcloud');
var storage = gcloud.storage(Auth);

//Get metadata
var logDir = process.argv[2];

// Store files
storage.createBucket(hostname, function(err, bucket) {
  if (err) {
    bucket = storage.bucket(hostname);
  }
  var files = fs.readdirSync(logDir);
  files.forEach(function(file) {
    fs.createReadStream(path.join(logDir, file)).pipe(bucket.file(file).createWriteStream());
  });
  fs.createReadStream('/tmp/user-script.sh').pipe(bucket.file('user-script.sh').createWriteStream());
  fs.createReadStream('/tmp/user-script.log').pipe(bucket.file('user-script.log').createWriteStream());
  fs.createReadStream('/var/log/startupscript.log').pipe(bucket.file('startupscript.log').createWriteStream());
})
