import { Clock, ClockCtor, ClockLiteral                                  } from 'clock';
import { LwwItem, LwwValueItem                                           } from 'lww/item';
import { LwwBias, LwwElementDict, LwwElementDictLiteral, LwwElementValue } from 'lww';
import { MapStore                                                        } from 'store/map';
import { StoreCtor                                                       } from 'store';
import { DataUtil                                                        } from 'util/data';

import { TestOp      } from './test-op.type';
import { TestOuput   } from './test-output.type';
import { TestProcess } from './test-process.interface';
import { TestRepl    } from './test-repl.enum';


/**
 * Simple manager to organizer test cases & simulate communication between processes
 */
export class TestManager<CL extends ClockLiteral> {
	private testCnt: number = 0;
	private passCnt: number = 0;
	
	public readonly clock  : Clock<CL>;
	public readonly setCtor: StoreCtor<any>;
	public readonly bias   : LwwBias;
	public readonly procs  : ReadonlyArray<TestProcess<CL>>;
	
	
	/*** init ***/
	public constructor(clockCtor: ClockCtor<CL>, bias: LwwBias, processCnt: number = 1, setCtor?: StoreCtor<any>) {
		this.clock   = new clockCtor(-1, true, 0)
		this.setCtor = setCtor || MapStore; // MapStore is the only Store implementation at the moment
		this.bias    = bias;
		
		// initialize test processes
		const procs = <TestProcess<CL>[]> [];
		
		for (let id = 0; id < processCnt; id++) {
			const clock = new clockCtor(id, true, processCnt);
			
			procs.push({
				id   : id,
				clock: clock,
				dict : this.newDict(clock),
			});
		}
		
		this.procs   = procs;
	}
	
	
	/*** private ***/
	
	/**
	 * List of dictionaries
	 *
	 * @returns promise
	 */
	private get dicts(): LwwElementDict<CL>[] {
		return this.procs.map((proc: TestProcess<CL>) => proc.dict);
	}
	
	
	/*** private ***/
	
	/**
	 * Wait for test task, verify expected outputs, log test results
	 *
	 * @param msg      - test case description
	 * @param task     - promise of test task
	 * @param outElems - expected elements from each of the output processes
	 * @param outDicts - output dictionaries
	 *
	 * @returns promise
	 */
	private async expect(msg: string, task?: Promise<void>, outDicts: ReadonlyArray<LwwElementDict<CL>> = [], outElems: ReadonlyArray<TestOuput> = []): Promise<void> {
		const testIdx  = this.testCnt;
		const testMsg  = (testIdx + 1) + '. ' + msg;
		
		// clone output values
		for (const outElem of outElems) {
			outElem[2] = DataUtil.clone(outElem[2]);
		}
		
		await (task || this.sleep())
			.then(() => {
				// check expected output elements
				const xIds = <number[]> [];
				
				for (let i = 0; i < outDicts.length; i++) {
					const outDict = outDicts[i];
					
					for (const outElem of outElems) {
						const key           = outElem[0];
						const shouldExist   = outElem[1];
						const expectedValue = outElem[2];
						const item          = outDict.getItem(key);
						
						if ((shouldExist && (!item || !DataUtil.isEqual(item.value, expectedValue))) || (!shouldExist && !!item)) {
							xIds.push(i);
							
							this.log('expected value: ' + (shouldExist ? expectedValue      : '(n/a)'));
							this.log('actual value: '   + (item        ? item.value : '(n/a)'));
							
							break;
						}
					}
				}
				
				if (xIds.length > 0) throw new Error('unexpected value for dictionary ' + xIds.join(', '));
			})
			.then(() => {
				// ensure consistency between dictionary states
				if (outDicts.length <= 1) return;
				
				const xIds     = <number[]> [];
				const baseDict = outDicts[0];
				
				for (let i = 1; i < outDicts.length; i++) {
					const outDict = outDicts[i];
					
					if (!LwwElementDict.isDictEqual(baseDict, outDict)) {
						xIds.push(i);
						
						this.log('expected state (add set):');
						this.log(baseDict.addSet);
						
						this.log('expected state (remove set):');
						this.log(baseDict.removeSet);
						
						this.log('actual state (add set):');
						this.log(outDict.addSet);
						
						this.log('actual state (remove set):');
						this.log(outDict.removeSet);
					}
				}
				
				if (xIds.length > 0) throw new Error('inconsistent state for dictionary ' + xIds.join(', '));
			})
			.then(() => {
				// pass
				this.log('[pass] ' + testMsg);
				this.passCnt++;
			})
			.catch((error: Error) => {
				// fail
				this.log('[fail] ' + testMsg);
				this.log(error.message);
			})
			.then(() => {
				// finally
				this.testCnt++;
			})
	}
	
