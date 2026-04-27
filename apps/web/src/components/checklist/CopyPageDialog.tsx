'use client';
import { useState } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { TreeNode } from '@/types/types';
import BasicDialog from '../common/BasicDialog';

interface CopyPageDialogProps {
	onClose: () => void;
	onCopy: (parentId: string | null, position: number) => Promise<void>;
	title: string;
	tree: TreeNode[];
	currentInstanceId: string;
	currentParentId: string | null;
	currentPosition: number;
	isPending: boolean;
}

interface PageInstanceOption {
	instanceId: string;
	pageId: string;
	title: string;
	position: number;
}

function getPageInstancesFromTreeForDialog(tree: TreeNode[], currentInstanceId: string): PageInstanceOption[] {
	const instances: PageInstanceOption[] = [];
	collectInstances(tree, currentInstanceId, instances);
	return instances;
}

function collectInstances(tree: TreeNode[], currentInstanceId: string, instances: PageInstanceOption[]) {
	tree.forEach((node) => {
		if (node.instanceId !== currentInstanceId) {
			instances.push({
				instanceId: node.instanceId,
				pageId: node.pageId,
				title: node.title,
				position: node.position,
			});
		}

		if (node.children) {
			collectInstances(node.children, currentInstanceId, instances);
		}
	});
}

export default function CopyPageDialog(props: CopyPageDialogProps) {
	const { onClose, onCopy, title, tree, currentInstanceId, currentParentId, currentPosition, isPending } = props;
	const [selectedParentId, setSelectedParentId] = useState<string | null>(currentParentId);

	const pageInstanceOptions = getPageInstancesFromTreeForDialog(tree, currentInstanceId);

	const handleCopy = async () => {
		try {
			// If "Copy as sibling" is selected, use current parent and position+1
			// Otherwise, use selected parent as parent with position 1
			const parentId = selectedParentId === '__sibling__' ? currentParentId : selectedParentId;
			const position = selectedParentId === '__sibling__' ? currentPosition + 1 : 1;
			await onCopy(parentId, position);
			onClose();
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<BasicDialog
			title={title}
			onClose={onClose}
			width={400}
			primaryAction={{
				label: 'Copy',
				onClick: handleCopy,
				disabled: isPending,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
					disabled: isPending,
				},
			]}
			showCloseButton={false}
		>
			<span    style={{ fontSize: 15, color: 'primary', paddingBottom: '10px' }}>
				Select parent page:
			</span>
			<Dropdown
				options={[
					{ value: '__sibling__', label: 'Copy as sibling' },
					{ value: '__root__', label: 'Root level' },
					...pageInstanceOptions
						.map((o) => ({
							value: o.instanceId,
							label: `${o.title} (p${o.position + 1})`,
						})),
				]}
				value={selectedParentId ?? '__sibling__'}
				onChange={(v) => setSelectedParentId(v === '__sibling__' ? null : v === '__root__' ? null : String(v))}
				placeholder="Choose a parent"
			/>
		</BasicDialog>
	);
}

const styles = {
	textFieldOverrides: {
		width: 300,
		fontSize: 14,
		'& .MuiInputBase-root': {
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '3px 5px',
		},
	},
};
