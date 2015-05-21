'use strict';

var Build = require('./Build');
var Q = require('q');
var Datastore = require('sivart-data/Datastore');
var Filestore = require('sivart-data/Filestore');

function RedoEntireBuild(repoName, buildId, cb) {
  var datastore = new Datastore(this.repoName);
  datastore.getABuild(buildId, function(err, build) {
    if (err) {
      cb(err);
    } else {
      Q.allSettled(build.runs.map(function(run) {
        return Q.ninvoke(null, 'RedoOneRun', repoName, buildId, run.buildNumber);
      }))
      .then(function(results) {
        var failures =
          results
            .filter(function(resp) {
              return resp.state === 'rejected';
            })
            .map(function(val) {
              return val.reason;
            });

        if (failures.length) {
          cb(failures);
        } else {
          cb();
        }
      });
    }
  });
}

// Blow out all of the old log files? YES
function RedoOneRun(repoName, buildId, buildNumber, cb) {
  var datastore = new Datastore(repoName);
  datastore.getStartupScript(buildId, buildNumber, function(err, script) {
    if (err) {
      cb(err);
    } else {
      Build.prototype.createInstance.call(null, { script: script, metadata: {} }, function(cierr, scriptMetadata) {
        if (cierr) {
          cb(cierr);
        } else {
          // update some stuff
          // for the run itself need to update 'state' to 'running'
          // build the overall build need to update state to 'running'
          //  TODO(trostler): what about 'created' for both the run and overall job??
          datastore.updateRunState(buildId, buildNumber,
            {
              state: scriptMetadata.state,
              instanceName: scriptMetadata.instanceName
            }, function(urserr) {
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

module.exports = { RedoEntireBuild: RedoEntireBuild };
