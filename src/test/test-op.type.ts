import { ClockLiteral          } from 'clock';
import { LwwItem, LwwValueItem } from 'lww/item';


export type TestOp<CL extends ClockLiteral> = {
	name: 'add',
	key : string,
	item: LwwValueItem<CL>,
} | {
	name: 'remove',
	key : string,
	item: LwwItem<CL>,
} | {
	name: 'update_key',
	key : [string, string],
	item: [LwwValueItem<CL>, LwwItem<CL>],
};