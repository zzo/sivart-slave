'use strict';

var fs = require('fs');
var path = require('path');
var Filestore = require('sivart-data/Filestore');

// Get info
var logDir = process.env.SIVART_BASE_LOG_DIR;
var repoName = process.env.TRAVIS_REPO_SLUG;
var branch = process.env.TRAVIS_BRANCH;
var buildId = process.env.SIVART_BUILD_ID;
var buildNumber = process.env.SIVART_BUILD_NUMBER;
var filestore = new Filestore(repoName);

// Save environment (for internal debugging)
fs.writeFileSync(path.join(logDir, 'environment.json'), JSON.stringify(process.env));

// Save all files in logDir...
var files = fs.readdirSync(logDir).map(function(file) {
  return path.join(logDir, file);
});

// ..and save these files too
files.push(
  '/tmp/user-script.sh',
  '/var/log/startupscript.log'
);

// scrub /tmp/user-script.log
var userLog = fs.readFileSync('/tmp/user-script.log', 'utf8');
// All sivart-generated lines begin with ctrl-A
var tokenRegex = new RegExp('^\u0001');

userLog = userLog.split('\n').filter(function(line) {
  return line.match(tokenRegex);
}).map(function(line) {
  return line.substring(1); // take the token off
}).join('\n');

fs.writeFileSync('/tmp/sivart/logs/user-script.log', userLog);

// Save files to here within bucket
//  branch name / build id / build number
var basepath = path.join('branch-' + branch, String(buildId), String(buildNumber));
filestore.persistFiles(basepath, files, function(failures) {
  if (failures) {
    // write out errors to default error bucket
    var errorFilestore = new Filestore('error');
    fs.writeFileSync('/tmp/save.error.json', JSON.stringify({ data:
      {
        logDir: logDir,
        repoName: repoName,
        branch: branch,
        buildId: buildId,
        buildNumber: buildNumber,
        failures: failures
      }
    }, null, ' '));
    var errfile = new Date().getTime().toString() + '.json';
    errorFilestore.persistFile('/tmp/save.error.json', errfile, function() {
      throw new Error(JSON.stringify(failures));
    });
  }
});
