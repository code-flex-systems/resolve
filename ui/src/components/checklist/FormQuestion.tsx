import { Controller, Form, useForm } from 'react-hook-form';
import useStore, { useChecklistSlice } from '../../state/store';
import { useShallow } from 'zustand/react/shallow';
import * as selectors from '../../state/checklist/selectors';
import { Question } from '../../types';
import {
	Button,
	Divider,
	FormControl,
	FormControlLabel,
	FormLabel,
	Radio,
	RadioGroup,
	TextField,
	Typography,
} from '@mui/material';
import { QuestionType } from '../../config/enums';
import { useEffect, useState } from 'react';
import { useAddUpdateQuestion, useDeleteQuestion, useQuestions } from '../../api/queries/page-queries';
import Toolbar from '../common/Toolbar';
import { Description } from '@mui/icons-material';
import * as actions from '../../state/checklist/actions';
import ConfirmationDialog from '../common/ConfirmationDialog';

function getDefaults(question: Question): Omit<Question, 'answers'> {
	let formattedQuestion = JSON.parse(JSON.stringify(question));
	delete formattedQuestion.answers;
	return formattedQuestion;
}

export default function FormQuestion() {
	const selectedPage = useChecklistSlice((state) => state.selectedPage) ?? -1;
	const selectedQuestionData = useStore(useShallow(selectors.selectedQuestionData));
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const { isPending: updating, mutateAsync: addUpdateQuestion } = useAddUpdateQuestion(selectedPage);
	const { isPending: deleting, mutateAsync: deleteQuestion } = useDeleteQuestion(selectedQuestionData.id);
	const { isFetching: refetching, refetch } = useQuestions(selectedPage, false, actions.updatePage);
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<Omit<Question, 'answers'>>({
		defaultValues: {
			...getDefaults(selectedQuestionData),
		},
	});
	let isPlaceholder = selectedQuestionData.id === -1;
	let inTransition = updating || deleting || refetching;

	const onSubmit = handleSubmit(async (data) => {
		try {
			let newQuestion = await addUpdateQuestion({ question: data });
			await refetch();
			actions.updateSelectedQuestion(newQuestion.id);
		} catch (e) {
			console.error(e);
		}
	});

	const onDelete = async () => {
		try {
			await deleteQuestion();
			actions.updateSelectedQuestion(null);
			await refetch();
		} catch (e) {
			console.error(e);
		}
	};

	useEffect(() => {
		reset({ ...getDefaults(selectedQuestionData) });
	}, [selectedQuestionData, selectedPage]);

	return (
		<>
			<Toolbar
				left={
					<>
						<Description sx={styles.toolbar} />
						<Typography fontSize={20}>Page 2</Typography>
					</>
				}
				right={
					<>
						{!isPlaceholder && (
							<Button
								disabled={inTransition}
								variant="contained"
								color="error"
								onClick={() => {
									if (selectedQuestionData.answers.length) {
										setShowDeleteDialog(true);
									} else {
										onDelete();
									}
								}}
								sx={{ height: 25, marginRight: '10px' }}
							>
								Delete
							</Button>
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
						name="q_text"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<TextField
								label="Question text"
								placeholder="e.g. "
								variant="outlined"
								{...field}
								error={!!errors.q_text}
								sx={styles.textFieldOverrides}
								style={styles.item}
							/>
						)}
					/>

					<Controller
						name="q_desc"
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
				<div style={styles.row} className="flex-row-left">
					<Controller
						name="q_type"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<FormControl style={styles.item}>
								<FormLabel error={!!errors.q_type}>Question type</FormLabel>
								<RadioGroup {...field} row>
									<FormControlLabel
										defaultChecked
										control={<Radio />}
										label="Single"
										value={QuestionType.SINGLE}
									/>
									<FormControlLabel control={<Radio />} label="Multi" value={QuestionType.MULTI} />
									<FormControlLabel
										control={<Radio />}
										label="Free-form"
										value={QuestionType.FREEFORM}
									/>
								</RadioGroup>
							</FormControl>
						)}
					/>
				</div>
			</Form>

			{showDeleteDialog && (
				<ConfirmationDialog
					onConfirm={() => {
						setShowDeleteDialog(false);
						onDelete().catch((e) => console.error(e));
					}}
					onClose={() => setShowDeleteDialog(false)}
					negative
				>
					<Typography>
						Deleting this question will also delete its <b>{selectedQuestionData.answers.length}</b>{' '}
						answers.
					</Typography>
				</ConfirmationDialog>
			)}
		</>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
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
