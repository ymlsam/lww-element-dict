import { Clock        } from './clock.class';
import { ClockLiteral } from './clock-literal.interface';


export interface ClockCtor<CL extends ClockLiteral> {
	new (idOrLiteral?: number | CL, orderById?: boolean, length?: number): Clock<CL>;
}