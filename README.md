# Installation (Mac)
## Preparation
* open terminal
* change working directory to project root
* make shell scripts executable
```
find op -type f -name "*.sh" -exec chmod u+x {} \;
```

## Node.js
* install nvm, node & npm
```
op/node/install_global.sh
```

## Dependent Packages
```
npm install
```

# Development
## Auto Typescript Compilation on File Change
```
npm run watch
```

## Manual Build
```
npm run build
```
