// // apps/ui/src/components/VirtualPageTree.tsx
// import { useVirtualizer } from '@tanstack/react-virtual';
// import { List, ListItemButton, ListItemText, Collapse, Box } from '@mui/material';
// import { useRef, useState } from 'react';

// // Example flattened tree node type
// type FlattenedNode = {
// 	id: number;
// 	title: string;
// 	depth: number;
// 	isParent: boolean;
// 	isExpanded: boolean;
// };

// function flattenTree(tree: TreeNode[], depth = 0): FlattenedNode[] {
// 	const flat: FlattenedNode[] = [];

// 	for (const node of tree) {
// 		flat.push({
// 			id: node.id,
// 			title: node.title,
// 			depth,
// 			isParent: node.children.length > 0,
// 			isExpanded: node.isExpanded,
// 		});

// 		if (node.isExpanded) {
// 			flat.push(...flattenTree(node.children, depth + 1));
// 		}
// 	}

// 	return flat;
// }

// interface VirtualPageTreeProps {
// 	nodes: FlattenedNode[]; // flattened array (pre-expanded/collapsed in logic)
// }

// export const VirtualPageTree = ({ nodes }: VirtualPageTreeProps) => {
// 	const parentRef = useRef<HTMLDivElement>(null);

// 	const rowVirtualizer = useVirtualizer({
// 		count: nodes.length,
// 		getScrollElement: () => parentRef.current,
// 		estimateSize: () => 48, // height estimate (px) per item
// 		overscan: 5, // render 5 extra rows outside viewport
// 	});

// 	return (
// 		<Box
// 			ref={parentRef}
// 			sx={{
// 				height: '100vh', // adjust as needed
// 				overflow: 'auto',
// 			}}
// 		>
// 			<List disablePadding sx={{ position: 'relative', height: `${rowVirtualizer.getTotalSize()}px` }}>
// 				{rowVirtualizer.getVirtualItems().map((virtualRow) => {
// 					const node = nodes[virtualRow.index];

// 					return (
// 						<Box
// 							key={node.id}
// 							sx={{
// 								position: 'absolute',
// 								top: 0,
// 								left: 0,
// 								width: '100%',
// 								height: `${virtualRow.size}px`,
// 								transform: `translateY(${virtualRow.start}px)`,
// 							}}
// 						>
// 							<ListItemButton sx={{ pl: 2 + node.depth * 2 }}>
// 								<ListItemText primary={node.title} />
// 							</ListItemButton>
// 						</Box>
// 					);
// 				})}
// 			</List>
// 		</Box>
// 	);
// };
