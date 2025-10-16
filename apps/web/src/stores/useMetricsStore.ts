import { ClaimStatus } from '@/config/enums';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface MetricsState {
	selectedClaimStatus: ClaimStatus | null;
}

interface MetricsActions {
	setClaimStatus: (newStatus: ClaimStatus | null) => void;
	reset: (partialState?: Partial<MetricsState>) => void;
}

type MetricsStore = MetricsState & MetricsActions;

const initialState: MetricsState = {
	selectedClaimStatus: null,
};

export const useMetricsStore = create<MetricsStore>()(
	immer((set) => ({
		...initialState,

		setClaimStatus: (newStatus) =>
			set((state) => {
				state.selectedClaimStatus = newStatus;
			}),

		reset: (partialState) =>
			set((state) => {
				Object.assign(state, { ...initialState, ...partialState });
			}),
	}))
);
