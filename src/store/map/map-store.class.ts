import { Store } from 'store';


/**
 * Key-value store with time info implemented using.
 */
export class MapStore<T> extends Store<T> {
	private readonly map = new Map<string, T>();
	
	
	/*** public ***/
	public get(key: string): T | undefined {
		return this.map.get(key);
	}
	
	public has(key: string): boolean {
		return this.map.has(key);
	}
	
	public keys(): string[] {
		return Array.from(this.map.keys());
	}
	
	public remove(key: string): boolean {
		return this.map.delete(key);
	}
	
	public reset(): void {
		this.map.clear();
	}
	
	public set(key: string, item: T): void {
		this.map.set(key, item);
	}
}