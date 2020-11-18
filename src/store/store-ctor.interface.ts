import { Store } from './store.class';


export interface StoreCtor<T> {
	new (): Store<T>;
}