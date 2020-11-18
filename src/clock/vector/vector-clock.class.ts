import { Clock         } from 'clock';
import { ArrayUtil     } from 'util/array';
import { CompareResult } from 'util/compare';

import { VectorClockLiteral } from './vector-clock-literal.type';


export class VectorClock extends Clock<VectorClockLiteral> implements VectorClockLiteral {
	public readonly times: number[]; // time vector in integer
	
	
	/*** init ***/
	public constructor(idOrLiteral: number | VectorClockLiteral = 0, orderById?: boolean, length?: number) {
		super(idOrLiteral, orderById);
		
		this.times = (typeof idOrLiteral === 'number') ? VectorClock.zeroTimes(length) : idOrLiteral.times;
	}
	
	
	/*** private static ***/
	private static compareClock(aClock: VectorClockLiteral, bClock: VectorClockLiteral, orderById: boolean): CompareResult {
		// compare time vectors
		const aTimes = aClock.times;
		const bTimes = bClock.times;
		
		if (this.isTimeBefore(aTimes, bTimes)) return -1; // time a is before time b
		if (this.isTimeAfter(aTimes, bTimes)) return 1;   // time a is after time b
		
		// resolve order using clock ids
		if (orderById) {
			const aId = aClock.id;
			const bId = bClock.id;
			
			if (aId < bId) return -1; // a < b
			if (aId > bId) return 1;  // a > b
		}
		
		return 0;  // equal
	}
	
	private static isTimeAfter(aTimes: number[], bTimes: number[]): boolean {
		return this.isTimeBefore(bTimes, aTimes);
	}
	
	private static isTimeBefore(aTimes: number[], bTimes: number[]): boolean {
		const length    = Math.min(aTimes.length, bTimes.length);
		let   hasBefore = false;
		
		for (let i = 0; i < length; i++) {
			const aTime = aTimes[i];
			const bTime = bTimes[i];
			if (aTime > bTime) return false;
			
			if (aTime < bTime) hasBefore = true;
		}
		
		return hasBefore;
	}
	
	private static isTimeEqual(aTimes: number[], bTimes: number[]): boolean {
		return (!this.isTimeBefore(aTimes, bTimes) && !this.isTimeAfter(aTimes, bTimes));
	}
	
	private static zeroTimes(length: number = 1): number[] {
		// all clock times are set to zero initially
		const times = new Array(length);
		times.fill(0);
		
		return times;
	}
	
	
	/*** private ***/
	private get length(): number {
		// length of vector clock
		return this.times.length;
	}
	
	
	/*** public ***/
	public compare(aClock: VectorClockLiteral, bClock: VectorClockLiteral): CompareResult {
		// compare vector clock times
		return VectorClock.compareClock(aClock, bClock, this.orderById);
	}
	
	public tick(): void {
		if (!this.isTicking) return;
		
		// increment time vector with respect to clock id
		const id    = this.id;
		const times = this.times;
		if (!(id in times)) return;
		
		times[id]++;
	}
	
	public toLiteral(): VectorClockLiteral {
		// snapshot time vector
		return {
			id   : this.id,
			times: ArrayUtil.copy(this.times),
		};
	}
	
	public tock(otherLiteral: VectorClockLiteral): void {
		// react to ticking of other clocks
		this.tick();
		
		// update time vector
		const times      = this.times;
		const otherTimes = otherLiteral.times;
		const length     = Math.min(times.length, otherTimes.length);
		
		for (let i = 0; i < length; i++) {
			const otherTime = otherTimes[i];
			if (otherTime > times[i]) times[i] = otherTime;
		}
	}
}