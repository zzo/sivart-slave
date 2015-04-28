console.log('__ALIVE__');

var yaml = require('js-yaml');
var fs = require('fs');
var path = require('path');
var cp = require( 'child_process' );

var repoName = 'angular2';
var localPath = path.join(__dirname, "tmp", repoName);

function deleteCurrentRepo(pathToRepo, cb) {
  cp.exec( '/bin/rm -fr ' + pathToRepo, function ( err, stdout, stderr ){
    cb();
  });
}

function cloneRepo(repo, localPath, cb) {
  var clone = require('nodegit').Clone;
  var options = {
    remoteCallbacks : {
      certificateCheck: function() { return 1; }
    }
  };

  clone(repo, localPath, options).then(function(repo) {
    cb(null, repo);
  });
}

function getYML(localPath, cb) {
  try {
    var yml = yaml.safeLoad(fs.readFileSync(path.join(localPath, '.travis.yml'), 'utf8'));
    cb(null, yml);
  } catch (e) {
    cb(e);
  }
}

deleteCurrentRepo(localPath, function() {
  cloneRepo("https://github.com/zzo/angular", localPath, function(err, repo) {
    getYML(localPath, function(err, yml) {
      doYML(yml, function() {
        process.exit();
      });
    });
  });
});

function addCmd(cmd, arr) {
  if (arr) {
    arr.forEach(function(c) {
      cmd += c + ' && ';
    });
  }
  return cmd;
}

function doYML(obj, cb) {
  var env = { PATH: process.env.PATH, HOME: localPath };
  var cmd = '';

  if (obj.env && obj.env.global) {
    obj.env.global.forEach(function(en) {
      var arr = en.split('=');
      var key = arr.shift();
      var value = arr.join('=');
      env[key] = value;
    });
  }

  cmd = addCmd(cmd, obj.before_install);
  cmd = addCmd(cmd, obj.install);
  cmd = addCmd(cmd, obj.before_script);
  cmd = addCmd(cmd, obj.script);
  cmd = addCmd(cmd, obj.after_script);
  cmd += 'exit 0';

  console.log(env);
  console.log(cmd);

/*
  // set uid & gid!
  var run = cp.spawn(cmd, [], { env: env, cwd: localPath });
  run.stdout.on('data', function (data) {
    console.log('STDOUT: ' + data);
  });
  run.stderr.on('data', function (data) {
    console.log('STDERR: ' + data);
  });
  run.on('close', function (code) {
    if (code !== 0) {
      console.log('run process exited with code ' + code);
    }
    cb();
  });
  */

  var child = cp.exec(cmd, { env: env, cwd: localPath }, function(error, stdout, stderr) {
    console.log('ERROR: ' + error);
    console.log('STDOUT: ' + stdout);
    console.log('STDERR: ' + stderr);
    cb();
  });
  child.stdout.on('data', function(d) {
    console.log('STDOUT: ' + d);
  });
  child.stderr.on('data', function(d) {
    console.log('STDERR: ' + d);
  });

  console.log(child);
}
