'use strict';

var GLF = require('../GetLiveFile');
var fs = require('fs');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

describe('GetLiveFile', function() {
  it('gets a local file', function(done) {
    var glf = new GLF('zzo/angular', 226, 1, '/tmp/user-script.log');
    glf.fetch(function(err, contents, file) {
      expect(err).toBeNull();
      expect(contents).toBe(fs.readFileSync(file, 'utf8'));
      console.log(file);
      done();
    });
  });
});