	/**
	 * Add operation literal
	 */
	private getAddOp(key: string, item: LwwValueItem<CL>): TestOp<CL> {
		return {
			name: 'add',
			key : key,
			item: item,
		};
	}
	
	/**
	 * Remove operation literal
	 */
	private getRemoveOp(key: string, item: LwwItem<CL>): TestOp<CL> {
		return {
			name: 'remove',
			key : key,
			item: item,
		};
	}
	
	/**
	 * Update key operation literal
	 */
	private getUpdateKeyOp(key: string, newKey: string, items: [LwwValueItem<CL>, LwwItem<CL>]): TestOp<CL> {
		return {
			name: 'update_key',
			key : [newKey, key],
			item: items,
		};
	}
	
	/**
	 * Log message
	 */
	private log(msg: any = ''): void {
		console.log(msg);
	}
	
	/**
	 * Log subtitle
	 */
	private logSubtitle(sect: string = ''): void {
		this.log('<' + sect + '>');
	}
	
	/**
	 * Log title
	 */
	private logTitle(title: string = ''): void {
		this.log('=== ' + title + ' ===');
	}
	
	/**
	 * Wrapper for dictionary merging
	 *
	 * @param aDict - dictionary one
	 * @param bDict - dictionary two
	 *
	 * @returns literal of merged dictionary
	 */
	private mergeDicts(aDict: LwwElementDictLiteral<CL>, bDict: LwwElementDictLiteral<CL>): LwwElementDict<CL> {
		const dictLiteral = LwwElementDict.mergeDicts(aDict, bDict, this.clock, this.setCtor);
		
		return this.newDict(undefined, dictLiteral);
	}
	
	/**
	 * Create a new dictionary
	 *
	 * @param clock       - abstract clock implementation
	 * @param dictLiteral - optional dictionary literal
	 *
	 * @returns new dictionary
	 */
	private newDict(clock?: Clock<CL>, dictLiteral?: LwwElementDictLiteral<CL>): LwwElementDict<CL> {
		const dict = new LwwElementDict<CL>(clock || this.clock, this.setCtor, this.bias)
		if (dictLiteral) dict.fromLiteral(dictLiteral);
		
		return dict;
	}
	
	/**
	 * Operation-based replication (receiving from source process).
	 *
	 * @param op        - operation literal
	 * @param fromClock - source clock literal (for vector clock synchronization)
	 * @param toProc    - destination process
	 *
	 * @returns promise
	 */
	private async opReceive(op: TestOp<CL>, fromClock: CL, toProc: TestProcess<CL>): Promise<void> {
		// simulate network delay
		await this.sleep();
		
		toProc.clock.tock(fromClock);
		
		// execute remote operation
		const toDict = toProc.dict;
		
		switch (op.name) {
			case 'add':
				toDict.addItem(op.key, op.item);
				break;
			case 'remove':
				toDict.removeItem(op.key, op.item);
				break;
			case 'update_key':
				toDict.addItem(op.key[0], op.item[0]);
				toDict.removeItem(op.key[1], op.item[1]);
				break;
		}
	}
	
	/**
	 * Operation-based replication (sending to other processes).
	 *
	 * @param op       - operation literal
	 * @param fromProc - source process
	 * @param toProcs  - destination processes (broadcasting to all other processes by default)
	 *
	 * @returns promise
	 */
	private async opSend(op: TestOp<CL>, fromProc: TestProcess<CL>, toProcs?: TestProcess<CL>[]): Promise<void> {
		// sleep
		await this.sleep();
		
		fromProc.clock.tick();
		toProcs = toProcs || this.procs.filter((proc: TestProcess<CL>) => (proc.id != fromProc.id));
		
		const fromClock = fromProc.clock.toLiteral();
		const promises  = <Promise<void>[]> [];
		
		// send operation
		for (const toProc of toProcs) {
			promises.push(this.opReceive(op, fromClock, toProc));
		}
		
		await Promise.all(promises);
	}
	
