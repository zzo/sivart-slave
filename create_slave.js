var Ins = require('sivart-GCE/Instance');
var projectId = 'focal-inquiry-92622';
var fs = require('fs');
var slave_num = process.argv[2] || 1;
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

var which = process.env[2] || 'angular2';
var createScript = new CreateScript(repos[which]);

createScript.getScripts(function(err, scripts) {
  if (err) {
    console.log(err);
  } else {
//    var script = scripts[0];
 //   console.log(script);
    scripts.forEach(function(script) {
      var hash = crypto.createHash('md5').update(script).digest("hex");
      var instanceName = 'slave-' + hash;
      var data = JSON.parse(fs.readFileSync('gce/slave.json'));
      data.name = instanceName;
      data.disks[0].deviceName = instanceName;
      data.metadata.items[0].value = script.replace('$', '\\$');
      data.metadata.items[0].value = script;
      var sivart_slave = new Ins(projectId, 'us-central1-a', instanceName);
      sivart_slave.create({ instance: data }, function(err, resp) {
        if (err) {
          console.log('ERROR creating instance:');
          console.error(err);
        } else {
          sivart_slave.tail_gce_console(function(err, data) {
            console.log(data);
            if (err) {
              console.log('ERROR tailing serial output:');
              console.error(err);
              return true;
            } else if (data.toString().match('END USER SCRIPT')) {
              return true;
            } 
          });
        }
      });
    });
  }
});
