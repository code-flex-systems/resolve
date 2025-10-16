import { describe, it, expect } from 'vitest';
import { getPageInstancesFromTree, updatePropertyInTree } from '../utils';
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
			{ instanceId: 2, pageId: 200 },
			{ instanceId: 3, pageId: 300 },
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
			{ instanceId: 2, pageId: 200 },
			{ instanceId: 3, pageId: 300 },
			{ instanceId: 4, pageId: 400 },
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
			{ instanceId: 1, pageId: 100 },
			{ instanceId: 3, pageId: 300 },
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
			{ instanceId: 1, pageId: 100 },
			{ instanceId: 2, pageId: 200 },
			{ instanceId: 3, pageId: 300 },
			{ instanceId: 4, pageId: 400 },
			{ instanceId: 5, pageId: 500 },
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
			{ instanceId: 3, pageId: 300 },
			{ instanceId: 1, pageId: 100 },
			{ instanceId: 2, pageId: 200 },
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
		expect(result).toEqual([{ instanceId: 1, pageId: 100 }]);
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
			{ instanceId: 1, pageId: 100 },
			{ instanceId: 2, pageId: 200 },
			{ instanceId: 4, pageId: 400 },
			{ instanceId: 5, pageId: 500 },
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
