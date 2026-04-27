import React, { useEffect } from 'react';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import Dropdown from '@/components/ui/Dropdown';

export default function PageInstanceSelect({
	checklistId,
	instanceId,
	setInstanceId,
	clearable = true,
	height,
	text = 'Filter by page',
	disabled = false,
}: {
	checklistId: string;
	instanceId: string | null;
	setInstanceId: (newInstanceId: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const { data: options = [], isFetching } = usePageTrpc().listInstances(
		{ checklistId },
		{ enabled: !!checklistId }
	);

	useEffect(() => {
		if (!clearable && options.length > 0) {
			setInstanceId(options[0].instance_id);
		}
	}, [options, clearable]);

	const dropdownOptions = [
		...(clearable ? [{ value: '', label: 'All' }] : []),
		...options.map((o) => ({
			value: o.instance_id,
			label: `${o.title} (p${o.position + 1})`,
		})),
	];

	return (
		<Dropdown inlineLabel
			options={dropdownOptions}
			value={instanceId ?? ''}
			onChange={(val) => setInstanceId(val === '' ? null : String(val))}
			placeholder={text}
			size="sm"
			disabled={disabled}
		/>
	);
}
