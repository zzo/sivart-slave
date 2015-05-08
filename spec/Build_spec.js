var Build = require('../Build');

var args = {
  repoName: 'this/is/a/repo',
  eventName: 'push',
  branch: 'master',
  cloneURL: 'http://clone.me/this/is/a/repo'
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
        if (err) {
          console.log('err from do builds');
          console.log(err);
        } else {
          console.log('rez');
          console.log(rez);
        }
        done();
      });
    });

  });
});
