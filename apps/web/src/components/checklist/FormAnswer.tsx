'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import useStore, { useChecklistSlice } from '@/state/store';
import { useShallow } from 'zustand/react/shallow';
import * as selectors from '@/state/checklist/selectors';
import { Answer } from '@/types/types';
import {
	Button,
	Checkbox,
	Collapse,
	Divider,
	Fade,
	FormControl,
	FormLabel,
	MenuItem,
	Select,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material';
import { QuestionType } from '@/config/enums';
import { useEffect, useState } from 'react';
import { InsertComment, TaskAlt } from '@mui/icons-material';
import Toolbar from '../common/Toolbar';
import * as actions from '@/state/checklist/actions';
import { useAnswerTrpc } from '@/hooks/trpc/useAnswerTrpc';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { getPageInstancesFromTree } from '@/lib/utils/utils';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useSelectedQuestionData } from '@/hooks/useSelectedQuestionData';
import { useSelectedAnswerData } from '@/hooks/useSelectedAnswerData';

export default function FormAnswer() {
	const { checklistId = -1, claimId } = useChecklistParams();
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion) ?? -1;
	const selectedQuestionData = useSelectedQuestionData();
	const selectedAnswerData = useSelectedAnswerData();

	const { create, copy, remove, update } = useAnswerTrpc();
	const { isPending: adding, mutateAsync: addAnswer } = create;
	const { isPending: updating, mutateAsync: updateAnswer } = update;
	const { isPending: copying, mutateAsync: copyAnswer } = copy;
	const { isPending: deleting, mutateAsync: deleteAnswer } = remove;
	const { isFetching: refetching } = useQuestionTrpc().list({
		pageId: selectedPageInfo.pageId,
	});
	const { data: navigation = { tree: [], maxPosition: 0 } } = usePageTrpc().getInstanceTree(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 }
	);

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

	const [showUpdateMsg, setShowUpdateMsg] = useState(false);
	const hasAdditionalInfo = watch('has_additional_info');
	const pageInstanceOptions = getPageInstancesFromTree(navigation.tree, selectedPageInfo.instanceId);
	let isPlaceholder = selectedAnswerData.id === -1;
	let isFreeform = selectedQuestionData.type === QuestionType.FREEFORM;
	let inTransition = adding || copying || updating || deleting || refetching;
	let scopedQuestionId = `p${selectedPageInfo.pageId}.q${selectedQuestion}`;

	useEffect(() => {
		reset({ ...selectedAnswerData });
	}, [selectedAnswerData]);

	const onSubmit = handleSubmit(async (data) => {
		try {
			let newAnswer =
				selectedAnswerData.id === -1
					? await addAnswer({
							questionId: selectedQuestion,
							pageId: selectedPageInfo.pageId,
							params: data,
					  })
					: await updateAnswer({
							pageId: selectedPageInfo.pageId,
							answerId: selectedAnswerData.id,
							params: data,
					  });
			if (newAnswer) actions.updateSelectedAnswer(newAnswer.question_id, newAnswer.id);
			setShowUpdateMsg(true);
			setTimeout(() => setShowUpdateMsg(false), 1000);
		} catch (e) {
			console.error(e);
		}
	});

	const onCopy = async () => {
		try {
			let newAnswer = await copyAnswer({
				questionId: selectedQuestion,
				answerId: selectedAnswerData.id,
				pageId: selectedPageInfo.pageId,
			});
			if (newAnswer) actions.updateSelectedAnswer(newAnswer.question_id, newAnswer.id);
		} catch (e) {
			console.error(e);
		}
	};

	const onDelete = async () => {
		try {
			await deleteAnswer({ answerId: selectedAnswerData.id, pageId: selectedPageInfo.pageId });
			actions.updateSelectedAnswer(selectedQuestion, null); // TODO
		} catch (e) {
			console.error(e);
		}
	};

	const getPositionOptions = () => {
		let options: number[] = [];
		let limit = selectedQuestionData.answers?.length ?? 0;
		if (isPlaceholder) limit += 1;
		for (let i = 1; i <= limit; i++) {
			options.push(i);
		}
		return options;
	};

	return (
		<>
			<Toolbar
				left={
					<>
						<InsertComment sx={styles.toolbar} />
						<Typography lineHeight={'21px'} fontSize={19}>
							p{selectedPageInfo.pageId}.q{selectedQuestion}.a
							{isPlaceholder ? '?' : selectedAnswerData.id}
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
											color="warning"
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
			<Fade key={selectedAnswerData.id} in={!!selectedAnswerData.id} timeout={500} unmountOnExit>
				<Form control={control} style={{ width: '100%' }}>
					<div style={styles.row} className="flex-row-left">
						<Controller
							name="text"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<TextField
									label="Answer text"
									placeholder="e.g. Water Damage"
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
									label="Answer description (optional)"
									placeholder="e.g. Damage as a result of leaks or condensation"
									variant="outlined"
									{...field}
									value={field.value ?? ''}
									sx={{ ...styles.textFieldOverrides, width: 400 }}
									style={styles.item}
								/>
							)}
						/>
					</div>
					<div style={{ ...styles.row, height: 55 }} className="flex-row-left">
						<Controller
							name="grade"
							control={control}
							render={({ field }) => (
								<TextField
									label="Grade (optional)"
									placeholder="e.g. 1.1"
									variant="outlined"
									type="number"
									{...field}
									value={field.value ?? ''}
									sx={{ ...styles.textFieldOverrides, width: 120 }}
									style={styles.item}
								/>
							)}
						/>

						<Controller
							name="position"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<FormControl style={{ padding: '0px 5px 15px' }}>
									<FormLabel sx={styles.formLabel}>Order</FormLabel>
									<Select
										variant="outlined"
										error={!!errors.position}
										{...field}
										sx={{ ...styles.textFieldOverrides, width: 50 }}
									>
										{getPositionOptions().map((o) => (
											<MenuItem key={o} value={o}>
												{o}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}
						/>

						<Controller
							name="calls_instance_id"
							control={control}
							render={({ field }) => (
								<FormControl style={{ padding: '0px 5px 15px' }}>
									<FormLabel sx={styles.formLabel}>Calls page (optional)</FormLabel>
									<Select
										variant="outlined"
										error={!!errors.calls_instance_id}
										{...field}
										sx={styles.textFieldOverrides}
									>
										{pageInstanceOptions
											.sort((a, b) => a.pageId - b.pageId)
											.map((o) => (
												<MenuItem key={o.instanceId} value={o.instanceId}>
													p{o.pageId}.i{o.instanceId}
												</MenuItem>
											))}
									</Select>
								</FormControl>
							)}
						/>
					</div>
					<div style={{ ...styles.row, height: 40 }} className="flex-row-left">
						<Controller
							name="has_additional_info"
							control={control}
							render={({ field }) => (
								<FormControl style={styles.item}>
									<div className="flex-row-left">
										<Checkbox
											{...field}
											onChange={(e) => field.onChange(e.target.checked)}
											checked={Boolean(field?.value)}
											sx={{ width: 35, height: 35 }}
										/>
										<FormLabel sx={{ fontSize: 12 }}>Requires additional info...</FormLabel>
									</div>
								</FormControl>
							)}
						/>
					</div>

					<Collapse in={hasAdditionalInfo}>
						<div style={styles.row} className="flex-row-left">
							<Controller
								name="additional_info_placeholder"
								control={control}
								render={({ field }) => (
									<TextField
										label="Free-form placeholder (optional)"
										placeholder="e.g. Please list"
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
										placeholder="e.g. 2"
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
					</Collapse>
				</Form>
			</Fade>
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
		borderRadius: 0,
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
		color: 'secondary.main',
		fontSize: 20,
		marginRight: '5px',
	},
};
