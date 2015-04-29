var Instance = require('sivart-GCE/Instance');
var projectId = 'focal-inquiry-92622';
var fs = require('fs');
var CreateScript = require('./CreateScript');
var path = require('path');
var printf = require('util').format;
var uuid = require('uuid');
var gcloud = require('gcloud');
var dataset = gcloud.datastore.dataset({
    projectId: projectId,
//    keyFilename: '/Users/trostler/Downloads/sivart-6ddd2fa23c3b.json'
});

function Project(eventName, args) {
  // TODO(trostler): handle other events (like PR)
  this.eventName = eventName;
  this.keepVM = args.keepVM
  this.github = args;
  if (eventName == 'push') {
    this.branch = path.basename(args.ref);
    this.cloneURL = args.repository.clone_url;
    this.repoName = args.repository.full_name;
    this.yamlURL = printf('https://raw.githubusercontent.com/%s/%s/.travis.yml', this.repoName,  this.branch);
    this.commit = args.after;
    this.metadata = { eventName: eventName, message: args };
  }

  this.createScript = new CreateScript(this);
  this.slaveFile  = args.slaveJSON || path.join(__dirname, 'gce/slave.json');
  this.zone = args.zone || 'us-central1-a';
  this.projectId = args.projectId || projectId;
  this.slaves = {};
}

Project.prototype.createScripts = function(cb) {
  var me = this;
  this.createScript.getScripts(function(err, scripts) {
    if (err) {
      cb(err);
    } else {
      me.scripts = scripts;
      cb(null, scripts);
    }
  });
};

Project.prototype.createSlave = function(script, cb) {
  var me = this;
  var safeName = this.repoName.replace(/\//g, '-');
  var instanceName = [safeName, this.eventName, uuid.v1()].join('-');
  var data = JSON.parse(fs.readFileSync(this.slaveFile));
  data.name = instanceName;
  data.disks[0].deviceName = instanceName;
  data.metadata.items[0].value = script.script.replace('$', '\\$');
  data.metadata.items[0].value = script.script;
  var sivart_slave = new Instance(projectId, this.zone, instanceName);
  sivart_slave.create({ instance: data }, function(err, resp) {
    if (err) {
      cb('ERROR creating instance:' + err);
    } else {
      script.metadata.created = new Date().getTime();
      me.slaves[instanceName] = script.metadata;
      cb(null, instanceName);
    }
  });
};

Project.prototype.createAllSlaves = function(cb) {
  var me = this;
  this.createScripts(function(err, scripts) {
    if (err) {
      cb(err);
    } else {
      var done = 0;
      var errors = [];
      var responses = {};
      scripts.forEach(function(script) {
        me.createSlave(script, function(err, data) {
          if (err) {
            errors.push(err);
          } else {
            responses[data] = script.metadata;
          }
          // use promises :)
          done++;
          if (done == scripts.length) {
            me.initialSave(errors, responses, function(err, key) {
              if (err) {
                errors.push(err);
              } 
              cb(errors, responses, key);
            });
          }
        });
      });
    }
  });
};

Project.prototype.initialSave = function(errors, instances, cb) {
  var safeName = this.repoName.replace(/\//g, '.');
  var keyKind = this.eventName;
  var key = dataset.key({ namespace: safeName, path: [ keyKind ] });

  // Datasets don't like nulls in them - replace with empty strings
  var github = JSON.parse(JSON.stringify(this.github, function(k, v) {
    if (!v)
      return '';
    else
      return v;
  }));

  dataset.save({ key: key, data: { errors: errors, instances: instances, github: github }}, function(err, r) {
    if (err) {
      cb(err);
    } else {
      cb(null, key);
    }
  });
};

module.exports = Project;
