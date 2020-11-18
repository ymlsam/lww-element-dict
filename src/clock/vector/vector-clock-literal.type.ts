import { ClockLiteral } from '../clock-literal.interface';


export interface VectorClockLiteral extends ClockLiteral {
	readonly times: number[];
}