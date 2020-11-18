# Last-Write-Wins Element Dictionary
This is a LWW key-value store, a conflict-free replicated data type (CRDT) implemented in Typescript/Javascript, with below main operations:
* Add element `lwwElementDict.add(key, value)`
* Remove element `lwwElementDict.remove(key)`
* Update element key `lwwElementDict.updateKey(key, newKey)`, by removing element with old key & adding element with new key
* Merge state from another dictionary `lwwElementDict.merge(anotherDict)`
* Reset dictionary `lwwElementDict.reset()`, by emptying internal add set & remove set

Read-only operations:
* Get element `lwwElementDict.get(key)`
* Check element existence `lwwElementDict.has(key)`
* List element keys `lwwElementDict.keys()`

Other side features include:
* State-based or operation-base replication
* Abstraction of clock (e.g. unix timestamp clock or vector clock)
* Abstraction of data store (e.g. in memory via Map or object literal, cookie, local storage, database, etc.)
* Biased towards adds or removals when timestamps are equal

## Sample Usage
Refer to "src/demo.ts"

## Demo in Typescript
```
npm run ts:demo
```

## Demo in Javascript
```
npm run build
npm run js:demo
```

## Demo Log
Refer to "log/demo.txt"

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
