import { trpc } from '@/lib/trpc';
import { updatePropertyInTree } from '@/lib/utils/utils';

export function useEvaluateResponses() {
	const utils = trpc.useUtils();

	return trpc.response.evaluateResponses.useMutation({
		onSuccess(newStatus, { checklistId, claimId, instanceId }) {
			utils.page.getPageInstanceTree.setData({ checklistId, claimId }, (old) => {
				if (!old) return old;
				const updatedTree = updatePropertyInTree(old.tree, instanceId, 'status', newStatus);
				return { ...old, tree: updatedTree };
			});
		},
	});
}
