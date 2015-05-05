'use strict';

var fs = require('fs');
var path = require('path');
var template = fs.readFileSync(path.join(__dirname, 'user-script.sh.template'), 'utf8');
var printf = require('util').format;

function getTemplateLines() {
  return template.split('\n');
}

function CreateScript(args) {
  this.repoName = args.repoName;
  this.cloneURL = args.cloneURL;
  this.yamlURL = args.yamlURL;
  this.commit = args.commit;
  this.branch = args.branch || 'master';
  this.metadata = args.metadata;
  this.createSnapshot = args.createSnapshot;
  this.eventName = args.eventName;

  // For Pull Requests
  this.pr = args.pr || '';
  this.action = args.action || '';

  this.keepVM = args.keepVM;
  this.timeout = args.timeout || 3600;  // how long to wait before timing out the user script
  this.nochangeTimeout = args.nochangeTimeout || 600;  // how long to wait before timing out after no output
}

CreateScript.prototype.getYML = function(cb) {
  var http = require('https');
  var yaml = require('js-yaml');
  http.get(this.yamlURL,
    function(response) {
      if (response.statusCode === 404) {
        // No .travis.yml file - use defaults
        cb(null, {
          script: [ 'npm test' ],
          node_js: [ '0.10' ]
        });
      } else {
        response.setEncoding('utf8');
        var data = '';
        response.on('data', function(chunk) {
          data += chunk;
        });
        response.on('end', function() {
          try {
            var yml = yaml.safeLoad(data);
            cb(null, yml);
          } catch (e) {
            cb(e);
          }
        });
      }
    }
  );
};

