var Instance = require('sivart-GCE/Instance');
var projectId = 'focal-inquiry-92622';
var zone = 'us-central1-a';
var instanceName = require('os').hostname();
// should be able to get this stuff automatically!
var sivart_slave = new Instance(projectId, zone, instanceName);
sivart_slave.delete(function() {
  // bye bye!
});
