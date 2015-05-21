var Build = require('../RedoBuild');
var printf = require('util').format;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;

describe("Build redo", function() {
  it('redos a single run',  function(done) {
    Build.RedoOneRun('zzo/angular', buildId, buildNumber, function(err) {
      expect(err).toBeNull();
      done();
    });
  });

