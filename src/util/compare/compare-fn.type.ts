import { CompareResult } from './compare-result.type';


export type CompareFn<T> = (a: T, b: T) => CompareResult;