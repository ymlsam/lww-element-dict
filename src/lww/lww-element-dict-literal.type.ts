import { ClockLiteral } from 'clock';
import { Store        } from 'store';

import { LwwItem         } from './item/lww-item.type';
import { LwwValueItem    } from './item/lww-value-item.type';
import { LwwElementValue } from './lww-element-value.type';


export interface LwwElementDictLiteral<CL extends ClockLiteral, V = LwwElementValue> {
	addSet   : Store<LwwValueItem<CL, V>>;
	removeSet: Store<LwwItem<CL>>;
}