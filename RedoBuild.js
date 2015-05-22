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
      created: new Date().getTime()
    };
    cb(err, ret);
  });
}

// Blow out all of the old log files? YES
function RedoOneRun(repoName, buildId, buildNumber, cb) {
  var datastore = new Datastore(repoName);
  datastore.getStartupScript(buildId, buildNumber, function(err, script) {
    if (err) {
      cb(err);
    } else {
      createInstance(script, function(cierr, scriptMetadata) {
        if (cierr) {
          cb(cierr);
        } else {
          // update some stuff
          // for the run itself need to update 'state' to 'running'
          // build the overall build need to update state to 'running'
          //  TODO(trostler): what about 'created' for both the run and overall job??
          datastore.updateRunState(buildId, buildNumber, scriptMetadata, function(urserr) {
              if (urserr) {
                cb(urserr);
              } else {
                // update overall build state to 'running'
                datastore.updateOverallState(buildId, 'running', function(uoserr) {
                  if (uoserr) {
                    cb(uoserr);
                  } else {
                    // Finally?  Blow away all current files for this run
                    //  maybe do this first??
                    var filestore = new Filestore(repoName);
                    filestore.deleteRunFiles(buildId, buildNumber, function(drferr) {
                      if (drferr) {
                        cb(drferr);
                      } else {
                        cb(null);
                      }
                    });
                  }
                });
              }
            }
          );
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
