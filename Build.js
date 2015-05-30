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
  var newBuildVM = Instance.Factory('slave');

  // Stash run metadata
  script.metadata.instanceName = newBuildVM.instanceName;
  script.metadata.created = new Date().getTime();
  script.metadata.state = 'running';
  this.filestore.saveScriptAndPK(
    script.metadata.branch,
    script.metadata.buildId,
    script.metadata.buildNumber,
    script.script,
    newBuildVM.privateKey, function(err) {
      if (err) {
        throw new Error(err);
      } else {
        return Q.ninvoke(newBuildVM, 'build', script.script)
          .then(function() {
            return script.metadata;
          })
          .catch(function(error) {
            script.metadata.error = error;
            return script.metadata;
          });
    }
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

Build.prototype.doBuilds = function(cb) {
  var me = this;
  Q.ninvoke(this.datastore, 'getNextBuildNumber')
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
                  if (val.state === 'fulfilled') {
                    return val.value;
                  } else {
                    var ret = val.value;
                    ret.error = val.reason;
                    return ret;
                  }
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

            Q.ninvoke(
                me.datastore,
                'saveInitialData',
                runs,
                me.rawBuildRequest,
                {
                  kind: me.eventName,
                  created: new Date().getTime(),
                  state: 'running',
                  id: buildId,
                  repoName: me.repoName,
                  branch: me.branch
                }
            ).then(
              function() {
                if (failures.length) {
                  cb(failures, successes);
                } else {
                  cb(null, successes);
                }
              }
            )
            .catch(function(sID) {
              cb(sID);
            });
          });
        });
    })
    .catch(function(err) {
      cb(err);
    });
};

module.exports = Build;
