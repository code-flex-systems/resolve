import { DEFAULT_TREE_NODE } from '@/config/defaults';
import { State } from '../store';
import { SLICES } from '../storeConfig';

const getSlice = (state: State) => state[SLICES.CHECKLIST];

export function selectedPageInfo(state: State) {
	const { selectedPageInfo } = getSlice(state);
	return selectedPageInfo ?? DEFAULT_TREE_NODE;
}
