var Instance = require('sivart-GCE/Instance');
var Auth = require('sivart-GCE/Auth');
var zone = 'us-central1-a';
var instanceName = require('os').hostname();
// should be able to get this stuff automatically!
var sivart_slave = new Instance(Auth.projectId, zone, instanceName);
sivart_slave.delete(function() {
  // bye bye!
});
