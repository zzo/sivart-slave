var Build = require('../Build');
var printf = require('util').format;

var args = {
  repoName: 'test/repo',
  eventName: 'push',
  branch: 'master',
  cloneURL: 'https://github.com/zzo/angular.git',
  yamlURL: 'https://raw.githubusercontent.com/zzo/angular/master/.travis.yml',
  commit: 'f7668b3600e1f778691295aeef50eea8f9a97c10'
};

jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;

describe("Build", function() {
  describe("instantiate", function() {
    var build;

    beforeEach(function() {
      build = new Build(args, { some: 'meta', data: 'weoiweioewi', zot: { ewioewio: 'ewioew' }});
    });

    it("can be created", function() {
      for (var key in args) {
        expect(build[key]).toEqual(args[key]);
      }
    });

    it("does builds", function(done) {
      build.doBuilds(function(err, rez) {
        expect(err).toBeNull();
        expect(rez.length).toBe(3);
        done();
      });
    });
  });
});
