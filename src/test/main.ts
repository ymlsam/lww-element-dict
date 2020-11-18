'use strict';
// work around problem in which node.js does not include project root in search paths by default
require('app-module-path').addPath(__dirname + '/..');

import { SystemClock } from 'clock/system';
import { VectorClock } from 'clock/vector';
import { LwwBias     } from 'lww';

import { TestManager } from './test-manager.class';
import { TestRepl    } from './test-repl.enum';


/*** helper functions ***/
async function testBasic(m: TestManager<any>, repl: TestRepl): Promise<void> {
	m.logConfig('basic tests', repl);
	
	await m.testAdd('add undefined',        'a0', undefined,        repl);
	await m.testAdd('add null',             'a0', null,             repl);
	await m.testAdd('add false',            'a0', false,            repl);
	await m.testAdd('add true',             'a0', true,             repl);
	await m.testAdd('add zero',             'a0', 0,                repl);
	await m.testAdd('add non-zero number',  'a0', 123,              repl);
	await m.testAdd('add empty string',     'a0', '',               repl);
	await m.testAdd('add non-empty string', 'a0', 'str',            repl);
	await m.testAdd('add array',            'a0', ['a', 'b', 'c'],  repl);
	await m.testAdd('add object',           'a0', {'a': 1, 'b': 2}, repl);
	
	await m.testRemove('remove element', 'a0', repl);
	await m.testAdd('re-add removed element', 'a0', 're-added value', repl);
	await m.testUpdateKey('update element key', 'a0', 'a1', repl);
	
	m.logSummary();
}

async function testBias(m: TestManager<any>): Promise<void> {
	m.logConfig('bias tests');
	
	await m.testBias('add & remove element at the same time', 'b0', 123, false);
	await m.testBias('remove & add element at the same time', 'b1', 123, true);
	
	m.logSummary();
}

async function testMerge(m: TestManager<any>): Promise<void> {
	m.logConfig('merge tests');
	
	await m.testMergeCommutative('check if merge is commutative', 'm0', 123);
	await m.testMergeAssociative('check if merge is associative', 'm1', 123);
	await m.testMergeIdempotent('check if merge is idempotent', 'm2', 123);
	
	m.logSummary();
}

async function testOp(m: TestManager<any>): Promise<void> {
	m.logConfig('operation tests');
	
	await m.testOpCommutative('check if operations are commutative', 'o0', 123);
	await m.testOpIdempotent('check if operations are idempotent', 'o1', 123);
	
	m.logSummary();
}

async function exec(): Promise<void> {
	// basic tests (with state-based or op-based replication)
	await testBasic(new TestManager(SystemClock, LwwBias.REMOVE, 3), TestRepl.STATE);
	await testBasic(new TestManager(SystemClock, LwwBias.REMOVE, 3), TestRepl.OP   );
	
	// bias tests
	await testBias(new TestManager(SystemClock, LwwBias.REMOVE));
	await testBias(new TestManager(SystemClock, LwwBias.ADD   ));
	
	// merge tests (commutative, associative, idempotent)
	await testMerge(new TestManager(SystemClock, LwwBias.REMOVE, 3));
	
	// operation tests (commutative, idempotent)
	await testOp(new TestManager(SystemClock, LwwBias.REMOVE, 3));
	
	// vector clock (testing with vector clock is not thorough, for demo purpose only)
	await testBasic(new TestManager(VectorClock, LwwBias.REMOVE, 3), TestRepl.STATE);
}


/*** proceed with tests ***/
exec()
	.catch((error: Error) => {
		console.log('unhandled exception: ' + error.message);
	});
