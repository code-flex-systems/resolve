import { Controller, Form, useForm } from 'react-hook-form';
import useStore, { useChecklistSlice } from '../../state/store';
import { useShallow } from 'zustand/react/shallow';
import * as selectors from '../../state/checklist/selectors';
import { Answer } from '../../types';
import {
	Button,
	Collapse,
	Divider,
	FormControl,
	FormControlLabel,
	FormLabel,
	Radio,
	RadioGroup,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material';
import { AnswerType, QuestionType } from '../../config/enums';
import { useEffect } from 'react';
import { InsertComment } from '@mui/icons-material';
import Toolbar from '../common/Toolbar';
import { useAddUpdateAnswer, useCopyAnswer, useDeleteAnswer, useQuestions } from '../../api/queries/page-queries';
import * as actions from '../../state/checklist/actions';

export default function FormAnswer() {
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion) ?? -1;
	const selectedQuestionData = useStore(useShallow(selectors.selectedQuestionData));
	const selectedAnswerData = useStore(useShallow(selectors.selectedAnswerData));
	const { isPending: updating, mutateAsync: addUpdateAnswer } = useAddUpdateAnswer(selectedQuestion);
	const { isPending: copying, mutateAsync: copyAnswer } = useCopyAnswer(selectedQuestion, selectedAnswerData.id);
	const { isPending: deleting, mutateAsync: deleteAnswer } = useDeleteAnswer(selectedAnswerData.id);
	const { isFetching: refetching, refetch } = useQuestions(selectedPageInfo.pageId, false, actions.updatePage);
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
		watch,
	} = useForm<Answer>({
		defaultValues: {
			...selectedAnswerData,
		},
	});
	let isPlaceholder = selectedAnswerData.id === -1;
	let isFreeform = selectedQuestionData.type === QuestionType.FREEFORM;
	let inTransition = copying || updating || deleting || refetching;
	let scopedQuestionId = `p${selectedPageInfo.pageId}.q${selectedQuestion}`;

	const onSubmit = handleSubmit(async (data) => {
		try {
			let newAnswer = await addUpdateAnswer({ answer: data });
			await refetch();
			actions.updateSelectedAnswer(selectedQuestion, newAnswer.id);
		} catch (e) {
			console.error(e);
		}
	});

	const onCopy = async () => {
		try {
			let newAnswer = await copyAnswer();
			await refetch();
			actions.updateSelectedAnswer(selectedQuestion, newAnswer.id);
		} catch (e) {
			console.error(e);
		}
	};

	const onDelete = async () => {
		try {
			await deleteAnswer();
			actions.updateSelectedAnswer(selectedQuestion, null);
			await refetch();
		} catch (e) {
			console.error(e);
		}
	};

	useEffect(() => {
		reset({ ...selectedAnswerData });
	}, [selectedAnswerData]);

	return (
		<>
			<Toolbar
				left={
					<>
						<InsertComment sx={styles.toolbar} />
						<Typography fontSize={20}>
							p{selectedPageInfo.pageId}.q{selectedQuestion}.a
							{isPlaceholder ? '?' : selectedAnswerData.id}
						</Typography>
					</>
				}
				right={
					<>
						{!isPlaceholder && (
							<>
								<Tooltip
									title={
										isFreeform
											? `Question ${scopedQuestionId} is free-form. Please change the question type to remove this answer.`
											: ''
									}
								>
									<span>
										<Button
											disabled={inTransition || isFreeform}
											variant="contained"
											color="error"
											onClick={onDelete}
											sx={{ height: 25, marginRight: '10px' }}
										>
											Delete
										</Button>
									</span>
								</Tooltip>
								<Tooltip
									title={
										isFreeform
											? `Question ${scopedQuestionId} is free-form. Please change the question type to copy this answer.`
											: ''
									}
								>
									<span>
										<Button
											disabled={inTransition || isFreeform}
											variant="contained"
											color="secondary"
											onClick={onCopy}
											sx={{ height: 25, marginRight: '10px' }}
										>
											Copy
										</Button>
									</span>
								</Tooltip>
							</>
						)}
						<Button onClick={onSubmit} disabled={inTransition} variant="contained" sx={{ height: 25 }}>
							{isPlaceholder ? 'Add' : 'Save'}
						</Button>
					</>
				}
				padding={0}
			/>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Form control={control} style={{ width: '100%' }}>
				<div style={styles.row} className="flex-row-left">
					<Controller
						name="text"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<TextField
								label="Answer text"
								placeholder="e.g. "
								variant="outlined"
								error={!!errors.text}
								{...field}
								sx={styles.textFieldOverrides}
								style={styles.item}
							/>
						)}
					/>

					<Controller
						name="description_text"
						control={control}
						render={({ field }) => (
							<TextField
								label="Additional info (optional)"
								placeholder="e.g. "
								variant="outlined"
								{...field}
								value={field.value ?? ''}
								sx={styles.textFieldOverrides}
								style={styles.item}
							/>
						)}
					/>
				</div>
				{selectedQuestionData.type === QuestionType.FREEFORM && (
					<div style={styles.row} className="flex-row-left">
						<Controller
							name="additional_info_placeholder"
							control={control}
							render={({ field }) => (
								<TextField
									label="Free-form placeholder (optional)"
									placeholder="e.g. "
									variant="outlined"
									{...field}
									value={field.value ?? ''}
									sx={styles.textFieldOverrides}
									style={styles.item}
								/>
							)}
						/>

						<Controller
							name="additional_info_num_lines"
							control={control}
							render={({ field }) => (
								<TextField
									label="Free-form # of lines (optional)"
									placeholder="e.g. "
									variant="outlined"
									type="number"
									{...field}
									value={field.value ?? ''}
									sx={{ ...styles.textFieldOverrides, width: 200 }}
									style={styles.item}
								/>
							)}
						/>
					</div>
				)}
			</Form>
		</>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
	formLabel: {
		fontSize: 12,
	},
	item: {
		margin: 5,
	},
	row: {
		padding: 5,
	},
	textFieldOverrides: {
		width: 300,
		'& .MuiInputBase-root': {
			borderRadius: 0,
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			borderRadius: 0,
			padding: '3px 5px',
		},
	},
	toolbar: {
		color: 'primary.main',
		fontSize: 20,
		marginRight: '5px',
	},
};
