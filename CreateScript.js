var fs = require('fs');
var path = require('path');
var template = fs.readFileSync(path.join(__dirname, 'user-script.sh.template'), 'utf8');
var printf = require('util').format;

function getTemplateLines() {
  return template.split("\n");
}

function CreateScript(args) {
  this.repoName = args.repoName;
  this.cloneURL = args.cloneURL;
  this.yamlURL = args.yamlURL;
  this.commit = args.commit;
  this.branch = args.branch;
}

CreateScript.prototype.getYML = function(cb) {
  var http = require('https');
  var yaml = require('js-yaml');
  var request = http.get(this.yamlURL,
    function(response) {
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
  );
};

CreateScript.prototype.addLines = function(section, newLines, existingLines) {
  existingLines.push(printf('echo "------ START %s ----------------"', section));
  if (newLines) {
    newLines.forEach(function(command) {
      // This is fun!  We need _3_ backslashes to make it thru to /tmp/user-script so
      //  there are 12 here - will end up as 6 in the global startup script and finally
      //  3 in the final user-script.
      //  THIS IS ONLY FOR EXPORTING env vars to a file ($TSDRC -> .tsdrc)
      if (section == 'Globals' && command.match('TSDRC')) {
        command = command.replace(/"/g, '\\\\\\\\\\\\"');
      }
      existingLines.push(printf("runCommand '%s'", command));
    });
  }
  existingLines.push(printf('echo "------ END %s ----------------"', section));
  return existingLines;
};

CreateScript.prototype.addGlobals = function(lines, yml) {

  // Git clone
  lines = this.addLines('GIT', [
    // TODO(trostler) fix this up if testing a PR
    printf('git clone --depth=50 --branch=%s %s', this.branch, this.cloneURL),
    printf('cd %s', this.repoName),
    printf('git checkout -qf %s', this.commit)
  ], lines);

  // NVM
  lines = this.addLines('NVM', [
    'curl https://raw.githubusercontent.com/creationix/nvm/v0.25.0/install.sh | sh',
    'source ~/.nvm/nvm.sh',
    printf('nvm install %s', yml.node_js[0]), // TODO(trostler): handle multiple versions
    'node -v'
    ], lines);

  // Global env variables
  if (yml.env && yml.env.global) {
    var globals = yml.env.global.map(function(glob) { return printf('export %s', glob) });
    lines = this.addLines('Globals', globals, lines);
  }

  // Other stuff
  lines = this.addLines('Before Install', yml.before_install, lines);
  lines = this.addLines('Install', yml.install, lines);
  lines = this.addLines('After Install', yml.after_install, lines);

  lines = this.addLines('Before Script', yml.before_script, lines);
  lines = this.addLines('Script', yml.script, lines);
  lines = this.addLines('After Script', yml.after_script, lines);

  lines = this.addLines('Git Request', [printf("export GIT_REQUEST='%s'", JSON.stringify(this.metadata))], lines);
  lines = this.addLines('Save Logs', ['saveLogs'], lines);
  return lines;
}

CreateScript.prototype.createScripts = function(cb) {
  var scripts= [];
  var me = this;
  this.getYML(function(err, yml) {
    if (err) {
      cb(err);
    } else if (yml.env.matrix) {
      var i = 0;
      yml.env.matrix.forEach(function(matrix) {
        // start with a new templateLines each time
        var lines = me.addLines('Matrix', [matrix], getTemplateLines());
        scripts[i++] = me.addGlobals(lines, yml);
      });
    } else {
      scripts[0] = me.addGlobals(getTemplateLines(), yml);
    }
    cb(null, scripts);
  });
};

CreateScript.prototype.getScripts = function(cb) {
  var me = this;
  this.createScripts(function(err, scripts) {
    if (err) {
      cb(err);
    } else {
      var done = [];
      scripts.forEach(function(script) {
        var template = fs.readFileSync(path.join(__dirname, 'startup.sh.template'), 'utf8');
        template = template.replace('USER_SCRIPT', script.join("\n"));
        done.push(template);
      });
      cb(null, done);
    }
  });
};

module.exports = CreateScript;