	/**
	 * Get process with specific id
	 * 
	 * @param id - process id
	 * 
	 * @returns test process
	 */
	private proc(id: number): TestProcess<CL> {
		const procs = this.procs;
		if (!(id in procs)) throw new Error('process id out of range');
		
		return procs[id];
	}
	
	/**
	 * Get a rejected promise
	 *
	 * @param msg - error message
	 * 
	 * @returns rejected promise
	 */
	private reject(msg: string): Promise<void> {
		return Promise.reject(new Error(msg));
	}
	
	/**
	 * Reset dictionaries in all processes
	 */
	private reset(): void {
		for (const proc of this.procs) {
			proc.dict.reset();
		}
	}
	
	/**
	 * Sleep
	 * 
	 * @param ms - time to sleep in milliseconds
	 *
	 * @returns promise
	 */
	private sleep(ms: number = 10): Promise<void> {
		return new Promise((resolve: () => void) => setTimeout(resolve, ms));
	}
	
	/**
	 * State-based replication (receiving from source process).
	 *
	 * @param fromDict  - source dictionary literal
	 * @param fromClock - source clock literal (for vector clock synchronization)
	 * @param toProc    - destination process
	 *
	 * @returns promise
	 */
	private async stateReceive(fromDict: LwwElementDictLiteral<CL>, fromClock: CL, toProc: TestProcess<CL>): Promise<void> {
		// simulate network delay
		await this.sleep();
		
		toProc.clock.tock(fromClock);
		
		// merge with dictionary literal from source process
		const toDict = toProc.dict;
		toDict.merge(fromDict);
	}
	
	/**
	 * State-based replication (sending to other processes).
	 *
	 * @param fromProc - source process
	 * @param toProcs  - destination processes (broadcasting to all other processes by default)
	 *
	 * @returns promise
	 */
	private async stateSend(fromProc: TestProcess<CL>, toProcs?: TestProcess<CL>[]): Promise<void> {
		// sleep
		await this.sleep();
		
		fromProc.clock.tick();
		toProcs = toProcs || this.procs.filter((proc: TestProcess<CL>) => (proc.id != fromProc.id));
		
		const fromDict  = fromProc.dict.toLiteral();
		const fromClock = fromProc.clock.toLiteral();
		const promises  = <Promise<void>[]> [];
		
		// send state
		for (const toProc of toProcs) {
			promises.push(this.stateReceive(fromDict, fromClock, toProc));
		}
		
		await Promise.all(promises);
	}
	
	
	/*** public ***/
	
	/**
	 * Log test configuration
	 */
	public logConfig(title: string, repl?: TestRepl): void {
		this.logTitle(title);
		
		this.logSubtitle('test-config');
		this.log('replication: ' + (repl ? (repl == TestRepl.STATE ? 'state-based' : 'operation-based') : 'n/a'));
		this.log('clock      : ' + this.clock.constructor.name);
		this.log('data store : ' + this.setCtor.name);
		this.log('bias       : ' + (this.bias == LwwBias.REMOVE ? 'remove' : 'add'));
		this.log('processes  : ' + this.procs.length);
		this.log();
		
		this.logSubtitle('test-cases');
	}
	
	/**
	 * Log test summary
	 */
	public logSummary(): void {
		const accuracy = Math.floor((this.passCnt / this.testCnt) * 100);
		
		this.log();
		this.logSubtitle('summary');
		this.log('passed tests: ' + this.passCnt + ' / ' + this.testCnt + ' (' + accuracy + '%)');
		this.log();
		this.log();
	}
	
	/**
	 * Test add operation
	 *
	 * @param msg   - test case description
	 * @param key   - element key
	 * @param value - element value
	 * @param repl  - replication mode
	 * 
	 * @returns promise
	 */
	public async testAdd(msg: string, key: string, value: LwwElementValue, repl?: TestRepl): Promise<void> {
		// local add operation
		const proc = this.proc(0);
		const dict = proc.dict;
		const item = dict.add(key, value);
		
		// replication
		let task: Promise<void>;
		switch (repl) {
			case TestRepl.STATE: task = this.stateSend(proc);                        break;
			case TestRepl.OP   : task = this.opSend(this.getAddOp(key, item), proc); break;
			default            : task = this.sleep();                                break;
		}
		
		// expected output
		const outputs = <TestOuput[]> [[key, true, value]];
		
		await this.expect(msg, task, this.dicts, outputs);
	}
	
