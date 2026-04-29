import { describe, it, expect } from 'vitest';
import {
	getPageInstancesFromTree,
	updatePropertyInTree,
	buildAnswerCallGraph,
	wouldCreateCycle,
} from '../utils';
import { PageInstanceStatus } from '@/config/enums';
import { TreeNode } from '@/types/types';

describe('getPageInstancesFromTree', () => {
	it('should return empty array for empty tree', () => {
		const result = getPageInstancesFromTree([], 1);
		expect(result).toEqual([]);
	});

	it('should exclude the current instance from results', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		const result = getPageInstancesFromTree(tree, 1);
		expect(result).toEqual([]);
	});

	it('should include other instances from flat tree', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
			{
				instanceId: 2,
				parentInstanceId: null,
				pageId: 200,
				position: 1,
				title: 'Second',
				status: PageInstanceStatus.IN_PROGRESS,
				template_version: 1,
			},
			{
				instanceId: 3,
				parentInstanceId: null,
				pageId: 300,
				position: 2,
				title: 'Third',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		const result = getPageInstancesFromTree(tree, 1);
		expect(result).toEqual([
			{ instanceId: 2, pageId: 200, title: 'Second', position: 1 },
			{ instanceId: 3, pageId: 300, title: 'Third', position: 2 },
		]);
	});

	it('should recursively collect instances from nested children', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child 1',
						status: PageInstanceStatus.IN_PROGRESS,
						template_version: 1,
						children: [
							{
								instanceId: 3,
								parentInstanceId: 2,
								pageId: 300,
								position: 0,
								title: 'Grandchild',
								status: PageInstanceStatus.UNSTARTED,
								template_version: 1,
							},
						],
					},
					{
						instanceId: 4,
						parentInstanceId: 1,
						pageId: 400,
						position: 1,
						title: 'Child 2',
						status: PageInstanceStatus.COMPLETE,
						template_version: 1,
					},
				],
			},
		];
		const result = getPageInstancesFromTree(tree, 1);
		expect(result).toEqual([
			{ instanceId: 2, pageId: 200, title: 'Child 1', position: 0 },
			{ instanceId: 3, pageId: 300, title: 'Grandchild', position: 0 },
			{ instanceId: 4, pageId: 400, title: 'Child 2', position: 1 },
		]);
	});

	it('should exclude current instance even if deeply nested', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child',
						status: PageInstanceStatus.IN_PROGRESS,
						template_version: 1,
						children: [
							{
								instanceId: 3,
								parentInstanceId: 2,
								pageId: 300,
								position: 0,
								title: 'Grandchild',
								status: PageInstanceStatus.UNSTARTED,
								template_version: 1,
							},
						],
					},
				],
			},
		];
		const result = getPageInstancesFromTree(tree, 2);
		expect(result).toEqual([
			{ instanceId: 1, pageId: 100, title: 'Root', position: 0 },
			{ instanceId: 3, pageId: 300, title: 'Grandchild', position: 0 },
		]);
	});

	it('should handle complex multi-branch tree structure', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root 1',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Branch 1-1',
						status: PageInstanceStatus.IN_PROGRESS,
						template_version: 1,
					},
					{
						instanceId: 3,
						parentInstanceId: 1,
						pageId: 300,
						position: 1,
						title: 'Branch 1-2',
						status: PageInstanceStatus.UNSTARTED,
						template_version: 1,
					},
				],
			},
			{
				instanceId: 4,
				parentInstanceId: null,
				pageId: 400,
				position: 1,
				title: 'Root 2',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 5,
						parentInstanceId: 4,
						pageId: 500,
						position: 0,
						title: 'Branch 2-1',
						status: PageInstanceStatus.IN_PROGRESS,
						template_version: 1,
					},
				],
			},
		];
		const result = getPageInstancesFromTree(tree, 10); // Non-existent currentInstanceId
		expect(result).toEqual([
			{ instanceId: 1, pageId: 100, title: 'Root 1', position: 0 },
			{ instanceId: 2, pageId: 200, title: 'Branch 1-1', position: 0 },
			{ instanceId: 3, pageId: 300, title: 'Branch 1-2', position: 1 },
			{ instanceId: 4, pageId: 400, title: 'Root 2', position: 1 },
			{ instanceId: 5, pageId: 500, title: 'Branch 2-1', position: 0 },
		]);
	});

	it('should preserve order of instances as encountered during traversal', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 3,
				parentInstanceId: null,
				pageId: 300,
				position: 0,
				title: 'Third',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 1,
				title: 'First',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
			{
				instanceId: 2,
				parentInstanceId: null,
				pageId: 200,
				position: 2,
				title: 'Second',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		const result = getPageInstancesFromTree(tree, 999);
		// Should preserve array order, not sort by instanceId
		expect(result).toEqual([
			{ instanceId: 3, pageId: 300, title: 'Third', position: 0 },
			{ instanceId: 1, pageId: 100, title: 'First', position: 1 },
			{ instanceId: 2, pageId: 200, title: 'Second', position: 2 },
		]);
	});

	it('should handle node with empty children array', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [],
			},
		];
		const result = getPageInstancesFromTree(tree, 999);
		expect(result).toEqual([{ instanceId: 1, pageId: 100, title: 'Root', position: 0 }]);
	});

	it('should handle very deep nesting (5+ levels)', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Level 1',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Level 2',
						status: PageInstanceStatus.COMPLETE,
						template_version: 1,
						children: [
							{
								instanceId: 3,
								parentInstanceId: 2,
								pageId: 300,
								position: 0,
								title: 'Level 3',
								status: PageInstanceStatus.COMPLETE,
								template_version: 1,
								children: [
									{
										instanceId: 4,
										parentInstanceId: 3,
										pageId: 400,
										position: 0,
										title: 'Level 4',
										status: PageInstanceStatus.COMPLETE,
										template_version: 1,
										children: [
											{
												instanceId: 5,
												parentInstanceId: 4,
												pageId: 500,
												position: 0,
												title: 'Level 5',
												status: PageInstanceStatus.COMPLETE,
												template_version: 1,
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];
		const result = getPageInstancesFromTree(tree, 3);
		expect(result).toEqual([
			{ instanceId: 1, pageId: 100, title: 'Level 1', position: 0 },
			{ instanceId: 2, pageId: 200, title: 'Level 2', position: 0 },
			{ instanceId: 4, pageId: 400, title: 'Level 4', position: 0 },
			{ instanceId: 5, pageId: 500, title: 'Level 5', position: 0 },
		]);
	});
});

describe('updatePropertyInTree', () => {
	it('should return empty array for empty tree', () => {
		const result = updatePropertyInTree([], 1, 'status', PageInstanceStatus.COMPLETE);
		expect(result).toEqual([]);
	});

	it('should update status property of matching node', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0].status).toBe(PageInstanceStatus.COMPLETE);
	});

	it('should update title property of matching node', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Old Title',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'title', 'New Title');
		expect(result[0].title).toBe('New Title');
	});

	it('should not mutate original tree', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		const originalStatus = tree[0].status;
		updatePropertyInTree(tree, 1, 'status', PageInstanceStatus.COMPLETE);
		expect(tree[0].status).toBe(originalStatus);
	});

	it('should not modify nodes that do not match instanceId', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
			{
				instanceId: 2,
				parentInstanceId: null,
				pageId: 200,
				position: 1,
				title: 'Second',
				status: PageInstanceStatus.IN_PROGRESS,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0].status).toBe(PageInstanceStatus.COMPLETE);
		expect(result[1].status).toBe(PageInstanceStatus.IN_PROGRESS);
	});

	it('should recursively update nested node', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child',
						status: PageInstanceStatus.UNSTARTED,
						template_version: 1,
					},
				],
			},
		];
		const result = updatePropertyInTree(tree, 2, 'status', PageInstanceStatus.IN_PROGRESS);
		expect(result[0].children![0].status).toBe(PageInstanceStatus.IN_PROGRESS);
	});

	it('should update deeply nested node', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child',
						status: PageInstanceStatus.IN_PROGRESS,
						template_version: 1,
						children: [
							{
								instanceId: 3,
								parentInstanceId: 2,
								pageId: 300,
								position: 0,
								title: 'Grandchild',
								status: PageInstanceStatus.UNSTARTED,
								template_version: 1,
							},
						],
					},
				],
			},
		];
		const result = updatePropertyInTree(tree, 3, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0].children![0].children![0].status).toBe(PageInstanceStatus.COMPLETE);
	});

	it('should preserve sibling nodes unchanged', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child 1',
						status: PageInstanceStatus.UNSTARTED,
						template_version: 1,
					},
					{
						instanceId: 3,
						parentInstanceId: 1,
						pageId: 300,
						position: 1,
						title: 'Child 2',
						status: PageInstanceStatus.IN_PROGRESS,
						template_version: 1,
					},
				],
			},
		];
		const result = updatePropertyInTree(tree, 2, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0].children![0].status).toBe(PageInstanceStatus.COMPLETE);
		expect(result[0].children![1].status).toBe(PageInstanceStatus.IN_PROGRESS);
	});

	it('should handle updating node with no children property', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0]).not.toHaveProperty('children');
		expect(result[0].status).toBe(PageInstanceStatus.COMPLETE);
	});

	it('should handle updating node with empty children array', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
				children: [],
			},
		];
		const result = updatePropertyInTree(tree, 1, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0].children).toEqual([]);
		expect(result[0].status).toBe(PageInstanceStatus.COMPLETE);
	});

	it('should handle non-existent instanceId gracefully', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 999, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0].status).toBe(PageInstanceStatus.UNSTARTED); // unchanged
	});

	it('should update multiple properties correctly with successive calls', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Old Title',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		let result = updatePropertyInTree(tree, 1, 'title', 'New Title');
		result = updatePropertyInTree(result, 1, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0].title).toBe('New Title');
		expect(result[0].status).toBe(PageInstanceStatus.COMPLETE);
	});

	it('should update position property', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'position', 5);
		expect(result[0].position).toBe(5);
	});

	it('should update template_version property including null', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.UNSTARTED,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'template_version', null);
		expect(result[0].template_version).toBeNull();
	});

	it('should maintain immutability across nested structures', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child',
						status: PageInstanceStatus.UNSTARTED,
						template_version: 1,
					},
				],
			},
		];
		const originalChild = tree[0].children![0];
		const result = updatePropertyInTree(tree, 2, 'status', PageInstanceStatus.COMPLETE);

		// Original should not be mutated
		expect(originalChild.status).toBe(PageInstanceStatus.UNSTARTED);

		// Result should have new reference
		expect(result[0]).not.toBe(tree[0]);
		expect(result[0].children![0]).not.toBe(tree[0].children![0]);
	});

	it('should handle updating the same property multiple times in tree', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'First',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
			{
				instanceId: 2,
				parentInstanceId: null,
				pageId: 200,
				position: 1,
				title: 'Second',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		// Update different nodes
		let result = updatePropertyInTree(tree, 1, 'status', PageInstanceStatus.IN_PROGRESS);
		result = updatePropertyInTree(result, 2, 'status', PageInstanceStatus.UNSTARTED);

		expect(result[0].status).toBe(PageInstanceStatus.IN_PROGRESS);
		expect(result[1].status).toBe(PageInstanceStatus.UNSTARTED);
	});

	it('should not create new reference for nodes in unaffected branches', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Branch A',
						status: PageInstanceStatus.UNSTARTED,
						template_version: 1,
					},
					{
						instanceId: 3,
						parentInstanceId: 1,
						pageId: 300,
						position: 1,
						title: 'Branch B',
						status: PageInstanceStatus.UNSTARTED,
						template_version: 1,
					},
				],
			},
		];
		const originalBranchB = tree[0].children![1];
		const result = updatePropertyInTree(tree, 2, 'status', PageInstanceStatus.COMPLETE);

		// Branch B should be unchanged (same reference since it wasn't in the path)
		expect(result[0].children![1]).toBe(originalBranchB);
		// Branch A should have new reference
		expect(result[0].children![0]).not.toBe(tree[0].children![0]);
	});

	it('should handle updating parentInstanceId', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'parentInstanceId', 999);
		expect(result[0].parentInstanceId).toBe(999);
	});

	it('should handle updating pageId', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'pageId', 999);
		expect(result[0].pageId).toBe(999);
	});

	it('should handle very deep nesting (5+ levels)', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Level 1',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Level 2',
						status: PageInstanceStatus.COMPLETE,
						template_version: 1,
						children: [
							{
								instanceId: 3,
								parentInstanceId: 2,
								pageId: 300,
								position: 0,
								title: 'Level 3',
								status: PageInstanceStatus.COMPLETE,
								template_version: 1,
								children: [
									{
										instanceId: 4,
										parentInstanceId: 3,
										pageId: 400,
										position: 0,
										title: 'Level 4',
										status: PageInstanceStatus.COMPLETE,
										template_version: 1,
										children: [
											{
												instanceId: 5,
												parentInstanceId: 4,
												pageId: 500,
												position: 0,
												title: 'Level 5',
												status: PageInstanceStatus.COMPLETE,
												template_version: 1,
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];
		const result = updatePropertyInTree(tree, 5, 'title', 'Updated Level 5');
		expect(result[0].children![0].children![0].children![0].children![0].title).toBe('Updated Level 5');
	});

	it('should preserve all other properties when updating one property', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 42,
				parentInstanceId: 10,
				pageId: 999,
				position: 5,
				title: 'Original Title',
				status: PageInstanceStatus.IN_PROGRESS,
				template_version: 7,
			},
		];
		const result = updatePropertyInTree(tree, 42, 'title', 'New Title');

		expect(result[0]).toEqual({
			instanceId: 42,
			parentInstanceId: 10,
			pageId: 999,
			position: 5,
			title: 'New Title',
			status: PageInstanceStatus.IN_PROGRESS,
			template_version: 7,
		});
	});

	it('should handle updating with same value (idempotent)', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 1, 'status', PageInstanceStatus.COMPLETE);
		expect(result[0].status).toBe(PageInstanceStatus.COMPLETE);
	});

	it('should handle mixed nodes with and without children in same tree', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Has Children',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child',
						status: PageInstanceStatus.UNSTARTED,
						template_version: 1,
					},
				],
			},
			{
				instanceId: 3,
				parentInstanceId: null,
				pageId: 300,
				position: 1,
				title: 'No Children',
				status: PageInstanceStatus.IN_PROGRESS,
				template_version: 1,
			},
		];
		const result = updatePropertyInTree(tree, 3, 'status', PageInstanceStatus.COMPLETE);
		expect(result[1].status).toBe(PageInstanceStatus.COMPLETE);
		expect(result[0].children).toBeDefined();
		expect(result[1]).not.toHaveProperty('children');
	});
});

