'use strict';

var fs = require('fs');
var path = require('path');
var Instance = require('sivart-GCE/Instance');
var Auth = require('sivart-GCE/Auth');
var printf = require('util').format;
var Q = require('q');
Q.longStackSupport = true;

var slaveImageName = 'slave-1';
var instanceName = 'slave-snapshot';
var zone = 'us-central1-a';
var snapshot = new Instance(Auth.projectId, zone, instanceName);

var snapshotFile = path.join(__dirname, 'gce/slave.json');
var data = JSON.parse(fs.readFileSync(snapshotFile));

var startupScript = fs.readFileSync(path.join(__dirname, 'snapshot.sh'), 'utf8');
data.name = instanceName;
data.disks[0].deviceName = instanceName;
data.metadata.items[0].value = startupScript;//.replace('$', '\\$');
data.disks[0].autoDelete = false;

console.log('creating instance...');
Q.ninvoke(snapshot, 'create', { instance: data })
  .then(function(result) {
      console.log('waiting for instance...');
      var deferred = Q.defer();
      function getConsole() {
        snapshot.gce.getSerialConsoleOutput({ instance: instanceName }, function(err, output) {
          if (err) {
            throw new Error(err);
          }
          var content = output.contents;
          if (content.toString().match('__DONE__')) {
            console.log(content);
            deferred.resolve();
          } else {
            console.log(content);
            setTimeout(getConsole, 10000);
          }
        });
      }
      getConsole();
      return deferred.promise;
    }).then(function(result) {
      console.log('Image created - deleting instance...');
      return Q.ninvoke(snapshot, 'delete');
    }).then(function(result) {
      return Q.ninvoke(snapshot.gce, 'start');
    })
    .then(function(compute) {
      var deferred = Q.defer();
      console.log(printf('Deleting current "%s" image...', slaveImageName));
      compute.images.delete({image: slaveImageName }, function(err, resp) {
        console.log('Deleted current image:');
        console.log(err);
        console.log(resp);
        console.log('resolving promise');
        // ignore errors
        deferred.resolve(compute);
      });
      return deferred.promise;
    })
    .then(function(compute) {
      console.log('Create new image %s from %s', slaveImageName, instanceName);
      return Q.ninvoke(compute.images, 'insert', {
        resource: {
          name: slaveImageName,
          sourceDisk: printf('zones/%s/disks/%s', zone, instanceName)
        }
      });
     })
    .then(function(imageInsertResponse) {
      console.log('Creating new image (be pateint!)...');
      return Q.ninvoke(snapshot.gce, 'waitForGlobalOperation', imageInsertResponse[0]);
    })
    .then(function() {
      return Q.ninvoke(snapshot.gce.compute.disks, 'delete', { disk: instanceName });
    })
    .then(function(deleteInsertResponse) {
      console.log('Deleting base disk (be pateint!)...');
      return Q.ninvoke(snapshot.gce, 'waitForZoneOperation', deleteInsertResponse[0]);
    }).then(function() {
      console.log(printf('All done!  New "%s" image successfully', slaveImageName));
    }).catch(function(error) {
      console.error('error');
      console.error(error);
    });
