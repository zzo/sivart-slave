'use strict';

var Datastore = require('sivart-data/Datastore');
var Instance = require('sivart-GCE/Instance');
var client = require('scp2');
var path = require('path');
var fs = require('fs');

function GetLiveFile(repoName, buildId, buildNumber, filename) {
  this.datastore = new Datastore(repoName);
  this.filename = filename;
  this.buildId = buildId;
  this.buildNumber = buildNumber;
}

// Get private key and scp file over
GetLiveFile.prototype.fetch = function(cb) {
  var me = this;
  this.datastore.getPrivateKey(this.buildId, this.buildNumber, function(err, key, run) {
    if (err) {
      cb(err);
    } else {
      var instance = Instance.Factory('slave', run.instanceName);
      instance.getIP(function(gierr, ip) {
        if (gierr) {
          cb(gierr);
        } else {
          // ok we have the ip address & private key - grab the file...
          // first cook up a dummy filename
          var localFile = path.join('/tmp', String(new Date().getTime()));
          client.scp({
            host: ip,
            username: 'sivart',
            path: me.filename,
            privateKey: key
          }, localFile, function(scperr) {
            if (scperr) {
              cb(scperr);
            } else {
              // TODO(trostler): what about deleting this file at some point?
              cb(null, fs.readFileSync(localFile, 'utf8'));
              fs.unlinkSync(localFile);
            }
          });
        }
      });
    }
  });
};

module.exports = GetLiveFile;
