'use client';
import { Box, MenuItem, Select, Tooltip, Typography } from '@mui/material';
import { Question } from '@/types/types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';

// Component to display a dropdown menu item with its attached image
function DropdownAnswerItem(props: { answer: any }) {
	const { answer: a } = props;

	// Fetch attached image for this answer
	const { data: attachedImages = [] } = useDocTrpc().listDocs(
		{
			filters: { answer_id: a.id },
		},
		{ enabled: a.id !== -1 }
	);

	const attachedImage = attachedImages.length > 0 ? attachedImages[0] : null;

	return (
		<Tooltip title={a.description_text ?? ''} placement="right" arrow>
			<Box display="flex" alignItems="center" gap={0.5} width="100%">
				<Typography fontSize={13}>{a.text}</Typography>
				{attachedImage && (
					<ImageTooltip
						imageUrl={`/api/download?docId=${attachedImage.id}`}
						description={attachedImage.title ?? undefined}
					/>
				)}
			</Box>
		</Tooltip>
	);
}

export default function ChecklistAnswerDropdown(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
	disabled?: boolean;
}) {
	const { field, question, disabled } = props;
	return (
		<Select
			variant="outlined"
			displayEmpty
			{...field}
			value={field.value ?? ''}
			onChange={(e) => {
				const value = e.target.value;
				field.onChange([value]);
			}}
			renderValue={(value) => {
				return question.answers.find((a) => a.id === +value?.[0])?.text ?? 'Choose an answer';
			}}
			sx={{
				width: 300,
				marginTop: '5px',
				marginLeft: '10px',
				padding: '2px 10px',
				'& .MuiInputBase-root': {
					padding: '2px 5px',
				},
				'& .MuiOutlinedInput-input': {
					fontSize: 13,
					padding: '2px 5px',
				},
			}}
			disabled={disabled}
		>
			{question.answers.map((a) => (
				<MenuItem key={a.id} value={a.id}>
					<DropdownAnswerItem answer={a} />
				</MenuItem>
			))}
		</Select>
	);
}
