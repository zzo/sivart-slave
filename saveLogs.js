var fs = require('fs');
var path = require('path');
var uuid = require('uuid');

var projectId = 'focal-inquiry-92622';
var gcloud = require('gcloud')({
    projectId: projectId
});

var dataset = gcloud.datastore.dataset({
    projectId: projectId
//    keyFilename: '/Users/trostler/Downloads/sivart-6ddd2fa23c3b.json'
});
var storage = gcloud.storage({
    projectId: projectId
//    keyFilename: '/Users/trostler/Downloads/sivart-6ddd2fa23c3b.json'
});

//Get metadata
var logDir = process.argv[2];
var metadata = JSON.parse(fs.readFileSync(path.join(logDir, 'metadata')));

// Generate bucket name
metadata.bucket = ['sivart', uuid.v1()].join('.');
metadata.stored = new Date().getTime();

// Store metadata
var key = dataset.key({ namespace: 'sivart', path: [ metadata.name, metadata.branch ] });
dataset.get(key, function(err, entity) {
  if (err) {
    console.log('Error getting entity');
    return;
  }
  if (!entity) {
    dataset.save({ key: key, data: { runs: [ metadata ]  }}, function(err) {
      if (err) {
        console.log('Error saving new entity');
      }
    });
  } else {
    entity.data.runs.unshift(metadata);
    dataset.save({ key: key, data: entity }, function(err) {
      if (err) {
        console.log('Error saving new entity');
      }
    });
  }
});

// Store files
storage.createBucket(metadata.bucket, function(err, bucket) {
  if (err) {
    console.log(err);
    return;
  }
  var files = fs.readdirSync(logDir);
  files.forEach(function(file) {
    fs.createReadStream(path.join(logDir, file)).pipe(bucket.file(file).createWriteStream());
  });
  fs.createReadStream('/tmp/user-script').pipe(bucket.file('user-script').createWriteStream());
  fs.createReadStream('/tmp/user-script.log').pipe(bucket.file('user-script.log').createWriteStream());
  fs.createReadStream('/var/log/startupscript.log').pipe(bucket.file('startupscript.log').createWriteStream());
  fs.createReadStream('/var/run/google.startup.script').pipe(bucket.file('google.startup.script').createWriteStream());
})
