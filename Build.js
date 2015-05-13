'use strict';

var CreateScript = require('./CreateScript');
var BuildData = require('sivart-data/WriteBuildData');
var Instance = require('sivart-GCE/Instance');
var Q = require('q');

var Build = function(args, rawBuildRequest) {
  for (var key in args) {
    this[key] = args[key];
  }
  this.createScript = new CreateScript(this);
  this.buildData = new BuildData(this.repoName, this.eventName);
  this.rawBuildRequest = rawBuildRequest;
};

// Take a startup script and create a VM for it
Build.prototype.createInstance = function(script, cb) {
  var newBuildVM = Instance.Factory('slave');

  // Stash instance name
  script.metadata.instanceName = newBuildVM.instanceName;
  newBuildVM.build(script.script, function(err) {
    script.metadata.created = new Date().getTime();
    script.metadata.state = 'running';
    cb(err, script.metadata);
  });
};

Build.prototype.doBuilds = function(cb) {
  var me = this;
  Q.ninvoke(this.buildData, 'getNextBuildNumber')
    .then(function(buildId) {
      Q.ninvoke(me.createScript, 'getScripts', buildId)
        .then(function(scripts) {
          Q.allSettled(scripts.map(function(script) {
              return Q.ninvoke(me, 'createInstance', script);
          }))
          .then(function(results) {
            var runs =
              results
                .map(function(val) {
                  return val.state === 'fulfilled' ? val.value : val.reason;
                });

            var successes =
              results
                .filter(function(resp) {
                  return resp.state === 'fulfilled';
                })
                .sort(function(a, b) {
                  return a.value.buildNumber - b.value.buildNumber;
                })
                .map(function(val) {
                  return val.value;
                });

            var failures =
              results
                .filter(function(resp) {
                  return resp.state === 'rejected';
                })
                .map(function(val) {
                  return val.reason;
                });

            Q.ninvoke(me.buildData, 'store', runs, me.rawBuildRequest,
                { state: 'running', id: buildId, branch: me.branch }).then(
              function() {
                if (failures.length) {
                  cb(failures, successes);
                } else {
                  cb(null, successes);
                }
              }
            );
          });
        });
    })
    .catch(function(err) {
      cb(err);
    });
};

module.exports = Build;