CreateScript.prototype.addLines = function(section, newLines, existingLines, state) {
  existingLines.push(printf('echo "------ START %s ----------------"', section));
  if (newLines) {
    newLines.forEach(function(command) {
      // This is fun!  We need _3_ backslashes to make it thru to /tmp/user-script so
      //  there are 12 here - will end up as 6 in the global startup script and finally
      //  3 in the final user-script.
      //  THIS IS ONLY FOR EXPORTING env vars to a file ($TSDRC -> .tsdrc)
      if (command.match(/TSDRC/)) {
        command = command.replace(/"/g, '\\\\\\\\\\\\"');
      }
      if (command.match(/SIVART_JSON/)) {
        command = command.replace(/"/g, '\\\\"');
        // get rid of first and last '\\'s
        command = command.replace(/\\\\/, '');
        command = command.replace(/\\\\"$/, '"');
      }
      state = state || 'ignore';
      existingLines.push(printf("runCommand '%s' '%s'", command, state));
    });
  }
  existingLines.push(printf('echo "------ END %s ----------------"', section));
  return existingLines;
};

CreateScript.prototype.addNodeJS = function(lines, nodejs) {
  // NVM (already installed in base image)
  lines = this.addLines('NVM', [
    'source ~/.nvm/nvm.sh',
    printf('export TRAVIS_NODE_VERSION=%s', nodejs),
    printf('nvm use %s', nodejs),
    'node -v > $SIVART_BASE_LOG_DIR/nodejs.version',
    'echo "Using NodeJS version `node -v`"'
    ], lines, 'error');
  return lines;
};

CreateScript.prototype.addGlobals = function(lines, yml, metadata, buildNumber) {
  lines.push('startTimestamp=`date +"%s"`');

  lines = this.addLines('Travis Emulation', [
    'export TRAVIS=true',
    'export CI=true',
    'export CONTINUOUS_INTEGRATION=true',
    'export DEBIAN_FRONTEND=noninteractive',
    'export LC_ALL=en_US.UTF-8',
    printf('export TRAVIS_BRANCH=%s', this.branch),
    printf('export TRAVIS_BUILD_DIR=`pwd`/%s', this.repoName),
    printf('export TRAVIS_REPO_SLUG=%s', this.repoName),
    printf('export TRAVIS_JOB_NUMBER=`hostname`.%s', buildNumber),
    'export TRAVIS_BUILD_NUMBER=`hostname`',
    'export TRAVIS_BUILD_ID=`hostname`',
    'export TRAVIS_JOB_ID=`hostname`',
    'export TRAVIS_OS_NAME=linux',
    'export TRAVIS_SECURE_ENV_VARS=false'
  ], lines);

  lines = this.addLines('Build metadata', [
    printf('export SIVART_JSON_GITHUB_REQUEST="%s"', JSON.stringify(this.metadata)),
    'echo ${SIVART_JSON_GITHUB_REQUEST} > $SIVART_BASE_LOG_DIR/github.request.json',
    printf('export SIVART_JSON_BUILD_CONFIG="%s"', JSON.stringify(yml)),
    'echo ${SIVART_JSON_BUILD_CONFIG} > $SIVART_BASE_LOG_DIR/build.config.json',
    printf('export SIVART_JSON_METADATA="%s"', JSON.stringify(metadata)),
    'echo ${SIVART_JSON_METADATA} > $SIVART_BASE_LOG_DIR/metadata.json'
  ], lines);

  if (this.eventName === 'push') {
    lines = this.addLines('GIT Push', [
      printf('git clone --depth=50 --branch=%s %s', this.branch, this.cloneURL, this.repoName),
      printf('cd %s', this.repoName),
      printf('git checkout -qf %s', this.commit),
      'export TRAVIS_PULL_REQUEST=false',
      printf('export TRAVIS_COMMIT=%s', this.commit),
      printf('export SIVART_REPO_BRANCH=%s', this.branch)
    ], lines, 'error');
  } else {
    lines = this.addLines('GIT Pull Request', [
      printf('git clone --depth=50 %s', this.cloneURL, this.repoName),
      printf('cd %s', this.repoName),
      printf('git fetch origin +refs/pull/%d/merge:', this.pr),
      'git checkout -qf FETCH_HEAD',
      printf('export TRAVIS_PULL_REQUEST=', this.pr),
      printf('export SIVART_PULL_REQUEST=', this.pr),
      'export SIVART_REPO_BRANCH=master'
    ], lines, 'error');
  }

  // Git clone
  lines = this.addLines('GIT', [
    printf('export SIVART_REPO_NAME=%s', this.repoName)
    ], lines, 'error');

  // Global env variables
  if (yml.env && yml.env.global) {
    var globals = yml.env.global.map(function(glob) {
      return printf('export %s', glob);
    });
    lines = this.addLines('Globals', globals, lines, 'error');
  }

  // Get Cache
  if (yml.cache && yml.cache.directories) {
    lines = this.addLines('Get Cached Directories', [ 'getCaches' ], lines, 'error');
  }

  // Other stuff
  if (yml.before_install) {
    lines = this.addLines('Before Install', yml.before_install, lines, 'error');
  }

  if (yml.install) {
    lines = this.addLines('Install', yml.install, lines, 'error');
  }

  if (yml.after_install) {
    lines = this.addLines('After Install', yml.after_install, lines, 'error');
  }

  if (yml.before_script) {
    lines = this.addLines('Before Script', yml.before_script, lines, 'error');
  }

  if (yml.script) {
    lines = this.addLines('Script', yml.script, lines, 'fail');
  }

  if (yml.after_script) {
    lines = this.addLines('After Script', yml.after_script, lines);
  }

  // Save Cache
  if (yml.cache && yml.cache.directories) {
    var cacheLines = [];
    yml.cache.directories.forEach(function(directory) {
      cacheLines.push(printf('saveCache %s', directory));
    });
    lines = this.addLines('Store Directories in Cache', cacheLines, lines);
  }

  lines = this.addLines('Finished', [
    'endTimestamp=`date +"%s"`',
    'totalTime=$((endTimestamp - startTimestamp))',
    'echo Total time is $totalTime seconds'
  ], lines);

  lines = this.addLines('Save Logs', ['saveLogs'], lines);

  if (!this.keepVM) {
    lines = this.addLines('Delete VM', ['deleteInstance'], lines);
  }
  return lines;
};

CreateScript.prototype.createScripts = function(cb) {
  var scripts = [];
  var me = this;
  var buildNumber = 0;
  this.getYML(function(err, yml) {
    if (err) {
      cb(err);
    } else if (yml.env && yml.env.matrix) {
      yml.node_js.forEach(function(nodeJS) {
        yml.env.matrix.forEach(function(matrix) {
          // start with a new templateLines each time
          var lines = me.addLines('Matrix', [
            'export ' + matrix,
            printf('echo %s > $SIVART_BASE_LOG_DIR/matrix', matrix)
            ], getTemplateLines());
          lines = me.addNodeJS(lines, nodeJS);
          var metadata = me.getMetadata(nodeJS, matrix);
          scripts[buildNumber++] = {
            script: me.addGlobals(lines, yml, metadata, buildNumber + 1),
            metadata: metadata
          };
        });
      });
    } else {
      yml.node_js.forEach(function(nodeJS) {
        var lines = me.addNodeJS(getTemplateLines(), nodeJS);
        var metadata = me.getMetadata(nodeJS);
        scripts[buildNumber++] = {
          script: me.addGlobals(lines, yml, metadata, buildNumber + 1),
          metatdata: metadata
        };
      });
    }
    cb(null, scripts);
  });
};

CreateScript.prototype.getMetadata = function(nodeJS, matrix) {
  return {
    name: this.repoName,
    commit: this.commit,
    branch: this.branch,
    pr: this.pr,
    action: this.action,
    nodeVersion: nodeJS,
    matrix: matrix
  };
};

CreateScript.prototype.getScripts = function(cb) {
  var me = this;
  this.createScripts(function(err, scripts) {
    if (err) {
      cb(err);
    } else {
      var done = [];
      scripts.forEach(function(script) {
        var startTemplate = fs.readFileSync(path.join(__dirname, 'startup.sh.template'), 'utf8');
        var startupScript = startTemplate.replace('SIVART_USER_SCRIPT', script.script.join('\n'));
        startupScript = startupScript.replace(/SIVART_TIMEOUT/g, me.timeout);
        startupScript = startupScript.replace(/SIVART_KILL_AFTER_NO_CHANGE/g, me.nochangeTimeout);
        if (me.keepVM) {
          startupScript = startupScript.replace(/SIVART_KEEP_VM/g, '1');
        } else {
          startupScript = startupScript.replace(/SIVART_KEEP_VM/g, '0');
        }
        done.push({script: startupScript, metadata: script.metadata});
      });
      cb(null, done);
    }
  });
};

module.exports = CreateScript;
