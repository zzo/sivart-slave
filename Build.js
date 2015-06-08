'use strict';

var CreateScript = require('./CreateScript');
var Datastore = require('sivart-data/Datastore');
var Filestore = require('sivart-data/Filestore');
var Instance = require('sivart-GCE/Instance');
var Q = require('q');

function Build(args, rawBuildRequest) {
  for (var key in args) {
    if (args.hasOwnProperty(key)) {
      this[key] = args[key];
    }
  }
  this.createScript = new CreateScript(this);
  this.datastore = new Datastore(this.repoName);
  this.filestore = new Filestore(this.repoName);
  this.rawBuildRequest = rawBuildRequest;
}

Build.prototype.createInstancePromise = function(script) {
  var me = this;
  var newBuildVM = Instance.Factory('slave');

  // Persist this to filestore not datastore
  var yml = script.metadata.yml;
  delete script.metadata.yml;

  // Stash run metadata
  script.metadata.created = new Date().getTime();
  script.metadata.state = 'running';
  script.metadata.instanceName = newBuildVM.instanceName;
  return this.filestore.saveScriptAndPKAndYML(
    script.metadata.branch,
    script.metadata.buildId,
    script.metadata.buildNumber,
    script.script,
    newBuildVM.privateKey,
    yml)
  .then(function() {
    return Q.ninvoke(newBuildVM, 'build', script.script)
      .then(function(ip) {
        script.metadata.ip = ip;
        return script.metadata;
      })
      .catch(function(error) {
        script.metadata.error = error;
        return script.metadata;
      });
  });
};

// returns a promise
Build.prototype.doBuildsPromise = function() {
  var me = this;
  return Q.ninvoke(this.datastore, 'getNextBuildNumber')
  .then(function(buildId) {
    me.buildId = buildId;
    return Q.ninvoke(me.createScript, 'getScripts', buildId);
  })
  .then(function(scripts) {
    return Q.all(scripts.map(function(script) {
      return me.createInstancePromise(script);
    }));
  })
  .then(function(results) {
    return Q.ninvoke(
        me.datastore,
        'saveInitialData',
        me.buildId,
        results,
        me.rawBuildRequest,
        {
          kind: me.eventName,
          created: new Date().getTime(),
          state: 'running',
          id: me.buildId,
          repoName: me.repoName,
          branch: me.branch
        }
    );
  });
};

module.exports = Build;
