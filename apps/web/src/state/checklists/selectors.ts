import { State } from '../store';
import { SLICES } from '../storeConfig';

export const getSlice = (state: State) => state[SLICES.CHECKLISTS];
