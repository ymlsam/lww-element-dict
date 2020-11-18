import { Clock, ClockLiteral } from 'clock';
import { Store, StoreCtor    } from 'store';

import { LwwItem               } from './item/lww-item.type';
import { LwwValueItem          } from './item/lww-value-item.type';
import { LwwBias               } from './lww-bias.enum';
import { LwwElementDictLiteral } from './lww-element-dict-literal.type';
import { LwwElementObjLiteral  } from './lww-element-obj-literal.type';
import { LwwElementValue       } from './lww-element-value.type';


export class LwwElementDict<CL extends ClockLiteral, V = LwwElementValue> implements LwwElementDictLiteral<CL, V> {
	private clock    : Clock<CL>;
	private bias     : LwwBias;
	private setCtor  : StoreCtor<any>;
	public  addSet   : Store<LwwValueItem<CL, V>>;
	public  removeSet: Store<LwwItem<CL>>;
	
	
	/*** init ***/
	
	/**
	 * Create a new Last-Write-Wins element dictionary
	 *
	 * @param clock   - abstract clock implementation
	 * @param setCtor - constructor of abstract key-value store implementation
	 * @param bias    - bias when times from add set & remove set are equal
	 *
	 * @returns whether item is inserted or not
	 */
	public constructor(clock: Clock<CL>, setCtor: StoreCtor<any>, bias: LwwBias = LwwBias.REMOVE) {
		this.clock     = clock;
		this.bias      = bias;
		this.setCtor   = setCtor;
		this.addSet    = new setCtor();
		this.removeSet = new setCtor();
	}
	
	
	/*** private static ***/
	
	/**
	 * Merge items from multiple sets into the first set.
	 * If times of two items are equal, item from a later set will override previous item.
	 *
	 * @param sets  - array of key-value stores
	 * @param clock - abstract clock implementation
	 */
	private static mergeSets<CL extends ClockLiteral, I extends LwwItem<CL>>(sets: Store<I>[], clock: Clock<CL>): void {
		if (sets.length <= 1) return;
		
		const baseSet = sets[0];
		
		for (let i = 1; i < sets.length; i++) {
			const set  = sets[i];
			const keys = set.keys();
			
			for (const key of keys) {
				const item = set.get(key);
				if (!item) continue;
				
				// older item will be skipped
				const baseItem = baseSet.get(key);
				if (baseItem && clock.compare(baseItem.clock, item.clock) > 0) continue;
				
				// merge item
				baseSet.set(key, item);
			}
		}
	}
	
	
	/*** public static ***/
	
	/**
	 * Determine if the states of two dictionaries are identical
	 *
	 * @param aDict - dictionary one
	 * @param bDict - dictionary two
	 *
	 * @returns whether the two dictionaries are identical
	 */
	public static isDictEqual<CL extends ClockLiteral, V>(aDict: LwwElementDictLiteral<CL, V>, bDict: LwwElementDictLiteral<CL, V>): boolean {
		return (aDict.addSet.isEqual(bDict.addSet) && aDict.removeSet.isEqual(bDict.removeSet));
	}
	
	/**
	 * Merge two dictionaries
	 * 
	 * @param aDict   - dictionary one
	 * @param bDict   - dictionary two
	 * @param clock   - abstract clock implementation
	 * @param setCtor - constructor of abstract key-value store implementation
	 * 
	 * @returns literal of merged dictionary
	 */
	public static mergeDicts<CL extends ClockLiteral, V>(aDict: LwwElementDictLiteral<CL, V>, bDict: LwwElementDictLiteral<CL, V>, clock: Clock<CL>, setCtor: StoreCtor<any>): LwwElementDictLiteral<CL, V> {
		// merge add sets
		const addSet  = <Store<LwwValueItem<CL, V>>> new setCtor();
		const addSets = [addSet, aDict.addSet, bDict.addSet];
		this.mergeSets(addSets, clock);
		
		// merge remove sets
		const removeSet  = <Store<LwwItem<CL>>> new setCtor();
		const removeSets = [removeSet, aDict.removeSet, bDict.removeSet];
		this.mergeSets(removeSets, clock);
		
		return {
			addSet   : addSet,
			removeSet: removeSet,
		};
	}
	
	
	/*** private ***/
	
	/**
	 * Insert element to a store.
	 *
	 * @param key   - element key
	 * @param item  - item to be stored
	 * @param store - key-value store
	 *
	 * @returns whether item is inserted or not
	 */
	private insertItem<I extends LwwItem<CL>>(key: string, item: I, store: Store<I>): boolean {
		const clock    = this.clock;
		const baseItem = store.get(key);
		
		// skip operation if existing item is after next item
		if (baseItem) {
			const baseClock = baseItem.clock;
			const nextClock = item.clock;
			
			if (clock.compare(baseClock, nextClock) > 0) {
				return false;
			}
		}
		
		// proceed to insert
		store.set(key, item);
		
		return true;
	}
	
	/**
	 * Get an item with time info.
	 *
	 * @returns item with time info
	 */
	private newItem(): LwwItem<CL> {
		const clock = this.clock;
		
		return {
			clock: clock.toLiteral(),
		};
	}
	
	/**
	 * Wrap value as item with time info.
	 *
	 * @param value - element value to wrap
	 * 
	 * @returns item with value & time info
	 */
	private newValueItem<V>(value: V): LwwValueItem<CL, V> {
		const clock = this.clock;
		
		return {
			clock: clock.toLiteral(),
			value: value,
		};
	}
	
	
	/*** public ***/
	