	/**
	 * Test add/remove bias for situation where clock times from add set & remove set are equal
	 *
	 * @param msg         - test case description
	 * @param key         - element key
	 * @param value       - element value
	 * @param removeFirst - whether to remove element before adding
	 *
	 * @returns promise
	 */
	public async testBias(msg: string, key: string, value: LwwElementValue, removeFirst: boolean): Promise<void> {
		const proc = this.proc(0);
		const dict = proc.dict;
		
		// freeze clock
		proc.clock.freeze();
		
		// add & remove at same moment
		if (removeFirst) {
			dict.remove(key);
			dict.add(key, value);
		} else {
			dict.add(key, value);
			dict.remove(key);
		}
		
		// unfreeze clock
		proc.clock.unfreeze();
		
		// expected output
		const shouldExist = (this.bias == LwwBias.ADD); 
		const outputs     = <TestOuput[]> [[key, shouldExist, value]];
		
		await this.expect(msg, undefined, [dict], outputs);
	}
	
	/**
	 * Test if merge function is associative
	 *
	 * @param msg   - test case description
	 * @param key   - element key
	 * @param value - element value
	 *
	 * @returns promise
	 */
	public async testMergeAssociative(msg: string, key: string, value: LwwElementValue): Promise<void> {
		// local operations
		const proc0 = this.proc(0);
		const proc1 = this.proc(1);
		const proc2 = this.proc(2);
		const dict0 = proc0.dict;
		const dict1 = proc1.dict;
		const dict2 = proc2.dict;
		
		dict1.add(key, value);
		await this.sleep();
		
		dict2.remove(key);
		await this.sleep();
		
		// TODO: test associative merge with different complex states or combination of operations
		
		// merging
		const aDict = this.mergeDicts(this.mergeDicts(dict0, dict1), dict2); // merge dict0 & dict1 first
		const bDict = this.mergeDicts(dict0, this.mergeDicts(dict1, dict2)); // merge dict1 & dict2 first
		
		// expected output
		const outputs = <TestOuput[]> [[key, false, undefined]];
		
		await this.expect(msg, undefined, [aDict, bDict], outputs);
	}
	
	/**
	 * Test if merge function is commutative
	 *
	 * @param msg   - test case description
	 * @param key   - element key
	 * @param value - element value
	 *
	 * @returns promise
	 */
	public async testMergeCommutative(msg: string, key: string, value: LwwElementValue): Promise<void> {
		// local operations
		const proc0 = this.proc(0);
		const proc1 = this.proc(1);
		const dict0 = proc0.dict;
		const dict1 = proc1.dict;
		
		dict0.add(key, value);
		await this.sleep();
		
		dict1.remove(key);
		await this.sleep();
		
		// TODO: test commutative merge with different complex states or combination of operations
		
		// merging
		const aDict = this.mergeDicts(dict0, dict1); // merge two dictionaries
		const bDict = this.mergeDicts(dict1, dict0); // merge in reverse order
		
		// expected output
		const outputs = <TestOuput[]> [[key, false, undefined]];
		
		await this.expect(msg, undefined, [aDict, bDict], outputs);
	}
	
	/**
	 * Test if merge function is idempotent
	 *
	 * @param msg   - test case description
	 * @param key   - element key
	 * @param value - element value
	 *
	 * @returns promise
	 */
	public async testMergeIdempotent(msg: string, key: string, value: LwwElementValue): Promise<void> {
		// local operations
		const proc0 = this.proc(0);
		const proc1 = this.proc(1);
		const dict0 = proc0.dict;
		const dict1 = proc1.dict;
		
		dict0.add(key, value);
		await this.sleep();
		
		dict1.remove(key);
		await this.sleep();
		
		// TODO: test idempotent merge with different complex states or combination of operations
		
		// merging
		const aDict = this.mergeDicts(dict0, dict1); // merge two dictionaries
		const bDict = this.mergeDicts(aDict, dict0); // merge states from dict0 for a second time
		
		// expected output
		const outputs = <TestOuput[]> [[key, false, undefined]];
		
		await this.expect(msg, undefined, [aDict, bDict], outputs);
	}
	
