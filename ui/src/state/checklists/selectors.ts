import { State } from '../store';
import { SLICES } from '../storeConfig';

const getSlice = (state: State) => state[SLICES.CHECKLISTS];
