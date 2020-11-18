import { ClockLiteral } from 'clock';


export interface LwwItem<CL extends ClockLiteral> {
	clock: CL;
}