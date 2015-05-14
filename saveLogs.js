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
  '/tmp/user-script.log',
  '/var/log/startupscript.log'
);

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
    errorFilestore.persistFile('/tmp/save.error.json', new Date().getTime + '.json', function() {
      process.exit(1);
    });
  }
});
