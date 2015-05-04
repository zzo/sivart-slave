'use strict';

var Instance = require('sivart-GCE/Instance');
var fs = require('fs');
var CreateScript = require('./CreateScript');
var path = require('path');
var printf = require('util').format;
var uuid = require('uuid');
var gcloud = require('gcloud');
var Auth = require('sivart-GCE/Auth');

var dataset = gcloud.datastore.dataset(Auth);

function Project(eventName, args) {
  // TODO(trostler): handle other events (like PR)
  this.eventName = eventName;
  this.keepVM = args.keepVM;
  this.github = args;
  this.timeout = args.timeout || 3600;
  this.nochangeTimeout = args.nochangeTimeout || 600;

  this.repoName = args.repository.full_name;
  this.cloneURL = args.repository.clone_url;
  this.yamlURL = printf('https://raw.githubusercontent.com/%s/%s/.travis.yml', this.repoName, this.branch || 'master');
  this.metadata = { eventName: eventName, message: args };

  if (eventName === 'push') {
    this.branch = path.basename(args.ref);
    this.commit = args.after;
  } else if (eventName === 'pull_request') { // PR
    this.pr = args.number;
    this.action = args.action; // 'synchronize' or 'closed' or 'unlabeled'
    /*
     * probably only want opened/closed/synchronized?
    if (action == 'opened' || action == 'closed' || action == 'synchronized') {
      // ...
    } else {
      return null;
    }
    */
  } else {
    throw new Error('I do not handle github event: ' + eventName);
  }

  this.createScript = new CreateScript(this);
  this.slaveFile = args.slaveJSON || path.join(__dirname, 'gce/slave.json');
  this.zone = args.zone || 'us-central1-a';
  this.projectId = args.projectId || Auth.projectId;
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
  // Instance names must match: /^(?:[a-z](?:[-a-z0-9]{0,61}[a-z0-9])?)$/
  var instanceName = ['x', new Date().getTime(), uuid.v4()].join('-').slice(0, 63);
  var data = JSON.parse(fs.readFileSync(this.slaveFile));
  data.name = instanceName;
  data.disks[0].deviceName = 'slave-disk';
  data.disks[0].initializeParams.sourceImage = 'global/images/slave'; // Created with 'createSnapshot.js'
  // data.metadata.items[0].value = script.script.replace('$', '\\$');
  data.metadata.items[0].value = script.script; // .replace('$', '\\$');
  var sivartSlave = new Instance(Auth.projectId, this.zone, instanceName);
  sivartSlave.create({ instance: data }, function(err) { // , resp) {
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
  this.createScripts(function(cserr, scripts) {
    if (cserr) {
      cb([cserr]);
    } else {
      var done = 0;
      var errors = [];
      var responses = {};
      scripts.forEach(function(script) {
        me.createSlave(script, function(cslaveerr, data) {
          if (cslaveerr) {
            errors.push(cslaveerr);
          } else {
            responses[data] = script.metadata;
          }
          // use promises :)
          done++;
          if (done === scripts.length) {
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

  var data = { errors: errors, instances: instances, github: this.github };
  data = JSON.parse(JSON.stringify(data, function(k, v) {
    if (!v) {
      // Datasets don't like nulls in them - replace with empty strings
      return '';
    } else if (v instanceof Object && !Object.keys(v).length) {
      // Datasets also don't like empty objects!
      return ''; // or maybe { ____iamempty: 0 }?
    } else {
      return v;
    }
  }));

  console.log('Saving: data:');
  console.log(require('util').inspect(data, { showHidden: true, depth: null }));

  dataset.save({ key: key, data: data }, function(err) { // , r) {
    if (err) {
      cb(err);
    } else {
      cb(null, key);
    }
  });
};

module.exports = Project;
