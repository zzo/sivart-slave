var fs = require('fs');

function CreateScript(args) {
  this.repoName = args.repoName;
  this.cloneURL = args.cloneURL;
  this.yamlURL = args.yamlURL;
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
  existingLines.push('echo "------ START ' + section + ' ----------------"');
  if (newLines) {
    newLines.forEach(function(command) {
      existingLines.push('echo "--COMMAND START: ' + command + '"');
      existingLines.push(command);
      existingLines.push('echo "--COMMAND END: ' + command + '"');
    });
//    existingLines = existingLines.concat(newLines);
  }
  existingLines.push('echo "------ END ' + section + ' ----------------"');
  return existingLines;
};

CreateScript.prototype.addGlobals = function(lines, yml) {
  // NVM
  lines = this.addLines('NVM', [
    'curl https://raw.githubusercontent.com/creationix/nvm/v0.25.0/install.sh | sh',
    'source ~/.nvm/nvm.sh',
    'nvm install ' + yml.node_js[0], // TODO(trostler): handle multiple versions
    'node -v'
    ], lines);

  // Global env variables
  if (yml.env && yml.env.global) {
    var globals = yml.env.global.map(function(glob) { return 'export ' + glob });
    console.log("GLOBALS:");
    console.log(globals);
    console.log(yml.env.global);
    lines = this.addLines('Globals', globals, lines);
  }

  // Other stuff
  lines = this.addLines('Before Install', yml.before_install, lines);
  lines = this.addLines('Install', yml.install, lines);
  lines = this.addLines('After Install', yml.after_install, lines);

  lines = this.addLines('Before Script', yml.before_script, lines);
  lines = this.addLines('Script', yml.script, lines);
  lines = this.addLines('After Script', yml.after_script, lines);
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
        var lines = me.addLines('Matrix', [matrix], []);
        scripts[i++] = me.addGlobals(lines, yml);
      });
    } else {
      scripts[0] = me.addGlobals([], yml);
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
        script.unshift("git clone " + me.cloneURL, "cd " + me.repoName);
        var template = fs.readFileSync('startup.sh.template', 'utf8');
        template = template.replace('USER_SCRIPT', script.join("\n"));
        done.push(template);
      });
      cb(null, done);
    }
  });
};

module.exports = CreateScript;
