var Project = require('./Project');

var repos = {
  angular2: {
    ref: 'path/to/master',
    after: 'HEAD',
    repository: { 
      full_name: 'angular/angular', 
      clone_url: 'https://github.com/angular/angular.git' 
    },
  }
  /*
  angular: {
    repoName: 'angular.js', 
    cloneURL: 'https://github.com/angular/angular.js.git',
    yamlURL: 'https://raw.githubusercontent.com/angular/angular.js/master/.travis.yml'
  }
  */
};

var which = process.env[2] || 'angular2';
var project = new Project('push', repos[which]);
project.createAllSlaves(function(err, slaves) {
  console.log(err);
  console.log(slaves);
});
