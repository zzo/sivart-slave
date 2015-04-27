var Ins = require('sivart-GCE/Instance');
var projectId = 'focal-inquiry-92622';
var fs = require('fs');
var slave_num = process.argv[2] || 1;
var instanceName = 'slave-' + slave_num;

var sivart_slave = new Ins(projectId, 'us-central1-a', instanceName);
var data = JSON.parse(fs.readFileSync('slave.json'));
data.name = instanceName;
data.disks[0].deviceName = instanceName;

sivart_slave.create({ instance: data }, function(err, resp) {
  console.log(err, resp);
  sivart_slave.tail_gce_console(function(err, data) {
    console.log(data);
    if (data.toString().match('__ALIVE__')) {
      return true;
    }
  });
});

