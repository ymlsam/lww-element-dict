export class DataUtil {
	/*** public static ***/
	
	/**
	 * Deep value clone
	 *
	 * @param value - value to be cloned
	 */
	public static clone(value: any): any {
		// primitive types (non-object)
		if (typeof value !== 'object') return value;
		
		// date
		if (value instanceof Date) return new Date(value.getTime());
		
		// null
		if (value === null) return null;
		
		// array
		if (Array.isArray(value)) return this.cloneArray(value);
		
		// object
		const keys = Object.keys(value);
		const obj  = {};
		
		for (const key of keys) {
			obj[key] = this.clone(value[key]);
		}
		
		return obj;
	}
	
	/**
	 * Deep array clone
	 *
	 * @param values - array to be cloned
	 */
	public static cloneArray(values: any[]): any[] {
		return values.map((value: any) => this.clone(value));
	}
	
	/**
	 * Deep & strict equality check between two arrays
	 *
	 * @param a - array one
	 * @param b - array two
	 */
	public static isArrayEqual(a: any[], b: any[]): boolean {
		if (a.length != b.length) return false;
		
		for (let i = 0; i < a.length; i++) {
			if (!this.isEqual(a[i], b[i])) return false;
		}
		
		return true;
	}
	
	/**
	 * Deep & strict equality check between two values
	 *
	 * @param a - value one
	 * @param b - value two
	 */
	public static isEqual(a: any, b: any): boolean {
		// strict equality check with shallow array support
		if (typeof a !== typeof b) return false;
		
		// primitive types (non-object)
		if (typeof a !== 'object') return (a === b);
		
		// date
		if (a instanceof Date && b instanceof Date) return (a.getTime() === b.getTime());
		
		// object, array or null
		if (a === b) return true;
		if (a === null || b === null) return false;
		
		if (!Array.isArray(a) && !Array.isArray(b)) {
			// object
			const aKeys = Object.keys(a).sort();
			const bKeys = Object.keys(b).sort();
			
			// compare object keys
			if (!this.isArrayEqual(aKeys, bKeys)) return false;
			
			// compare object values
			for (const key of aKeys) {
				if (!this.isEqual(a[key], b[key])) return false;
			}
			
			return true;
			
		} else if (Array.isArray(a) && Array.isArray(b)) {
			// array
			return this.isArrayEqual(a, b);
		}
		
		// one is object, one is array
		return false;
	}
}