	/**
	 * Test if operations are commutative
	 *
	 * @param msg   - test case description
	 * @param key   - element key
	 * @param value - element value
	 *
	 * @returns promise
	 */
	public async testOpCommutative(msg: string, key: string, value: LwwElementValue): Promise<void> {
		// local operations
		const proc0 = this.proc(0);
		const proc1 = this.proc(1);
		const dict0 = proc0.dict;
		const dict1 = proc1.dict;
		
		const addItem = dict0.add(key, value);
		await this.sleep();
		
		const removeItem = dict0.remove(key);
		await this.sleep();
		
		// apply operations in reverse orders for proc1
		const addOp    = this.getAddOp(key, addItem);
		const removeOp = this.getRemoveOp(key, removeItem);
		const tasks    = <Promise<void>[]> [];
		
		tasks.push(this.opSend(removeOp, proc0, [proc1]));
		await this.sleep();
		
		tasks.push(this.opSend(addOp, proc0, [proc1]));
		await this.sleep();
		
		const task = Promise.all(tasks).then(() => {}); // cast Promise<void[]> to Promise<void>
		
		// expected output
		const outputs = <TestOuput[]> [[key, false, undefined]];
		
		await this.expect(msg, task, [dict0, dict1], outputs);
	}
	
	/**
	 * Test if operations are idempotent
	 *
	 * @param msg   - test case description
	 * @param key   - element key
	 * @param value - element value
	 *
	 * @returns promise
	 */
	public async testOpIdempotent(msg: string, key: string, value: LwwElementValue): Promise<void> {
		// local operations
		const proc0 = this.proc(0);
		const proc1 = this.proc(1);
		const dict0 = proc0.dict;
		const dict1 = proc1.dict;
		
		const addItem = dict0.add(key, value);
		await this.sleep();
		
		const removeItem = dict0.remove(key);
		await this.sleep();
		
		// apply extra add operation for proc1
		const addOp    = this.getAddOp(key, addItem);
		const removeOp = this.getRemoveOp(key, removeItem);
		const tasks    = <Promise<void>[]> [];
		
		tasks.push(this.opSend(addOp, proc0, [proc1]));
		await this.sleep();
		
		tasks.push(this.opSend(removeOp, proc0, [proc1]));
		await this.sleep();
		
		tasks.push(this.opSend(addOp, proc0, [proc1]));
		await this.sleep();
		
		const task = Promise.all(tasks).then(() => {}); // cast Promise<void[]> to Promise<void>
		
		// expected output
		const outputs = <TestOuput[]> [[key, false, undefined]];
		
		await this.expect(msg, task, [dict0, dict1], outputs);
	}
	
	/**
	 * Test remove operation
	 *
	 * @param msg  - test case description
	 * @param key  - element key
	 * @param repl - replication mode
	 *
	 * @returns promise
	 */
	public async testRemove(msg: string, key: string, repl?: TestRepl): Promise<void> {
		// local remove operation
		const proc = this.proc(0);
		const dict = proc.dict;
		const item = dict.remove(key);
		
		// replication
		let task: Promise<void>;
		switch (repl) {
			case TestRepl.STATE: task = this.stateSend(proc);                           break;
			case TestRepl.OP   : task = this.opSend(this.getRemoveOp(key, item), proc); break;
			default            : task = this.sleep();                                   break;
		}
		
		// expected output
		const outputs = <TestOuput[]> [[key, false, undefined]];
		
		await this.expect(msg, task, this.dicts, outputs);
	}
	
	/**
	 * Test update key operation
	 *
	 * @param msg    - test case description
	 * @param key    - existing element key
	 * @param newKey - new element key
	 * @param repl   - replication mode
	 *
	 * @returns promise
	 */
	public async testUpdateKey(msg: string, key: string, newKey: string, repl?: TestRepl): Promise<void> {
		// local update key operation
		const proc  = this.proc(0);
		const dict  = proc.dict;
		const value = dict.get(key);
		const items = dict.updateKey(key, newKey);
		
		// failed to initiate key update without existing element
		if (!items) {
			const task = this.reject('element key not found');
			
			await this.expect(msg, task);
			return;
		}
		
		// replication
		let task: Promise<void>;
		switch (repl) {
			case TestRepl.STATE: task = this.stateSend(proc);                                       break;
			case TestRepl.OP   : task = this.opSend(this.getUpdateKeyOp(key, newKey, items), proc); break;
			default            : task = this.sleep();                                               break;
		}
		
		// expected output
		const outputs = <TestOuput[]> [[key, false, undefined], [newKey, true, value]];
		
		await this.expect(msg, task, this.dicts, outputs);
	}
}