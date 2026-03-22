import { Claim } from '@/hooks/trpc/useClaimTrpc';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import type { DateRange } from '@/types/dateTypes';
import dayjs, { Dayjs } from 'dayjs';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface BreakdownState {
	breakdownClaim: Claim | null;
	breakdownRange: DateRange<Dayjs>;
	breakdownUsers: GetUserOutput[];
	selectedAnswerId: string | null;
	selectedQuestionId: string | null;
}

interface BreakdownActions {
	updateBreakdownClaim: (newClaim: Claim | null) => void;
	updateBreakdownRange: (newRange: DateRange<Dayjs>) => void;
	updateBreakdownUsers: (newUser: GetUserOutput[]) => void;
	updateSelectedAnswerId: (newId: string | null) => void;
	updateSelectedQuestionId: (newId: string | null) => void;
	reset: (partialState?: Partial<BreakdownState>) => void;
}

type BreakdownStore = BreakdownState & BreakdownActions;

const initialState: BreakdownState = {
	breakdownClaim: null,
	breakdownRange: [dayjs().startOf('month'), dayjs().endOf('month')],
	breakdownUsers: [],
	selectedAnswerId: null,
	selectedQuestionId: null,
};

export const useBreakdownStore = create<BreakdownStore>()(
	immer((set) => ({
		...initialState,

		updateBreakdownClaim: (newClaim: Claim | null) =>
			set((state) => {
				state.breakdownClaim = newClaim;
			}),

		updateBreakdownRange: (newRange: DateRange<Dayjs>) =>
			set((state) => {
				state.breakdownRange = newRange;
			}),

		updateBreakdownUsers: (newUsers: GetUserOutput[]) =>
			set((state) => {
				state.breakdownUsers = newUsers;
			}),

		updateSelectedAnswerId: (newId) =>
			set((state) => {
				state.selectedAnswerId = newId;
			}),

		updateSelectedQuestionId: (newId) =>
			set((state) => {
				state.selectedQuestionId = newId;
				state.selectedAnswerId = null;
			}),

		reset: (partialState) =>
			set((state) => {
				Object.assign(state, { ...initialState, ...partialState });
			}),
	}))
);
