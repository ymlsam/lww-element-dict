import { Clock, ClockLiteral } from 'clock';
import { LwwElementDict      } from 'lww';


export interface TestProcess<CL extends ClockLiteral> {
	id   : number;
	clock: Clock<CL>;
	dict : LwwElementDict<CL>;
}