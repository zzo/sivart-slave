'use strict';

var Q = require('q');
var Datastore = require('sivart-data/Datastore');
var Filestore = require('sivart-data/Filestore');
var Util = require('sivart-data/Util');
var Instance = require('sivart-GCE/Instance');
var fs = require('fs');

// IF STILL RUNNING:
// 1. Get lastest serial console log & dump into bucket
// 2. delete instance
// 3. Update run status to 'canceled'
function cancelRun(repoName, buildId, buildNumber, cb) {
  var datastore = new Datastore(repoName);
  var filestore = new Filestore(repoName);
  // First get the build instance to ensure it's actually running right now
  datastore.getRun(buildId, buildNumber, function(grerr, run) {
    if (grerr) {
      cb(grerr);
    } else {
      if (run.state === 'running' || run.state === 'building') {
        // It's running to set its state to 'canceled'
        datastore.updateRunState(buildId, buildNumber, 'canceled', function(urserr) {
          if (urserr) {
            cb(urserr);
          } else {
            var instance = Instance.Factory('slave', run.instanceName);
            // Get serial console output
            instance.getSerialConsoleOutput(function(gscerr, contents) {
              if (gscerr) {
                cb(gscerr);
              } else {
                // dump to bucket as 'user-script.log'
                var tmpFileName = '/tmp/' + buildId + buildNumber;
                fs.writeFileSync(tmpFileName, contents.contents);
                filestore.saveRunFile(buildId, buildNumber, 'user-script.log', tmpFileName, function(srferr) {
                  fs.unlinkSync(tmpFileName); // clean up
                  if (srferr) {
                    cb(srferr);
                  } else {
                    // Now delete instance
                    instance.delete(cb);
                  }
                });
              }
            });
          }
        });
      } else {
        // Nothing to do job not running
        cb(null);
      }
    }
  });
}

function cancelBuild(repoName, buildId, cb) {
  var datastore = new Datastore(repoName);
  datastore.getABuild(buildId, function(gaberr, build) {
    if (gaberr) {
      cb(gaberr);
    } else {
      var promises = build.runs.map(function(run) {
        return Q.nfcall(cancelRun, repoName, buildId, run.buildNumber);
      });
      Util.dealWithAllPromises(promises, cb);
    }
  });
}

module.exports = { CancelBuild: cancelBuild, CancelRun: cancelRun };
