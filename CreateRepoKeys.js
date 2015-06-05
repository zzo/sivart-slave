'use strict';

var Filestore = require('sivart-data/Filestore');
var fs = require('fs');
var path = require('path');
var ursa = require('ursa');

module.exports = function(repoName, cb) {
  var filestore = new Filestore(repoName);

  var fPath = path.join('/tmp', repoName.replace('/', ''));
  if (!fs.existsSync(fPath)) {
    fs.mkdirSync(fPath);
  }
  var publicKeyFile = path.join(fPath, 'public.key');
  var privateKeyFile = path.join(fPath, 'private.key');

  // Generate a new pub/priv key pair
  var keys = ursa.generatePrivateKey();

  // public key
  var pubKey = keys.toPublicPem();
  fs.writeFileSync(publicKeyFile, pubKey, 'utf8');

  // private key
  var privPem = keys.toPrivatePem();
  var priv = ursa.createPrivateKey(privPem, '');
  var privateKey = priv.toPrivatePem().toString();
  fs.writeFileSync(privateKeyFile, privateKey);

  // Store keys
  filestore.saveRepoFile(publicKeyFile, function(err) {
    if (err) {
      cb(err);
    } else {
      // TODO(trostler): make sure the private key is not publically available!
      filestore.saveRepoFile(privateKeyFile, function(perr) {
        if (perr) {
          cb(perr);
        } else {
          cb(null);
        }
      });
    }
  });
};
