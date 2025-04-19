import { Controller, Form, useForm } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';
import {
	Button,
	Divider,
	Fade,
	FormControl,
	FormControlLabel,
	FormLabel,
	Radio,
	RadioGroup,
	TextField,
	Typography,
} from '@mui/material';
import { ContactSupport, TaskAlt } from '@mui/icons-material';

import { QuestionType } from '../../config/enums';
import { useEffect, useState } from 'react';
import { useAddUpdateQuestion, useCopyQuestion, useDeleteQuestion, useQuestions } from '../../api/queries/page-queries';
import Toolbar from '../common/Toolbar';
import * as actions from '../../state/checklist/actions';
import ConfirmationDialog from '../common/ConfirmationDialog';
import useStore from '../../state/store';
import * as selectors from '../../state/checklist/selectors';
import { Question } from '../../types';

function getDefaults(question: Question): Omit<Question, 'answers'> {
	let formattedQuestion = JSON.parse(JSON.stringify(question));
	delete formattedQuestion.answers;
	return formattedQuestion;
}

export default function FormQuestion() {
	const selectedQuestionData = useStore(useShallow(selectors.selectedQuestionData));
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const { isPending: updating, mutateAsync: addUpdateQuestion } = useAddUpdateQuestion(selectedPageInfo.pageId);
	const { isPending: copying, mutateAsync: copyQuestion } = useCopyQuestion(
		selectedPageInfo.pageId,
		selectedQuestionData.id
	);
	const { isPending: deleting, mutateAsync: deleteQuestion } = useDeleteQuestion(selectedQuestionData.id);
	const { isFetching: refetching, refetch } = useQuestions(selectedPageInfo.pageId, false, actions.updatePage);

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

	const [showUpdateMsg, setShowUpdateMsg] = useState(false);
	let isPlaceholder = selectedQuestionData.id === -1;
	let inTransition = copying || updating || deleting || refetching;

	const onSubmit = handleSubmit(async (data) => {
		try {
			let newQuestion = await addUpdateQuestion({ question: data });
			await refetch();
			actions.updateSelectedQuestion(newQuestion.id);
			setShowUpdateMsg(true);
			setTimeout(() => setShowUpdateMsg(false), 1000);
		} catch (e) {
			console.error(e);
		}
	});

	const onCopy = async () => {
		try {
			let newQuestion = await copyQuestion();
			await refetch();
			actions.updateSelectedQuestion(newQuestion.id);
		} catch (e) {
			console.error(e);
		}
	};

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
	}, [selectedQuestionData, selectedPageInfo.pageId]);

	return (
		<>
			<Toolbar
				left={
					<>
						<ContactSupport sx={styles.toolbar} />
						<Typography fontSize={20}>
							p{selectedPageInfo.pageId}.q{isPlaceholder ? '?' : selectedQuestionData.id}
						</Typography>
						<Fade in={showUpdateMsg} timeout={500}>
							<div style={{ marginLeft: 10 }} className="flex-row-left">
								<TaskAlt sx={{ color: 'success.main', marginRight: '5px' }} />
								<Typography color="success" fontStyle="italic">
									Saved!
								</Typography>
							</div>
						</Fade>
					</>
				}
				leftWidth="60%"
				right={
					<>
						{!isPlaceholder && (
							<>
								<Button
									disabled={inTransition}
									variant="contained"
									color="error"
									onClick={() => {
										if (selectedQuestionData.answers?.length) {
											setShowDeleteDialog(true);
										} else {
											onDelete();
										}
									}}
									sx={{ height: 25, marginRight: '10px' }}
								>
									Delete
								</Button>
								<Button
									disabled={inTransition}
									variant="contained"
									color="secondary"
									onClick={onCopy}
									sx={{ height: 25, marginRight: '10px' }}
								>
									Copy
								</Button>
							</>
						)}
						<Button onClick={onSubmit} disabled={inTransition} variant="contained" sx={{ height: 25 }}>
							{isPlaceholder ? 'Add' : 'Save'}
						</Button>
					</>
				}
				rightWidth="40%"
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
								label="Question text"
								placeholder="e.g. What is the cause of loss?"
								variant="outlined"
								{...field}
								error={!!errors.text}
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
								label="Question description (optional)"
								placeholder="e.g. Describe how the damage occurred"
								variant="outlined"
								{...field}
								value={field.value ?? ''}
								sx={{ ...styles.textFieldOverrides, width: 400 }}
								style={styles.item}
							/>
						)}
					/>
				</div>
				<div style={styles.row} className="flex-row-left">
					<Controller
						name="type"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<FormControl style={styles.item}>
								<FormLabel sx={styles.formLabel} error={!!errors.type}>
									Question type
								</FormLabel>
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
										label="Dropdown"
										value={QuestionType.DROPDOWN}
									/>
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
