#! /bin/bash
apt-get update
curl -sL https://deb.nodesource.com/setup | sudo bash -
apt-get install -y git nodejs libwww-perl xvfb build-essential
git clone https://github.com/zzo/sivart-slave
cd sivart-slave
npm install
nodejs index.js
