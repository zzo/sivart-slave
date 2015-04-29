var Project = require('./Project');

var repos = {
  angular2: {
    ref: 'master',
    after: 'HEAD',
    repository: { 
      full_name: 'angular/angular', 
      clone_url: 'https://github.com/angular/angular.git' 
    },
    keepVM: 1  // for debugging
  },
  angular: {
    ref: 'master',
    after: 'HEAD',
    repository: { 
      full_name: 'angular/angular.js', 
      clone_url: 'https://github.com/angular/angular.js.git' 
    },
  }
};

var which = process.env[2] || 'angular2';
var project = new Project('push', repos[which]);
project.createAllSlaves(function(err, slaves, dbkey) {
  console.log(err);
  console.log(slaves);
  console.log(dbkey);
});
