'use strict';

var Q = require('q');
var Datastore = require('sivart-data/Datastore');
var Filestore = require('sivart-data/Filestore');
var Util = require('sivart-data/Util');
var Instance = require('sivart-GCE/Instance');

function createInstance(script, cb) {
  var newBuildVM = Instance.Factory('slave');

  // Stash instance name
  newBuildVM.build(script, function(err) {
    var ret = {
      instanceName: newBuildVM.instanceName,
      state: 'running',
      created: new Date().getTime(),
      privateKey: new Buffer(newBuildVM.privateKey)
    };
    cb(err, ret);
  });
}

// Blow out all of the old log files? YES
function RedoOneRun(repoName, buildId, buildNumber, cb) {
  var datastore = new Datastore(repoName);
  // First update run state (which will also update the overall build state)
  //   Do this first even tho we need to do it again later to update to 'running' ASAP
  datastore.updateRunState(buildId, buildNumber, 'running', function(urserr) {
    if (urserr) {
      cb(urserr);
    } else {
      // Then blow away all log files
      var filestore = new Filestore(repoName);
      filestore.deleteRunFiles(buildId, buildNumber, function(drferr) {
        if (drferr) {
          cb(drferr);
        } else {
          // Then get the startup script for this instance
          datastore.getStartupScript(buildId, buildNumber, function(err, script) {
            if (err) {
              cb(err);
            } else {
              // Then create the VM
              createInstance(script, function(cierr, scriptMetadata) {
                if (cierr) {
                  cb(cierr);
                } else {
                  // Finally update the run metadata (again)
                  // This will set state to 'running' again AND set the instanceName which we now have
                  //  which we did not want to wait for initially
                  datastore.updateRunState(buildId, buildNumber, scriptMetadata, cb);
                }
              });
            }
          });
        }
      });
    }
  });
}

function RedoEntireBuild(repoName, buildId, cb) {
  var datastore = new Datastore(repoName);
  datastore.getABuild(buildId, function(err, build) {
    if (err) {
      cb(err);
    } else {
      var promises = build.runs.map(function(run) {
        return Q.nfcall(RedoOneRun, repoName, buildId, run.buildNumber);
      });
      Util.dealWithAllPromises(promises, cb);
    }
  });
}

module.exports = { RedoEntireBuild: RedoEntireBuild, RedoOneRun: RedoOneRun };
