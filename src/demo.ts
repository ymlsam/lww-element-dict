'use strict';
// work around problem in which node.js does not include project root in search paths by default
require('app-module-path').addPath(__dirname);

import { SystemClock    } from 'clock/system';
import { MapStore       } from 'store/map';
import { LwwElementDict } from 'lww';


/*** helper function ***/
function log(msg: any): void {
	console.log(msg);
}

function logDict(dict: LwwElementDict<any>): void {
	const keys = dict.keys();
	
	for (const key of keys) {
		console.log(key + ': ' + dict.get(key));
	}
	
	if (keys.length <= 0) {
		console.log('(empty)');
	}
	
	console.log();
}

function sleep(ms: number = 10): Promise<void> {
	return new Promise((resolve: () => void) => setTimeout(resolve, ms));
}

async function demo(): Promise<void> {
	const dict = new LwwElementDict(new SystemClock(0), MapStore);
	
	log('[dict 1] add foo & bar');
	dict.add('foo', 'abc');
	dict.add('bar', 123);
	logDict(dict);
	
	log('[dict 1] remove foo');
	dict.remove('foo');
	logDict(dict);
	
	// sleep for a while so that remove bias does not kick in while re-adding
	await sleep();
	
	log('[dict 1] re-add foo');
	dict.add('foo', 'abc');
	logDict(dict);
	
	log('[dict 1] rename bar');
	dict.updateKey('bar', 'new_bar');
	logDict(dict);
	
	// sleep for a while so that "foo" in 2nd dictionary will get a larger timestamp
	await sleep();
	
	log('[dict 2] initialize another dictionary');
	const newDict = new LwwElementDict(new SystemClock(1), MapStore);
	newDict.add('foo', 'def');
	logDict(newDict);
	
	log('[dict 2] merge state from dict 1 (foo from dict 2 is maintained due to its larger timestamp)');
	newDict.merge(dict);
	logDict(newDict);
	
	// sleep for a while
	await sleep();
	
	log('[dict 1] remove foo');
	dict.remove('foo');
	logDict(dict);
	
	log('[dict 2] merge state from dict 1 (removal of foo get merged into dict 2)');
	newDict.merge(dict);
	logDict(newDict);
	
	log('[dict 2] reset dictionary');
	newDict.reset();
	logDict(newDict);
}


/*** proceed ***/
demo();
