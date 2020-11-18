import { ClockLiteral } from 'clock';

import { LwwItem      } from './item/lww-item.type';
import { LwwValueItem } from './item/lww-value-item.type';


export interface LwwElementObjLiteral<CL extends ClockLiteral, V> {
	addSet   : { [key: string]: LwwValueItem<CL, V> };
	removeSet: { [key: string]: LwwItem<CL>         };
}