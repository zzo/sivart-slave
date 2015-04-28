var Instance = require('sivart-GCE/Instance');
var projectId = 'focal-inquiry-92622';
var fs = require('fs');
var CreateScript = require('./CreateScript');
var crypto = require('crypto');
var path = require('path');
var printf = require('util').format;

var repos = {
  angular2: {
    repoName: 'angular', 
    cloneURL: 'https://github.com/angular/angular.git',
    yamlURL: 'https://raw.githubusercontent.com/angular/angular/master/.travis.yml'
  },
  angular: {
    repoName: 'angular.js', 
    cloneURL: 'https://github.com/angular/angular.js.git',
    yamlURL: 'https://raw.githubusercontent.com/angular/angular.js/master/.travis.yml'
  }
};

function Project(eventName, args) {
  // TODO(trostler): handle other events (like PR)
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
  var hash = crypto.createHash('md5').update(script).digest("hex");
  var instanceName = 'slave-' + hash;
  var data = JSON.parse(fs.readFileSync(this.slaveFile));
  data.name = instanceName;
  data.disks[0].deviceName = instanceName;
  data.metadata.items[0].value = script.replace('$', '\\$');
  data.metadata.items[0].value = script;
  var sivart_slave = new Instance(projectId, this.zone, instanceName);
  sivart_slave.create({ instance: data }, function(err, resp) {
    if (err) {
      cb('ERROR creating instance:' + error);
    } else {
      cb(null, instanceName);
      me.slaves[instanceName] = resp;
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
      var responses = [];
      scripts.forEach(function(script) {
        me.createSlave(script, function(err, data) {
          if (err) {
            errors.push(err);
          } else {
            responses.push(data);
          }
          done++;
          if (done == scripts.length) {
            cb(errors, responses);
          }
        });
      });
    }
  });
};

module.exports = Project;
