import { trpc } from '@/lib/trpc';

export function usePageInstanceTreeInvalidator() {
	const utils = trpc.useUtils();

	const invalidateTree = () => {
		// Invalidate ALL tree queries across all checklists and claims
		// We don't filter by checklistId because:
		// 1. The params might be stale if captured in closure
		// 2. Operations like answer/question changes can affect the tree
		// 3. It's safer to invalidate all trees and let React Query refetch only active ones
		utils.page.getPageInstanceTree.invalidate();
	};

	return invalidateTree;
}
