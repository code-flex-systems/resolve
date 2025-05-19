import useStore, { Slice, initialState } from './store';

type SliceState = typeof initialState[keyof typeof initialState];

export function getStateBuilder<T extends SliceState>(slice: Slice): () => T {
	return () => useStore.getState()[slice] as T;
}

export function setStateBuilder<T extends SliceState>(slice: Slice):
	(callback: (state: T) => void) => void {
	return (callback: (scopedState: T) => void) => {
		useStore.setState(state => {
			callback(state[slice] as T);
		});
	}
}