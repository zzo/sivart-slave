#! /bin/bash

###
# Chrome
###
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list
####

apt-get update

### or -beta or -unstable (chrome)
apt-get install -y git xvfb build-essential unzip google-chrome-stable libssl-dev default-jre nodejs npm lzop
ln -s /usr/bin/nodejs /usr/bin/node

###
# Start Xvfb ghetto-style
###
touch /etc/init.d/xvfb ## Fake out travis scripts

###
# DARTIUM fix: https://code.google.com/p/dart/issues/detail?id=12325
#   Dartium needs libudev.0
###
wget http://launchpadlibrarian.net/119461136/libudev0_175-0ubuntu13_amd64.deb
dpkg -i libudev0_175-0ubuntu13_amd64.deb
apt-get install -f

###
# Dummy user
###
adduser --disabled-password --disabled-login --gecos "" sivart

## So these can be saved off later by 'sivart' user
touch /tmp/user-script.log
chmod 777 /tmp/user-script.log
chmod 777 /var/log/startupscript.log

git clone https://github.com/zzo/sivart-slave.git /usr/local/sivart-slave
pushd /usr/local/sivart-slave
HOME=/tmp npm install
chown -R sivart:users /usr/local/sivart-slave
popd

su -l sivart -c "curl https://raw.githubusercontent.com/creationix/nvm/v0.25.0/install.sh | sh"
su -l sivart -c ". .nvm/nvm.sh && nvm install 0.8"
su -l sivart -c ". .nvm/nvm.sh && nvm install 0.10"
su -l sivart -c ". .nvm/nvm.sh && nvm install 0.12"
su -l sivart -c ". .nvm/nvm.sh && nvm install iojs"
su -l sivart -c ". .nvm/nvm.sh && nvm install stable"

echo __DONE__
