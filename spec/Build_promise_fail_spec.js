var Build = require('../Build');
var printf = require('util').format;
var Util = require('sivart-data/Util');
var Q = require('q');

var args = {
  repoName: 'test/repo',
  eventName: 'push',
  branch: 'master',
  cloneURL: 'https://github.com/zzo/angular.git',
  yamlURL: 'https://raw.githubusercontent.com/zzo/angular/master/.travis.yml',
  commit: 'f7668b3600e1f778691295aeef50eea8f9a97c10'
};

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000;

describe("Build", function() {
  describe("instantiate", function() {
    it("fails builds", function(done) {
      var builds = [];

      for (var i = 0; i < 10; i++) {
        (function(j) {
          builds.push(new Build(args, { some: 'meta-' + j, data: 'weoiweioewi', zot: { ewioewio: 'iyjghbxetsdrf' }}));
        }(i))
      }

      var promises = builds.map(function(build) {
        return build.doBuildsPromise();
      });

      Q.allSettled(promises).then(function(results) {
        var fulfilled = results.filter(function(result) {
          return result.state === 'fulfilled';
        });
        expect(fulfilled.length).toBe(promises.length);
        console.log(results);
        done();
      });
    });
  });
});
