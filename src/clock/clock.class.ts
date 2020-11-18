import { CompareResult } from 'util/compare';

import { ClockLiteral } from './clock-literal.interface';


/**
 * A clock to provide absolute or relative time info for use with key-value store
 */
export abstract class Clock<CL extends ClockLiteral> implements ClockLiteral {
	protected       isTicking: boolean = true; // whether clock is ticking
	protected       orderById: boolean;        // whether to resolve clock time order using clock ids when times are equal
	public readonly id       : number;         // clock id
	
	
	/*** init ***/
	public constructor(idOrLiteral: number | CL = 0, orderById: boolean = true) {
		this.id        = (typeof idOrLiteral === 'number') ? idOrLiteral : idOrLiteral.id;
		this.orderById = orderById;
	}
	
	
	/*** public ***/
	public abstract compare(aClock: CL, bClock: CL): CompareResult; // compare clock times
	public abstract tick(): void;                                   // clock ticking driven by event & message sending
	public abstract toLiteral(): CL;                                // snapshot of clock time
	public abstract tock(literal: CL): void;                        // clock ticking driven by message receiving
	
	/**
	 * Freeze clock ticking.
	 */
	public freeze(): void {
		this.isTicking = false;
	}
	
	/**
	 * Unfreeze clock ticking.
	 */
	public unfreeze(): void {
		this.isTicking = true;
	}
}