	/**
	 * Add element to dictionary with clock ticking.
	 *
	 * @param key   - element key
	 * @param value - element value
	 * 
	 * @returns added item with value & time info
	 */
	public add(key: string, value: V): LwwValueItem<CL, V> {
		// touch clock
		this.clock.tick();
		
		// add item
		const item = this.newValueItem(value);
		this.addItem(key, item);
		
		return item;
	}
	
	/**
	 * Add element to dictionary.
	 *
	 * @param key  - element key
	 * @param item - item with value & time info
	 * 
	 * @returns whether item is inserted into add set or not
	 */
	public addItem(key: string, item: LwwValueItem<CL, V>): boolean {
		// insert item into add set
		return this.insertItem(key, item, this.addSet);
	}
	
	/**
	 * Import dictionary add set & remove set from literal
	 *
	 * @param dict - dictionary literal
	 */
	public fromLiteral(dict: LwwElementDictLiteral<CL, V>): void {
		this.addSet    = dict.addSet;
		this.removeSet = dict.removeSet;
	}
	
	/**
	 * Import dictionary from object literal transported over network
	 *
	 * @param object - object literal
	 */
	public fromObject(object: LwwElementObjLiteral<CL, V>): void {
		// TODO: to be implemented
	}
	
	/**
	 * Get element from dictionary.
	 * If "undefined" is valid value in dictionary, use getItem() to tell whether element is not available or element value is "undefined"
	 *
	 * @param key - element key
	 *
	 * @returns element value, or undefined if it is not available
	 */
	public get(key: string): V | undefined {
		const item = this.getItem(key);
		if (!item) return undefined;
		
		return item.value;
	}
	
	/**
	 * Get raw item with element & time info from dictionary.
	 *
	 * @param key - element key
	 *
	 * @returns result tuple
	 */
	public getItem(key: string): LwwValueItem<CL, V> | undefined {
		const clock     = this.clock;
		const bias      = this.bias;
		const addSet    = this.addSet
		const removeSet = this.removeSet
		
		// get item from add set
		const addItem = addSet.get(key);
		if (!addItem) return undefined;
		
		// get item from remove set
		const removeItem = removeSet.get(key);
		
		if (removeItem) {
			const addClock     = addItem.clock;
			const removeClock  = removeItem.clock;
			const compareClock = clock.compare(addClock, removeClock);
			
			if (compareClock < 0 || (compareClock == 0 && bias == LwwBias.REMOVE)) {
				return undefined;
			}
		}
		
		return addItem;
	}
	
	/**
	 * Check if an element is available from dictionary.
	 *
	 * @param key - element key
	 *
	 * @returns whether the element is available
	 */
	public has(key: string): boolean {
		const item = this.getItem(key);
		
		return !!item;
	}
	
	/**
	 * Determine if the states of current dictionary are identical to another dictionary
	 *
	 * @param dict - another dictionary
	 *
	 * @returns whether the two dictionaries are identical
	 */
	public isEqual(dict: LwwElementDictLiteral<CL, V>): boolean {
		return LwwElementDict.isDictEqual(this, dict);
	}
	
	/**
	 * List available element keys
	 *
	 * @returns list of element keys
	 */
	public keys(): string[] {
		const keys = this.addSet.keys();
		
		return keys.filter((key: string) => this.has(key));
	}
	
	/**
	 * Merge from another dictionary
	 *
	 * @param dict - another dictionary
	 *
	 * @returns literal of merged dictionary
	 */
	public merge(dict: LwwElementDictLiteral<CL, V>): void {
		const dictLiteral = LwwElementDict.mergeDicts(this, dict, this.clock, this.setCtor);
		
		this.fromLiteral(dictLiteral);
	}
	
	/**
	 * Remove element from dictionary with clock ticking.
	 *
	 * @param key - element key
	 * 
	 * @returns removed item with time info
	 */
	public remove(key: string): LwwItem<CL> {
		// touch clock
		this.clock.tick();
		
		// remove item
		const item = this.newItem();
		this.removeItem(key, item);
		
		return item;
	}
	
	/**
	 * Remove element from dictionary.
	 *
	 * @param key  - element key
	 * @param item - item with time info
	 *
	 * @returns whether item is inserted into remove set or not
	 */
	public removeItem(key: string, item: LwwItem<CL>): boolean {
		// insert item into remove set (no value for items in remove set)
		return this.insertItem(key, item, this.removeSet);
	}
	
	/**
	 * Reset dictionary.
	 */
	public reset(): void {
		this.addSet.reset();
		this.removeSet.reset();
	}
	
	/**
	 * Export dictionary add set & remove set as literal
	 *
	 * @returns dictionary literal
	 */
	public toLiteral(): LwwElementDictLiteral<CL, V> {
		return {
			addSet   : this.addSet,
			removeSet: this.removeSet,
		};
	}
	
	/**
	 * Export dictionary as object literal for transport over network
	 *
	 * @returns object literal
	 */
	public toObject(): LwwElementObjLiteral<CL, V> {
		// TODO: to be implemented
		return {
			addSet   : {},
			removeSet: {},
		};
	}
	
	/**
	 * Update key of an element in dictionary with clock ticking.
	 *
	 * @param key    - existing element key
	 * @param newKey - new element key
	 *
	 * @returns added item with value & time info, and removed item with time info, or null if there is no existing value
	 */
	public updateKey(key: string, newKey: string): [LwwValueItem<CL, V>, LwwItem<CL>] | null {
		// touch clock
		this.clock.tick();
		
		// get existing item
		const oldItem = this.getItem(key);
		if (!oldItem) return null;
		
		// add item
		const addItem = this.newValueItem(oldItem.value);
		this.addItem(newKey, addItem);
		
		// remove item
		const removeItem = this.newItem();
		this.removeItem(key, removeItem);
		
		return [addItem, removeItem];
	}
}