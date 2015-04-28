var Ins = require('sivart-GCE/Instance');
var projectId = 'focal-inquiry-92622';
var fs = require('fs');
var CreateScript = require('./CreateScript');
var crypto = require('crypto');

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

function Project(args) {
  this.createScript = new CreateScript(repos[args.project]);
  this.slaveFile  = args.slaveJSON || 'gce/slave.json';
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
  var sivart_slave = new Ins(projectId, this.zone, instanceName);
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
  createScript.getScripts(function(err, scripts) {
    if (err) {
      cb(err);
    } else {
      scripts.forEach(function(script) {
        me.createSlave(function(err, data) {
        });
      });
    }
  });
};

module.exports = Project;
