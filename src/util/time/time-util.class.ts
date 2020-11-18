export class TimeUtil {
	/*** public static ***/
	
	/**
	 * Get Unix timestamp of current moment in milliseconds.
	 *
	 * @returns current Unix timestamp
	 */
	public static currentTs(): number {
		const now = new Date();
		
		return now.getTime();
	}
}