describe('buildAnswerCallGraph', () => {
	it('should return empty map for empty tree', () => {
		const result = buildAnswerCallGraph([]);
		expect(result.size).toBe(0);
	});

	it('should initialize graph with single node', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		const result = buildAnswerCallGraph(tree);
		expect(result.size).toBe(1);
		expect(result.has(1)).toBe(true);
		expect(result.get(1)!.size).toBe(0); // No calls yet
	});

	it('should initialize graph with multiple root nodes', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root 1',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
			{
				instanceId: 2,
				parentInstanceId: null,
				pageId: 200,
				position: 1,
				title: 'Root 2',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		const result = buildAnswerCallGraph(tree);
		expect(result.size).toBe(2);
		expect(result.has(1)).toBe(true);
		expect(result.has(2)).toBe(true);
		expect(result.get(1)!.size).toBe(0);
		expect(result.get(2)!.size).toBe(0);
	});

	it('should initialize graph with nested children', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child',
						status: PageInstanceStatus.COMPLETE,
						template_version: 1,
					},
				],
			},
		];
		const result = buildAnswerCallGraph(tree);
		expect(result.size).toBe(2);
		expect(result.has(1)).toBe(true);
		expect(result.has(2)).toBe(true);
	});

	it('should initialize graph with deeply nested structure', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Level 1',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Level 2',
						status: PageInstanceStatus.COMPLETE,
						template_version: 1,
						children: [
							{
								instanceId: 3,
								parentInstanceId: 2,
								pageId: 300,
								position: 0,
								title: 'Level 3',
								status: PageInstanceStatus.COMPLETE,
								template_version: 1,
							},
						],
					},
				],
			},
		];
		const result = buildAnswerCallGraph(tree);
		expect(result.size).toBe(3);
		expect(result.has(1)).toBe(true);
		expect(result.has(2)).toBe(true);
		expect(result.has(3)).toBe(true);
	});

	it('should handle complex multi-branch tree', () => {
		const tree: TreeNode[] = [
			{
				instanceId: 1,
				parentInstanceId: null,
				pageId: 100,
				position: 0,
				title: 'Root 1',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
				children: [
					{
						instanceId: 2,
						parentInstanceId: 1,
						pageId: 200,
						position: 0,
						title: 'Child 1-1',
						status: PageInstanceStatus.COMPLETE,
						template_version: 1,
					},
					{
						instanceId: 3,
						parentInstanceId: 1,
						pageId: 300,
						position: 1,
						title: 'Child 1-2',
						status: PageInstanceStatus.COMPLETE,
						template_version: 1,
					},
				],
			},
			{
				instanceId: 4,
				parentInstanceId: null,
				pageId: 400,
				position: 1,
				title: 'Root 2',
				status: PageInstanceStatus.COMPLETE,
				template_version: 1,
			},
		];
		const result = buildAnswerCallGraph(tree);
		expect(result.size).toBe(4);
		expect(result.has(1)).toBe(true);
		expect(result.has(2)).toBe(true);
		expect(result.has(3)).toBe(true);
		expect(result.has(4)).toBe(true);
	});
});

