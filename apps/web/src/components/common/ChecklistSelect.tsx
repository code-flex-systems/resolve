import { GetChecklistOutput, useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import React, { useEffect } from 'react';
import Dropdown from '@/components/ui/Dropdown';

export default function ChecklistSelect({
	checklist,
	setChecklist,
	clearable = true,
	showEmpty = false,
	height,
	text = 'Filter by checklist',
	disabled = false,
}: {
	checklist: GetChecklistOutput | null;
	setChecklist: (newChecklist: GetChecklistOutput | null) => void;
	clearable?: boolean;
	showEmpty?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const { data: options = [], isFetching } = useChecklistTrpc().list({});

	useEffect(() => {
		if (!clearable && !showEmpty && options.length > 0) {
			setChecklist(options[0]);
		}
	}, [options, clearable, showEmpty]);

	const dropdownOptions = [
		...(clearable ? [{ value: '', label: 'All' }] : []),
		...options.map((o) => ({
			value: o.id,
			label: o.name,
		})),
	];

	return (
		<Dropdown inlineLabel
			options={dropdownOptions}
			value={checklist?.id ?? ''}
			onChange={(val) => {
				if (val === '') {
					setChecklist(null);
				} else {
					const selected = options.find((o) => o.id === val);
					if (selected) setChecklist(selected);
				}
			}}
			placeholder={text}
			size="sm"
			disabled={disabled}
		/>
	);
}
