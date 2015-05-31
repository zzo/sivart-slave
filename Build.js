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

// Take a startup script and create a VM for it
Build.prototype.createInstance = function(script, cb) {
  var newBuildVM = Instance.Factory('slave');

  // Stash instance name
  script.metadata.instanceName = newBuildVM.instanceName;
  newBuildVM.build(script.script, function(err) {
    script.metadata.created = new Date().getTime();
    script.metadata.state = 'running';
    script.metadata.script = new Buffer(script.script, 'utf8');
    script.metadata.privateKey = new Buffer(newBuildVM.privateKey);
    cb(err, script.metadata);
  });
};

Build.prototype.createInstancePromise = function(script) {
  var me = this;
  var newBuildVM = Instance.Factory('slave');

  // Stash run metadata
  script.metadata.instanceName = newBuildVM.instanceName;
  script.metadata.created = new Date().getTime();
  script.metadata.state = 'running';
  console.log('create instance promise');
  /*
  return this.filestore.saveStartupScript(
    script.metadata.branch,
    script.metadata.buildId,
    script.metadata.buildNumber,
    script.script)
  .then(function() {
    return me.filestore.savePrivateKey(
      script.metadata.branch,
      script.metadata.buildId,
      script.metadata.buildNumber,
      newBuildVM.privateKey);
  })
  .then(function() {
    return Q.ninvoke(newBuildVM, 'build', script.script)
      .then(function() {
        return script.metadata;
      })
      .catch(function(error) {
        script.metadata.error = error;
        return script.metadata;
      });
  });
  */
  return this.filestore.saveScriptAndPK(
    script.metadata.branch,
    script.metadata.buildId,
    script.metadata.buildNumber,
    script.script,
    newBuildVM.privateKey)
  .then(function() {
    return Q.ninvoke(newBuildVM, 'build', script.script)
      .then(function() {
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
    console.log('saving results', results);
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
