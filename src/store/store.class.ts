import { DataUtil } from 'util/data';


/**
 * Base class of key-value store with time info.
 * It could be implemented in memory using Map or object literal,
 * or in physical storage via cookie, browser local storage, database, etc.
 */
export abstract class Store<T> {
	/*** public ***/
	public abstract get(key: string): T | undefined; // get value-time tuple
	public abstract has(key: string): boolean;       // check if value-time tuple exists
	public abstract keys(): string[];                // list all keys in store
	public abstract remove(key: string): boolean;    // remove value-time tuple
	public abstract reset(): void;                   // reset data store by emptying all records
	public abstract set(key: string, item: T): void; // set value-time tuple
	
	/**
	 * Determine if the states of two stores are identical
	 * 
	 * @param store - another store to compare
	 * 
	 * @returns whether the two stores are identical
	 */
	public isEqual(store: this): boolean {
		// sort keys in alphabetical order
		const aKeys = this.keys().sort();
		const bKeys = store.keys().sort();
		
		// compare keys
		if (!DataUtil.isArrayEqual(aKeys, bKeys)) return false;
		
		// compare values
		for (const key of aKeys) {
			const a = this.get(key);
			const b = store.get(key);
			
			if (!DataUtil.isEqual(a, b)) return false;
		}
		
		return true;
	}
}