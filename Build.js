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
  var newBuildVM = Instance.Slave();

  // Stash some stuff for fun
  script.metadata.created = new Date().getTime();
  script.metadata.instanceName = newBuildVM.instanceName;

  newBuildVM.build(script.script, function(err) { cb(err, script); });
};

Build.prototype.doBuilds = function(cb) {
  var me = this;
  Q.ninvoke(this.buildData, 'getNextBuildNumber')
    .then(function(buildId) {
      Q.ninvoke(me.createScript, 'getScripts', buildId)
        .then(function(scripts) {
          Q.allSettled(scripts.map(function(script) { return Q.ninvoke(me, 'createInstance', script); }))
            .then(function(results) {
              var responses = 
                results
//                  .filter(function(resp) { return resp.state === 'fulfilled'; })
//                  .sort(function(a, b) { a.value.metadata.buildNumber - b.value.metadata.buildNumber})
                  .map(function(val) {
                    return val.state === 'fulfilled' ? val.value.metadata : val.reason;
                  });
              Q.ninvoke(me.buildData, 'store', responses, me.rawBuildRequest).then(cb());
            });
        });
    })
    .catch(function(err) {
      cb(err);
    });
};

module.exports = Build;
