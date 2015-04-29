gcloud = require('gcloud');

var logDir = process.args[2];

console.log(process.env);
// Save all of the logs in logDir into a bucket
// we've got time/node_js version/matrix variables/name
