import { Clock         } from 'clock';
import { CompareResult } from 'util/compare';
import { TimeUtil      } from 'util/time';

import { SystemClockLiteral } from './system-clock-literal.type';


export class SystemClock extends Clock<SystemClockLiteral> implements SystemClockLiteral {
	public ts: number; // timestamp in milliseconds
	
	
	/*** init ***/
	public constructor(idOrLiteral: number | SystemClockLiteral = 0, orderById?: boolean) {
		super(idOrLiteral, orderById);
		
		this.ts = (typeof idOrLiteral === 'number') ? TimeUtil.currentTs() : idOrLiteral.ts;
	}
	
	
	/*** private static ***/
	private static compareClock(aClock: SystemClockLiteral, bClock: SystemClockLiteral, orderById: boolean): CompareResult {
		// compare timestamps
		const aTs = aClock.ts;
		const bTs = bClock.ts;
		
		if (aTs < bTs) return -1; // time a is before time b
		if (aTs > bTs) return 1;  // time a is after time b
		
		// resolve order using clock ids
		if (orderById) {
			const aId = aClock.id;
			const bId = bClock.id;
			
			if (aId < bId) return -1; // a < b
			if (aId > bId) return 1;  // a > b
		}
		
		return 0; // equal
	}
	
	
	/*** public ***/
	public compare(aClock: SystemClockLiteral, bClock: SystemClockLiteral): CompareResult {
		// compare system clock times
		return SystemClock.compareClock(aClock, bClock, this.orderById);
	}
	
	public tick(): void {
		if (!this.isTicking) return;
		
		// update timestamp of clock
		this.ts = TimeUtil.currentTs();
	}
	
	public toLiteral(): SystemClockLiteral {
		// snapshot timestamp
		return {
			id: this.id,
			ts: this.ts,
		};
	}
	
	public tock(otherLiteral: SystemClockLiteral): void {
		// react to ticking of other clocks
		this.tick();
	}
}