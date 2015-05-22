'use strict';

var Q = require('q');
var Datastore = require('sivart-data/Datastore');
var Filestore = require('sivart-data/Filestore');
var Util = require('sivart-data/Util');
var Instance = require('sivart-GCE/Instance');
var Auth = require('sivart-GCE/Auth');
var fs = require('fs');

// IF STILL RUNNING:
// 1. Get lastest serial console log & dump into bucket
// 2. delete instance
// 3. Update run status to 'canceled'
function cancelRun(repoName, buildId, buildNumber, cb) {
  var datastore = new Datastore(repoName);
  var filestore = new Filestore(repoName);
  datastore.getRun(buildId, buildNumber, function(grerr, run) {
    if (grerr) {
      cb(grerr);
    } else {
      if (run.state === 'running' || run.state === 'building') {
        var instance = new Instance(Auth.projectId, Auth.zone, run.instanceName);
        instance.getSerialConsoleOutput(function(gscerr, contents) {
          if (gscerr) {
            cb(gscerr);
          } else {
            // dump to bucket as 'user-script.log'
            var tmpFileName = '/tmp/' + buildId + buildNumber;
            fs.writeFileSync(tmpFileName, contents.contents, 'utf8');
            filestore.saveRunFile(buildId, buildNumber, 'user-script.log', tmpFileName, function(srferr) {
              if (srferr) {
                cb(srferr);
              } else {
                // Now delete instance
                instance.delete(function(derr) {
                  if (derr) {
                    cb(derr);
                  } else {
                    // Now update run status to 'canceled'
                    datastore.updateRunState(buildId, buildNumber, 'canceled', cb);
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