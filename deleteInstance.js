'use strict';

var Instance = require('sivart-GCE/Instance');
var instanceName = require('os').hostname();
var exec = require('child_process').exec;

exec('users',
  function (error, stdout) {
    if (stdout) {
      console.log('Not deleting instance someone is logged in: ' + stdout);
    } else {
      if (error) {
        console.log('exec error: ' + error);
      }
      console.log('No one logged in - deleting');
      var sivartSlave = Instance.Factory('slave', instanceName);
      sivartSlave.delete(function(err) {
        // Should never get here right??
        console.log('Error deleting myself:');
        console.log(err);
      });
    }
  }
);
