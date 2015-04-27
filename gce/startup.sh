#! /bin/bash
apt-get update
apt-get install -y git npm libwww-perl xvfb
git clone https://github.com/zzo/sivart-slave
cd sivart-slave
npm install
nodejs index.js
