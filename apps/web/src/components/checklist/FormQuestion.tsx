'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';
import {
	Button,
	Divider,
	Fade,
	FormControl,
	FormControlLabel,
	FormLabel,
	MenuItem,
	Radio,
	RadioGroup,
	Select,
	TextField,
	Typography,
} from '@mui/material';
import { ContactSupport, TaskAlt } from '@mui/icons-material';

import { QuestionType } from '@/config/enums';
import { useEffect, useState } from 'react';
import Toolbar from '../common/Toolbar';
import * as actions from '@/state/checklist/actions';
import ConfirmationDialog from '../common/ConfirmationDialog';
import useStore from '@/state/store';
import * as selectors from '@/state/checklist/selectors';
import { Question } from '@/types/types';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useSelectedQuestionData } from '@/hooks/useSelectedQuestionData';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

function getDefaults(question: Question): Omit<Question, 'answers'> {
	const formattedQuestion = JSON.parse(JSON.stringify(question));
	delete formattedQuestion.answers;
	return formattedQuestion;
}

export default function FormQuestion() {
	const selectedQuestionData = useSelectedQuestionData();
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const { data: pageTemplates = [] } = usePageTrpc().listTemplates();

	const { create, copy, list, remove, update } = useQuestionTrpc();
	const { isPending: adding, mutateAsync: addQuestion } = create;
	const { isPending: updating, mutateAsync: updateQuestion } = update;
	const { isPending: copying, mutateAsync: copyQuestion } = copy;
	const { isPending: deleting, mutateAsync: deleteQuestion } = remove;
	const { isFetching: refetchingQuestions } = list({ pageId: selectedPageInfo.pageId });

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

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showUpdateMsg, setShowUpdateMsg] = useState(false);
	const isPlaceholder = selectedQuestionData.id === -1;
	const inTransition = adding || copying || updating || deleting || refetchingQuestions;

	const onSubmit = handleSubmit(async (data) => {
		try {
			const newQuestion =
				selectedQuestionData.id === -1
					? await addQuestion({ pageId: selectedPageInfo.pageId, params: data })
					: await updateQuestion({
							questionId: selectedQuestionData.id,
							pageId: selectedPageInfo.pageId,
							params: data,
					  });
			if (newQuestion.page_id === selectedPageInfo.pageId) {
				actions.updateSelectedQuestion(newQuestion.id);
			}
			setShowUpdateMsg(true);
			setTimeout(() => setShowUpdateMsg(false), 1000);
		} catch (e) {
			console.error(e);
		}
	});

	const onCopy = async () => {
		try {
			const newQuestion = await copyQuestion({
				questionId: selectedQuestionData.id,
				pageId: selectedPageInfo.pageId,
			});
			actions.updateSelectedQuestion(newQuestion.id);
		} catch (e) {
			console.error(e);
		}
	};

	const onDelete = async () => {
		try {
			await deleteQuestion({
				questionId: selectedQuestionData.id,
				pageId: selectedPageInfo.pageId,
			});
			actions.updateSelectedQuestion(null);
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
								<TaskAlt sx={{ color: 'warning.main', marginRight: '5px' }} />
								<Typography color="warning" fontStyle="italic">
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
									color="warning"
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
						<Button
							onClick={onSubmit}
							color="primary"
							disabled={inTransition}
							variant="contained"
							sx={{ height: 25 }}
						>
							{isPlaceholder ? 'Add' : 'Save'}
						</Button>
					</>
				}
				rightWidth="40%"
			/>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Fade key={selectedQuestionData.id} in={!!selectedQuestionData.id} timeout={500} unmountOnExit>
				<Form control={control} style={{ width: '100%' }}>
					<div style={styles.row} className="flex-row-left">
						<Controller
							name="page_id"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<FormControl style={{ padding: '0px 5px 15px' }}>
									<FormLabel sx={styles.formLabel}>Assigned page</FormLabel>
									<Select error={!!errors.page_id} {...field} sx={styles.textFieldOverrides}>
										{pageTemplates.map((o) => (
											<MenuItem key={o.id} value={o.id}>
												{o.title} (p{o.id})
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}
						/>
					</div>
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
										<FormControlLabel
											control={<Radio />}
											label="Multi"
											value={QuestionType.MULTI}
										/>
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
			</Fade>

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
		paddingLeft: '10px',
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
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '3px 5px',
		},
	},
	toolbar: {
		color: 'secondary.main',
		fontSize: 20,
		marginRight: '5px',
	},
};
