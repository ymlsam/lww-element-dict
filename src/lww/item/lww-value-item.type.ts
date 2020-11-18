import { ClockLiteral } from 'clock';

import { LwwItem         } from './lww-item.type';
import { LwwElementValue } from '../lww-element-value.type';


export interface LwwValueItem<CL extends ClockLiteral, V = LwwElementValue> extends LwwItem<CL> {
	value: V;
}