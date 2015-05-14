'use strict';
var GH = require('../GetBuildFromGitHubEvent');

describe('GetBuildFromGitHubEvent', function() {
  it('creates a legit Build object from a push', function() {
    var githubEventName = 'push';
    var githubEventData = {
      ref: 'refs/something/master',
      after: '23084320943290',
      repository: {
        full_name: 'mark/trostler',
        clone_url: 'https://foobie.doobie/weoiewoi/ewoiwe.git'
      }
    };
    var build = new GH(githubEventName, githubEventData);

    expect(build.eventName).toBe('push');
    expect(build.branch).toBe('master');
    expect(build.commit).toBe(githubEventData.after);
    expect(build.cloneURL).toBe(githubEventData.repository.clone_url);
    expect(build.yamlURL).toBe('https://raw.githubusercontent.com/mark/trostler/master/.travis.yml');
 });

  it('creates a legit Build object from a PR', function() {
    var githubEventName = 'pull_request';
    var githubEventData = {
      pr: 666,
      action: 'opened',
      repository: {
        full_name: 'mark/trostler',
        clone_url: 'https://foobie.doobie/weoiewoi/ewoiwe.git'
      }
    };
    var build = new GH(githubEventName, githubEventData);

    expect(build.eventName).toBe('pull_request');
    expect(build.branch).toBe('master');
    expect(build.pr).toBe(githubEventData.after);
    expect(build.cloneURL).toBe(githubEventData.repository.clone_url);
    expect(build.yamlURL).toBe('https://raw.githubusercontent.com/mark/trostler/master/.travis.yml');
 });

});
