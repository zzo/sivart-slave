'use strict';

var Q = require('q');
var Datastore = require('sivart-data/Datastore');
var Filestore = require('sivart-data/Filestore');
var Util = require('sivart-data/Util');
var Instance = require('sivart-GCE/Instance');

function createInstance(filestore, buildId, buildNumber, script) {
  var newBuildVM = Instance.Factory('slave');

  return Q.ninvoke(filestore, 'getBranch', buildId)
  .then(function(branch) {
    return filestore.saveScriptAndPK( // this will overwrite the old ones
      branch,
      buildId,
      buildNumber,
      script,
      newBuildVM.privateKey);
  })
  .then(function() {
    return Q.ninvoke(newBuildVM, 'build', script);
  })
  .then(function(ip) {
    return {
      ip: ip,
      instanceName: newBuildVM.instanceName,
      state: 'running',
      created: new Date().getTime()
    };
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
      var filestore = new Filestore(repoName);
      // Then get the startup script for this instance
      filestore.getStartupScript(buildId, buildNumber, function(gsserr, script) {
        if (gsserr) {
          cb(gsserr);
        } else {
          // Then blow away all log files
          filestore.deleteRunFiles(buildId, buildNumber, function(drferr) {
            if (drferr) {
              cb(drferr);
            } else {
              // Then create the VM
              createInstance(filestore, buildId, buildNumber, script.toString())
              .then(function(scriptMetadata) {
                  // Finally update the run metadata (again)
                  // This will set state to 'running' again AND set the instanceName which we now have
                  //  which we did not want to wait for initially
                  return Q.ninvoke(datastore, 'updateRunState', buildId, buildNumber, scriptMetadata);
              })
              .catch(function(err) {
                cb(err);
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
