import config from '@/config/config';
import { User } from '@/types/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface GlobalState {
	navOpen: boolean;
	selectedPage: string;
	user: User;
}

interface GlobalActions {
	toggleNavOpen: () => void;
	updateSelectedPage: (newPage: string) => void;
	reset: (partialState?: Partial<GlobalState>) => void;
}

type GlobalStore = GlobalState & GlobalActions;

const initialState: GlobalState = {
	navOpen: false,
	selectedPage: '',
	user: {
		email: 'fake_email@gmail.com',
		roles: [config.ROLES.ADMIN],
		userid: 1,
		username: 'fake_username',
	},
};

export const useGlobalStore = create<GlobalStore>()(
	immer((set) => ({
		...initialState,

		toggleNavOpen: () =>
			set((state) => {
				state.navOpen = !state.navOpen;
			}),

		updateSelectedPage: (newPage) =>
			set((state) => {
				state.selectedPage = newPage;
			}),

		reset: (partialState) =>
			set((state) => {
				Object.assign(state, { ...initialState, ...partialState });
			}),
	}))
);
