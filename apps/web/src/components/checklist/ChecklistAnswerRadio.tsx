'use client';
import { Checkbox, FormControlLabel, Link, Radio, Stack, Tooltip, Typography } from '@mui/material';
import { QuestionType } from '@/config/enums';
import { Question } from '@/types/types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

export default function ChecklistAnswerRadio(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
	disabled?: boolean;
}) {
	const { field, question, disabled } = props;
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const goToPage = useChecklistStore((state) => state.goToPage);
	const { data = { tree: [], maxPosition: 0 } } = usePageTrpc().getInstanceTree(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const { data: visibleInstanceIds = [] } = usePageTrpc().listVisibleInstances(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	return (
		<Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap padding="0px 10px">
			{(question.answers ?? []).map((a) => (
				<Tooltip key={a.id} placement="top" title={a.description_text ?? ''} arrow>
					<FormControlLabel
						control={
							question.type === QuestionType.MULTI ? (
								<Checkbox
									checked={!!field.value?.includes(a.id)}
									onChange={(e) => {
										const newValue = e.target.checked
											? [...(field.value ?? []), a.id]
											: field.value?.filter((value: any) => value !== a.id);
										field.onChange(newValue);
									}}
									disabled={disabled}
									sx={{ color: 'primary.main' }}
								/>
							) : (
								<Radio
									checked={!!field.value?.includes(a.id)}
									onChange={(e) => {
										const newValue = e.target.checked ? [a.id] : [];
										field.onChange(newValue);
									}}
									disabled={disabled}
									color="primary"
								/>
							)
						}
						label={
							a.calls_instance_id &&
							visibleInstanceIds.includes(a.calls_instance_id) &&
							field.value?.includes(a.id) ? (
								<Link
									fontSize={13}
									color="info"
									onClick={() => goToPage(a.calls_instance_id!, data.tree)}
								>
									{a.text}
								</Link>
							) : (
								<Typography fontSize={13} noWrap>
									{a.text}
								</Typography>
							)
						}
					/>
				</Tooltip>
			))}
		</Stack>
	);
}
