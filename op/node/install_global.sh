#!/bin/bash

# install/update nvm
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash

# re-open terminal to start using nvm or run the following to use it now
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# list installed node versions
nvm ls

# install node
nvm install 10.15.0
nvm alias default 10.15.0
nvm use default

# update node
#nvm install 10.15.0 --reinstall-packages-from=8.11.0
#nvm alias default 10.15.0
#nvm uninstall 8.11.0

# install npm
npm install -g npm@6.4.1

# install other global packages
npm install -g gulp@4.0.2

# verify versions
nvm --version # expect: 0.33.8
node -v       # expect: v10.15.0
npm -v        # expect: 6.4.1
gulp -v       # expect: Local version: 4.0.2
