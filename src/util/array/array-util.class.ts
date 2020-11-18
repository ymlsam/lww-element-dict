export class ArrayUtil {
	/*** public static ***/
	
	/**
	 * Make a shallow copy of array.
	 * 
	 * @param arr - array to be copied
	 * 
	 * @returns shallow copy of array
	 */
	public static copy<T>(arr: ReadonlyArray<T>): T[] {
		return arr.slice();
	}
}