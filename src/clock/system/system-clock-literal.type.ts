import { ClockLiteral } from '../clock-literal.interface';


export interface SystemClockLiteral extends ClockLiteral {
	ts: number;
}