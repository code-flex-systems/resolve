import { useAlertStore } from '@/stores/useAlertStore';

type CrudAction = 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'copy' | 'assign';

const actionText: Record<CrudAction, string> = {
	create: 'created',
	update: 'updated',
	delete: 'deleted',
	archive: 'archived',
	restore: 'restored',
	copy: 'copied',
	assign: 'assigned',
};

const startCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function useCrudAlerts(resourceLabel: string) {
	const showAlert = useAlertStore((state) => state.showAlert);

	const formatSuccess = (action: CrudAction) =>
		`${startCase(resourceLabel)} ${actionText[action]} successfully`;
	const formatError = (action: CrudAction) => `Failed to ${action} ${resourceLabel}`;

	return {
		showSuccess: (action: CrudAction, message?: string) => {
			showAlert(message ?? formatSuccess(action), 'success');
		},
		showError: (action: CrudAction, error?: unknown, fallbackMessage?: string) => {
			const fallback = fallbackMessage ?? formatError(action);
			const detail = error instanceof Error && error.message ? error.message : fallback;
			showAlert(detail, 'error');
		},
	};
}
