'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import {
	Box,
	Button,
	Divider,
	Fade,
	FormControl,
	FormControlLabel,
	FormLabel,
	Grid,
	IconButton,
	InputAdornment,
	MenuItem,
	Radio,
	RadioGroup,
	Select,
	TextField,
	Typography,
} from '@mui/material';
import Check from '@mui/icons-material/Check';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import CheckCircle from '@mui/icons-material/CheckCircle';
import TaskAlt from '@mui/icons-material/TaskAlt';
import HelpOutline from '@mui/icons-material/HelpOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import Close from '@mui/icons-material/Close';

import { QuestionType } from '@/config/enums';
import { useEffect, useMemo, useState } from 'react';
import Toolbar from '../common/Toolbar';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import { Question } from '@/types/types';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useSelectedQuestionData } from '@/hooks/useSelectedQuestionData';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import BasicButtonStyled from '../common/BasicButtonStyled';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import DocumentSelectorDialog from '../admin/DocumentSelectorDialog';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';
import DocumentIconWithPreview from '../common/DocumentIconWithPreview';

function getDefaults(question: Question): Omit<Question, 'answers'> {
	const formattedQuestion = JSON.parse(JSON.stringify(question));
	delete formattedQuestion.answers;
	return formattedQuestion;
}

export default function FormQuestion() {
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const [showDocSelector, setShowDocSelector] = useState(false);
	const [attachedDoc, setAttachedDoc] = useState<DocListItem | null>(null);

	const selectedQuestionData = useSelectedQuestionData();
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const updateSelectedQuestion = useChecklistStore((state) => state.updateSelectedQuestion);
	const { data: pageTemplates = [] } = usePageTrpc().listTemplates();

	const { create, copy, list, remove, update } = useQuestionTrpc();
	const { isPending: adding, mutateAsync: addQuestion } = create;
	const { isPending: updating, mutateAsync: updateQuestion } = update;
	const { isPending: copying, mutateAsync: copyQuestion } = copy;
	const { isPending: deleting, mutateAsync: deleteQuestion } = remove;
	const { data: questions, isFetching: refetchingQuestions } = list({ pageId: selectedPageInfo.pageId });

	// Fetch attached document for current question
	const { data: attachedDocs = [] } = useDocTrpc().listDocs({
		filters: { question_id: selectedQuestionData.id },
	}, { enabled: selectedQuestionData.id !== -1 });

	const { mutateAsync: updateDoc } = useDocTrpc().updateDoc;

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty, isValid, isSubmitting },
		watch,
	} = useForm<Omit<Question, 'answers'>>({
		defaultValues: {
			...getDefaults(selectedQuestionData),
		},
		mode: 'onChange',
	});
	const questionText = watch('text');

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showUpdateMsg, setShowUpdateMsg] = useState(false);
	const isPlaceholder = selectedQuestionData.id === -1;
	const inTransition = isSubmitting || adding || copying || updating || deleting || refetchingQuestions;

	const onSubmit = handleSubmit(async (data) => {
		try {
			// Extract only the fields needed for QuestionParams/QuestionUpdateParams
			// Note: type needs to be cast to QuestionType enum
			const params = {
				text: data.text,
				type: data.type as QuestionType,
				position: data.position,
				description_text: data.description_text,
				description_image_url: data.description_image_url,
				placeholder: data.placeholder,
				page_id: data.page_id,
				hidden: data.hidden,
				id: data.id,
			};
			const newQuestion =
				selectedQuestionData.id === -1
					? await addQuestion({ pageId: selectedPageInfo.pageId, params })
					: await updateQuestion({
							questionId: selectedQuestionData.id,
							pageId: selectedPageInfo.pageId,
							params,
						});
			if (newQuestion.page_id === selectedPageInfo.pageId) {
				updateSelectedQuestion(newQuestion.id);
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
			updateSelectedQuestion(newQuestion.id);
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
			updateSelectedQuestion(null);
		} catch (e) {
			console.error(e);
		}
	};

	const onCopyText = (field: string, text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2000);
	};

	const handleSelectDocument = async (doc: DocListItem) => {
		// Unlink the previous document first if there is one
		if (attachedDoc && attachedDoc.id !== doc.id) {
			try {
				await updateDoc({
					docId: attachedDoc.id,
					params: { question_id: null },
				});
			} catch (e) {
				console.error('Failed to unlink previous document:', e);
				// Continue anyway - the new document will be linked
			}
		}
		setAttachedDoc(doc);
		setShowDocSelector(false);
	};

	const handleRemoveDocument = async () => {
		if (!attachedDoc) return;
		try {
			// Unlink the document instead of deleting it
			await updateDoc({
				docId: attachedDoc.id,
				params: { question_id: null },
			});
			setAttachedDoc(null);
		} catch (e) {
			console.error(e);
			alert('Failed to remove document attachment');
		}
	};

	useEffect(() => {
		reset({ ...getDefaults(selectedQuestionData) });
	}, [selectedQuestionData, selectedPageInfo.pageId]);

	// Sync attached document when docs are fetched
	useEffect(() => {
		if (attachedDocs.length > 0) {
			setAttachedDoc(attachedDocs[0]); // Only support one document per question
		} else {
			setAttachedDoc(null);
		}
	}, [attachedDocs]);

	const positionOptions = useMemo(() => {
		const options: number[] = [];
		let limit = questions?.length ?? 0;
		if (isPlaceholder) limit += 1;
		for (let i = 1; i <= limit; i++) {
			options.push(i);
		}
		return options;
	}, [questions, isPlaceholder]);

	return (
		<>
			<Toolbar
				left={
					<>
						<HelpOutline sx={{ color: theme.palette.secondary.main, marginRight: '10px' }} />
						<Typography color="secondary" lineHeight={'21px'} fontSize={17} minWidth={200}>
							{questionText === '' && isPlaceholder ? 'New question' : questionText} (p
							{selectedPageInfo.pageId}.q
							{isPlaceholder ? '?' : selectedQuestionData.id})
						</Typography>
						<Fade in={showUpdateMsg} timeout={500}>
							<div style={{ marginLeft: 10 }} className="flex-row-left">
								<TaskAlt sx={{ color: theme.palette.success.light, marginRight: '5px' }} />
								<Typography color={theme.palette.success.light}>Saved!</Typography>
							</div>
						</Fade>
					</>
				}
				leftWidth="60%"
				right={
					<>
						{!isPlaceholder && (
							<>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => {
											if (selectedQuestionData.answers?.length) {
												setShowDeleteDialog(true);
											} else {
												onDelete();
											}
										},
										disabled: inTransition,
										sx: { height: 25, marginRight: '10px' },
										startIcon: <Delete />,
									}}
								>
									Delete
								</BasicButtonStyled>
								<BasicButtonStyled
									buttonProps={{
										onClick: onCopy,
										disabled: inTransition,
										sx: { height: 25, marginRight: '10px' },
										startIcon: <ContentCopy />,
									}}
								>
									Copy
								</BasicButtonStyled>
							</>
						)}
						<BasicButtonStyled
							buttonProps={{
								onClick: onSubmit,
								disabled: inTransition || (isPlaceholder ? !isValid : !isDirty),
								color: 'primary',
								sx: { height: 25 },
								startIcon: <CheckCircle />,
							}}
						>
							{isPlaceholder ? 'Add' : 'Save'}
						</BasicButtonStyled>
					</>
				}
				rightWidth="40%"
				height={60}
				padding={'10px 0px'}
			/>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Fade key={selectedQuestionData.id} in={!!selectedQuestionData.id} timeout={500} unmountOnExit>
				<Form control={control} style={styles.form}>
					<Grid container>
						<Grid container alignItems="center">
							<Grid margin="5px">
								<Controller
									name="page_id"
									control={control}
									rules={{ required: true }}
									render={({ field }) => (
										<FormControl style={{ padding: '0px 5px' }}>
											<FormLabel sx={styles.formLabel}>Assigned page</FormLabel>
											<Select
												error={!!errors.page_id}
												{...field}
												renderValue={(value) => {
													if (value === 0) return 'None';
													const option = pageTemplates.find((o) => o.id === value);
													return option
														? `${option.title} (p${option.id})`
														: 'Choose a template';
												}}
												sx={{ ...styles.textFieldOverrides, height: 35 }}
											>
												{pageTemplates.map((o) => (
													<MenuItem key={o.id} value={o.id}>
														<Typography fontSize={13}>
															{o.title} (p{o.id})
														</Typography>
													</MenuItem>
												))}
											</Select>
										</FormControl>
									)}
								/>
							</Grid>
							<Grid margin="5px">
								<Controller
									name="position"
									control={control}
									rules={{ required: true }}
									render={({ field }) => (
										<FormControl style={{ padding: '0px 5px' }}>
											<FormLabel sx={styles.formLabel}>Order</FormLabel>
											<Select
												variant="outlined"
												error={!!errors.position}
												{...field}
												sx={{ ...styles.textFieldOverrides, width: 80, height: 35 }}
											>
												{positionOptions.map((o) => (
													<MenuItem key={o} value={o}>
														{o}
													</MenuItem>
												))}
											</Select>
										</FormControl>
									)}
								/>
							</Grid>
						</Grid>

						<Grid container alignItems="center">
							<Grid margin="5px">
								<Controller
									name="text"
									control={control}
									rules={{ required: true }}
									render={({ field }) => (
										<TextField
											label="Question text"
											placeholder="What is the cause of loss?"
											variant="outlined"
											{...field}
											slotProps={{
												input: {
													endAdornment: (
														<InputAdornment position="end">
															<IconButton
																disableRipple
																onClick={() => onCopyText(field.name, field.value)}
															>
																{copiedField === field.name ? (
																	<Check
																		sx={{ color: theme.palette.success.light }}
																	/>
																) : (
																	<ContentCopy sx={{ color: BASE_COLOR_LIGHT }} />
																)}
															</IconButton>
														</InputAdornment>
													),
												},
											}}
											error={!!errors.text}
											sx={styles.textFieldOverrides}
											style={styles.item}
										/>
									)}
								/>
							</Grid>

							<Grid margin="5px">
								<Controller
									name="description_text"
									control={control}
									render={({ field }) => (
										<TextField
											label="Question description (optional)"
											placeholder="Describe how the damage occurred"
											variant="outlined"
											{...field}
											slotProps={{
												input: {
													endAdornment: (
														<InputAdornment position="end">
															<IconButton
																disableRipple
																onClick={() =>
																	onCopyText(field.name, field.value ?? '')
																}
															>
																{copiedField === field.name ? (
																	<Check
																		sx={{ color: theme.palette.success.light }}
																	/>
																) : (
																	<ContentCopy sx={{ color: BASE_COLOR_LIGHT }} />
																)}
															</IconButton>
														</InputAdornment>
													),
												},
											}}
											value={field.value ?? ''}
											sx={{ ...styles.textFieldOverrides, width: 400 }}
											style={styles.item}
										/>
									)}
								/>
							</Grid>
						</Grid>

						<Grid margin="5px">
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
						</Grid>

						{/* Document attachment section */}
						<Box display="flex" alignItems="center" margin="5px" gap={1}>
							<Button
								variant="outlined"
								size="small"
								startIcon={<AttachFileIcon />}
								onClick={() => setShowDocSelector(true)}
								disabled={inTransition || isPlaceholder}
								sx={{ height: 30 }}
							>
								{attachedDoc ? 'Change Document' : 'Add Document...'}
							</Button>
							{attachedDoc && (
								<Box display="flex" alignItems="center" gap={1} bgcolor="#f5f5f5" p={1} borderRadius={1}>
									<Typography fontSize={12} color="text.secondary">
										{attachedDoc.title || attachedDoc.alias}
									</Typography>
									{attachedDoc.mime_type?.startsWith('image/') ? (
										<ImageTooltip
											imageUrl={`/api/download?docId=${attachedDoc.id}`}
											description={attachedDoc.title ?? undefined}
										/>
									) : (
										<DocumentIconWithPreview document={attachedDoc} />
									)}
									<IconButton
										size="small"
										onClick={handleRemoveDocument}
										disabled={inTransition}
										sx={{ ml: 0.5, padding: 0.5 }}
									>
										<Close sx={{ fontSize: 16 }} />
									</IconButton>
								</Box>
							)}
						</Box>
					</Grid>
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

			{showDocSelector && (
				<DocumentSelectorDialog
					onClose={() => setShowDocSelector(false)}
					onSelectDocument={handleSelectDocument}
					filterByType="all"
					title="Add Document to Question"
					relationshipData={{ question_id: selectedQuestionData.id }}
				/>
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
	form: {
		width: '100%',
		paddingTop: 10,
	},
	formLabel: {
		zIndex: 100,
		backgroundColor: 'white',
		position: 'absolute',
		marginLeft: '10px',
		padding: '1px 5px',
		fontSize: 12,
		top: -10,
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
			paddingTop: '3px',
			paddingBottom: '3px',
		},
		'& .MuiOutlinedInput-input': {
			paddingTop: '3px',
			paddingBottom: '3px',
			overflow: 'auto',
		},
	},
	toolbar: {
		color: 'secondary.main',
		fontSize: 20,
		marginRight: '5px',
	},
};
