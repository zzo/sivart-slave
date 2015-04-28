var Project = require('./Project');

var project = new Project({project: 'angular2'});

project.createScripts(function(err, scripts) {
  if (!err) {
    project.createSlave(scripts[0], function(err, resp) {
      if (err) {
        console.log('err: ' + err);
      } else { 
        console.log('creating slave: ' + resp);
      }
    });
  } else {
    console.log('err creating scripts: ' + err);
  }
});
