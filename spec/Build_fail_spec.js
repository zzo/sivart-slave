var Build = require('../Build');
var printf = require('util').format;
var Q = require('q');
var Util = require('sivart-data/Util');

var args = {
  repoName: 'test/repo',
  eventName: 'push',
  branch: 'master',
  cloneURL: 'https://github.com/zzo/angular.git',
  yamlURL: 'https://raw.githubusercontent.com/zzo/angular/master/.travis.yml',
  commit: 'f7668b3600e1f778691295aeef50eea8f9a97c10'
};

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000;

describe("Build fail", function() {
  var build;

  beforeEach(function() {
    build = new Build(args, { some: 'meta', data: 'weoiweioewi', zot: { ewioewio: 'ewioew' }});
  });

  it("fails builds when over quota", function(done) {
    // 10 of theses aughtta do it - that 30 builds simultaneous-like
    // think I only have 24 IPs
    var promises = [];

    for (var i = 0; i < 10; i++) {
      promises.push(function() { return Q.ninvoke(build, 'doBuilds'); });
    }

    Util.dealWithAllPromises(promises, function(errors, successes) {
      console.log('--ERRORS--');
      console.log(errors);
      console.log('--SUCCESSES--');
      console.log(successes);
      done();
    });
  });
});