describe('wouldCreateCycle', () => {
	it('should return false when target has no calls', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set());

		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(false);
	});

	it('should return true for direct cycle (A -> B, B -> A)', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([1])); // 2 calls 1

		// If we add 1 -> 2, it creates a cycle
		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(true);
	});

	it('should return true for indirect cycle (A -> B -> C -> A)', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([3])); // 2 calls 3
		callGraph.set(3, new Set([1])); // 3 calls 1

		// If we add 1 -> 2, it creates cycle: 1 -> 2 -> 3 -> 1
		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(true);
	});

	it('should return false for non-cyclic linear chain', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([3])); // 2 -> 3
		callGraph.set(3, new Set([4])); // 3 -> 4
		callGraph.set(4, new Set()); // 4 -> nothing

		// Adding 1 -> 2 creates 1 -> 2 -> 3 -> 4, no cycle
		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(false);
	});

	it('should return false when instances are independent', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([3])); // 2 -> 3
		callGraph.set(3, new Set());
		callGraph.set(4, new Set([5])); // 4 -> 5 (separate chain)
		callGraph.set(5, new Set());

		// Adding 1 -> 4 doesn't create a cycle
		const result = wouldCreateCycle(1, 4, callGraph);
		expect(result).toBe(false);
	});

	it('should handle complex cycle with multiple paths', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([3, 4])); // 2 calls both 3 and 4
		callGraph.set(3, new Set([5])); // 3 -> 5
		callGraph.set(4, new Set([5])); // 4 -> 5
		callGraph.set(5, new Set([1])); // 5 -> 1

		// If we add 1 -> 2, creates cycle through multiple paths
		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(true);
	});

	it('should return true for self-loop', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set([1])); // 1 calls itself

		const result = wouldCreateCycle(1, 1, callGraph);
		expect(result).toBe(true);
	});

	it('should detect cycle in long chain', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([3]));
		callGraph.set(3, new Set([4]));
		callGraph.set(4, new Set([5]));
		callGraph.set(5, new Set([6]));
		callGraph.set(6, new Set([1])); // 6 -> 1

		// Adding 1 -> 2 creates: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 1
		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(true);
	});

	it('should not detect false positive in diverging paths', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([4, 5])); // 2 branches to 4 and 5
		callGraph.set(3, new Set([4, 5])); // 3 also branches to 4 and 5
		callGraph.set(4, new Set());
		callGraph.set(5, new Set());

		// Adding 1 -> 2 doesn't create cycle even though paths merge
		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(false);
	});

	it('should handle empty call graph gracefully', () => {
		const callGraph = new Map<number, Set<number>>();

		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(false);
	});

	it('should handle missing nodes in graph', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		// Node 2 not in graph

		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(false);
	});

	it('should detect cycle through visited node optimization', () => {
		// This tests that visited tracking prevents infinite loops
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([3]));
		callGraph.set(3, new Set([2, 1])); // 3 -> 2 (back) and 3 -> 1 (forward)

		// Should detect cycle via 3 -> 1 without getting stuck in 2 <-> 3
		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(true);
	});

	it('should return false when target leads to dead end', () => {
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([99])); // 2 calls non-existent node
		callGraph.set(3, new Set());

		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(false);
	});

	it('should handle diamond pattern without false positive', () => {
		//    1
		//   / \
		//  2   3
		//   \ /
		//    4
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([4]));
		callGraph.set(3, new Set([4]));
		callGraph.set(4, new Set());

		// Adding 1 -> 2 creates diamond but no cycle
		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(false);
	});

	it('should detect cycle in diamond with back edge', () => {
		//    1
		//   / \
		//  2   3
		//   \ /
		//    4 -> 1
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([4]));
		callGraph.set(3, new Set([4]));
		callGraph.set(4, new Set([1])); // Back edge

		const result = wouldCreateCycle(1, 2, callGraph);
		expect(result).toBe(true);
	});

	it('should handle multiple independent cycles', () => {
		// Cycle 1: 1 -> 2 -> 1
		// Cycle 2: 4 -> 5 -> 4
		// Node 3 independent
		const callGraph = new Map<number, Set<number>>();
		callGraph.set(1, new Set());
		callGraph.set(2, new Set([1]));
		callGraph.set(3, new Set());
		callGraph.set(4, new Set([5]));
		callGraph.set(5, new Set([4]));

		// Check first cycle
		expect(wouldCreateCycle(1, 2, callGraph)).toBe(true);

		// Check connection between cycles (should be safe)
		expect(wouldCreateCycle(3, 1, callGraph)).toBe(false);
		expect(wouldCreateCycle(3, 4, callGraph)).toBe(false);
	});
});
