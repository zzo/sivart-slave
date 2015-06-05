'use strict';

var ursa = require('ursa');
var Filestore = require('sivart-data/Filestore');

module.exports = {
  encrypt: function(repoName, encryptMe, cb) {
    var filestore = new Filestore(repoName);
    filestore.get('public.key', function(err, publicKey) {
      if (err) {
        cb(err);
      } else {
        var crt = ursa.createPublicKey(publicKey.toString());
        var encrypted = crt.encrypt(encryptMe, 'utf8', 'base64');
        cb(null, encrypted);
      }
    });
  },
  decrypt: function(repoName, decryptMe, cb) {
    var filestore = new Filestore(repoName);
    filestore.get('private.key', function(perr, privateKey) {
      if (perr) {
        cb(perr);
      } else {
        var pkey = ursa.createPrivateKey(privateKey.toString());
        var pmsg = pkey.decrypt(decryptMe, 'base64', 'utf8');
        cb(null, pmsg);
      }
    });
  }
};
