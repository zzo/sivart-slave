'use strict';

var Instance = require('sivart-GCE/Instance');
var Auth = require('sivart-GCE/Auth');
var zone = 'us-central1-a';
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
      var sivartSlave = Instance.Factory(slave, instanceName);
      sivartSlave.delete(function() {
        // bye bye!
      });
    }
  });
