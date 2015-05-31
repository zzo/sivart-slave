'use strict';

var Datastore = require('sivart-data/Datastore');
var Filestore = require('sivart-data/Filestore');
var client = require('scp2');
var path = require('path');
var fs = require('fs');

function GetLiveFile(repoName, buildId, buildNumber, filename) {
  this.datastore = new Datastore(repoName);
  this.filestore = new Filestore(repoName);
  this.filename = filename;
  this.buildId = buildId;
  this.buildNumber = buildNumber;
}

// Get private key and scp file over
GetLiveFile.prototype.fetch = function(cb) {
  var me = this;
  this.filestore.getPrivateKey(this.buildId, this.buildNumber, function(err, key) {
    if (err) {
      cb(err);
    } else {
      me.datastore.getRun(me.buildId, me.buildNumber, function(grerr, run) {
        if (grerr) {
          cb(grerr);
        } else {
          // ok we have the ip address & private key - grab the file...
          // first cook up a dummy filename
          var localFile = path.join('/tmp', String(new Date().getTime()));
          client.scp({
            host: run.ip,
            username: 'sivart',
            path: me.filename,
            privateKey: key.toString()
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
