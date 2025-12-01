import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type AlertSeverity = 'success' | 'info' | 'warning' | 'error';

export interface Alert {
	id: string;
	message: string;
	severity: AlertSeverity;
	autoHide?: boolean;
}

interface AlertState {
	alerts: Alert[];
}

interface AlertActions {
	showAlert: (message: string, severity: AlertSeverity) => void;
	hideAlert: (id: string) => void;
	clearAllAlerts: () => void;
}

type AlertStore = AlertState & AlertActions;

const initialState: AlertState = {
	alerts: [],
};

export const useAlertStore = create<AlertStore>()(
	immer((set) => ({
		...initialState,

		showAlert: (message, severity) =>
			set((state) => {
				const id = `${Date.now()}-${Math.random()}`;
				const autoHide = severity === 'success' || severity === 'info';
				state.alerts.push({
					id,
					message,
					severity,
					autoHide,
				});
			}),

		hideAlert: (id) =>
			set((state) => {
				state.alerts = state.alerts.filter((alert) => alert.id !== id);
			}),

		clearAllAlerts: () =>
			set((state) => {
				state.alerts = [];
			}),
	}))
);
