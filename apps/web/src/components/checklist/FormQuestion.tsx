'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import {
	Box,
	Button,
	FormControlLabel,
	IconButton,
	InputAdornment,
	MenuItem,
	Radio,
	RadioGroup,
	TextField,
	Fade } from '@mui/material';

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
import Card from '@/components/ui/Card';
import DocumentSelectorDialog from '../admin/DocumentSelectorDialog';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';
import DocumentIconWithPreview from '../common/DocumentIconWithPreview';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconCheck, IconCircleCheck, IconCopy, IconHelpCircle, IconPaperclip, IconTrash, IconX } from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';

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
	const { showSuccess, showError } = useCrudAlerts('question');

	const { create, copy, list, remove, update } = useQuestionTrpc();
	const { isPending: adding, mutateAsync: addQuestion } = create;
	const { isPending: updating, mutateAsync: updateQuestion } = update;
	const { isPending: copying, mutateAsync: copyQuestion } = copy;
	const { isPending: deleting, mutateAsync: deleteQuestion } = remove;
	const { data: questions, isFetching: refetchingQuestions } = list({ pageId: selectedPageInfo.pageId });

	// Fetch attached document for current question
	const { data: attachedDocsResult } = useDocTrpc().listDocs(
		{
			filters: { question_id: selectedQuestionData.id },
		},
		{ enabled: selectedQuestionData.id !== -1 }
	);
	const attachedDocs = attachedDocsResult?.rows ?? [];

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
			showSuccess(selectedQuestionData.id === -1 ? 'create' : 'update');
		} catch (e) {
			showError(selectedQuestionData.id === -1 ? 'create' : 'update', e, 'Failed to save question');
		}
	});

	const onCopy = async () => {
		try {
			const newQuestion = await copyQuestion({
				questionId: selectedQuestionData.id,
				pageId: selectedPageInfo.pageId,
			});
			updateSelectedQuestion(newQuestion.id);
			showSuccess('copy');
		} catch (e) {
			showError('copy', e, 'Failed to copy question');
		}
	};

	const onDelete = async () => {
		try {
			await deleteQuestion({
				questionId: selectedQuestionData.id,
				pageId: selectedPageInfo.pageId,
			});
			updateSelectedQuestion(null);
			showSuccess('delete', 'Question deleted');
		} catch (e) {
			showError('delete', e, 'Failed to delete question');
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
			showSuccess('update', 'Attachment removed from question');
		} catch (e) {
			showError('update', e, 'Failed to remove document attachment');
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
		<Box sx={styles.container}>
			<Toolbar
				left={
					<>
						<IconHelpCircle size={20} style={{ color: 'var(--text-accent)', marginRight: '10px' }} />
						<span style={{ color: 'var(--text-accent)', lineHeight: '21px', fontSize: 17 }}>
							{questionText === '' && isPlaceholder ? 'New question' : questionText}
						</span>
						<span style={{ fontSize: 13, color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)", padding: "2px 8px", borderRadius: 8, marginLeft: 8 }}>
							p{selectedPageInfo.pageId}.q{isPlaceholder ? '?' : selectedQuestionData.id}
						</span>
						<Fade in={showUpdateMsg} timeout={500}>
							<Box sx={{ ml: 1.25 }} className="flex-row-left">
								<IconCircleCheck size={20} style={{ color: 'var(--status-success)', marginRight: '5px' }} />
								<span style={{ color: 'var(--status-success)' }}>Saved!</span>
							</Box>
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
										startIcon: <IconTrash size={20} />,
									}}
								>
									Delete
								</BasicButtonStyled>
								<BasicButtonStyled
									buttonProps={{
										onClick: onCopy,
										disabled: inTransition,
										sx: { height: 25, marginRight: '10px' },
										startIcon: <IconCopy size={20} />,
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
								startIcon: <IconCircleCheck size={20} />,
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
			<Box sx={styles.divider}>
				<Divider />
			</Box>
			<Fade key={selectedQuestionData.id} in={!!selectedQuestionData.id} timeout={500} unmountOnExit>
				<Form control={control} style={{ width: '100%' }}>
					<Box sx={styles.formContainer}>
						{/* Basic Information Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Basic Information</div>
							<div style={{ padding: 16 }}>
								<Box sx={styles.fieldRow}>
									<Controller
										name="text"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<TextField
												label="Question text"
												placeholder="What is the cause of loss?"
												variant="outlined"
												fullWidth
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
																		<IconCheck size={20} style={{ color: 'var(--status-success)' }}
																		/>
																	) : (
																		<IconCopy size={20} style={{ color: 'var(--text-muted)' }} />
																	)}
																</IconButton>
																<IconButton
																	disableRipple
																	onClick={() => field.onChange('')}
																	disabled={!field.value}
																>
																	<IconX size={20} style={{ color: 'var(--text-muted)' }} />
																</IconButton>
															</InputAdornment>
														),
													},
												}}
												error={!!errors.text}
											/>
										)}
									/>
								</Box>
								<Box sx={styles.fieldRow}>
									<Controller
										name="description_text"
										control={control}
										render={({ field }) => (
											<TextField
												label="Description (optional)"
												placeholder="Describe how the damage occurred"
												variant="outlined"
												fullWidth
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
																		<IconCheck size={20} style={{ color: 'var(--status-success)' }}
																		/>
																	) : (
																		<IconCopy size={20} style={{ color: 'var(--text-muted)' }} />
																	)}
																</IconButton>
																<IconButton
																	disableRipple
																	onClick={() => field.onChange('')}
																	disabled={!field.value}
																>
																	<IconX size={20} style={{ color: 'var(--text-muted)' }} />
																</IconButton>
															</InputAdornment>
														),
													},
												}}
												value={field.value ?? ''}
												multiline
												minRows={3}
											/>
										)}
									/>
								</Box>
							</div>
						</Card>

						{/* Question Type Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Response Type</div>
							<div style={{ padding: 16 }}>
								<Controller
									name="type"
									control={control}
									rules={{ required: true }}
									render={({ field }) => (
										<RadioGroup {...field} row sx={{ gap: 2 }}>
											<FormControlLabel
												control={<Radio size="small" />}
												label={<span style={{ fontSize: 13 }}>Single select</span>}
												value={QuestionType.SINGLE}
												sx={styles.radioLabel}
											/>
											<FormControlLabel
												control={<Radio size="small" />}
												label={<span style={{ fontSize: 13 }}>Multi select</span>}
												value={QuestionType.MULTI}
												sx={styles.radioLabel}
											/>
											<FormControlLabel
												control={<Radio size="small" />}
												label={<span style={{ fontSize: 13 }}>Dropdown</span>}
												value={QuestionType.DROPDOWN}
												sx={styles.radioLabel}
											/>
											<FormControlLabel
												control={<Radio size="small" />}
												label={<span style={{ fontSize: 13 }}>Free-form text</span>}
												value={QuestionType.FREEFORM}
												sx={styles.radioLabel}
											/>
										</RadioGroup>
									)}
								/>
							</div>
						</Card>

						{/* Organization Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Organization</div>
							<div style={{ padding: 16 }}>
								<Box sx={{ display: 'flex', gap: 2 }}>
									<Controller
										name="page_id"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<TextField
												select
												label="Assigned page"
												error={!!errors.page_id}
												{...field}
												sx={{ minWidth: 200 }}
											>
												{pageTemplates.map((o) => (
													<MenuItem key={o.id} value={o.id}>
														{o.title} (p{o.id})
													</MenuItem>
												))}
											</TextField>
										)}
									/>
									<Controller
										name="position"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<TextField
												select
												label="Display order"
												error={!!errors.position}
												{...field}
												sx={{ width: 100 }}
											>
												{positionOptions.map((o) => (
													<MenuItem key={o} value={o}>
														{o}
													</MenuItem>
												))}
											</TextField>
										)}
									/>
								</Box>
							</div>
						</Card>

						{/* Attachments Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Attachments</div>
							<div style={{ padding: 16 }}>
								<Box display="flex" alignItems="center" gap={1.5}>
									<Button
										variant="outlined"
										size="small"
										startIcon={<IconPaperclip size={20} />}
										onClick={() => setShowDocSelector(true)}
										disabled={inTransition || isPlaceholder}
									>
										{attachedDoc ? 'Change Document' : 'Add Document'}
									</Button>
									{attachedDoc && (
										<Box sx={styles.attachmentChip}>
											<span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
												{attachedDoc.title || attachedDoc.alias}
											</span>
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
												sx={{ padding: '2px' }}
											>
												<IconX size={14} />
											</IconButton>
										</Box>
									)}
								</Box>
							</div>
						</Card>
					</Box>
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
					<span>
						Deleting this question will also delete its <b>{selectedQuestionData.answers.length}</b>{' '}
						answers.
					</span>
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
		</Box>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column',
		p: 2.5,
		minWidth: 500,
		overflow: 'auto',
	},
	divider: {
		width: '100%',
		mb: 3,
	},
	formContainer: {
		display: 'flex',
		flexDirection: 'column',
		gap: 2.5,
		width: '100%',
	},
	fieldRow: {
		mb: 2,
		'&:last-child': {
			mb: 0,
		},
	},
	radioLabel: {
		'& .MuiFormControlLabel-label': {
			fontSize: 13,
		},
	},
	attachmentChip: {
		display: 'flex',
		alignItems: 'center',
		gap: 1,
		bgcolor: 'var(--bg-secondary)',
		border: '1px solid var(--border-strong)',
		borderRadius: '8px',
		px: 1.5,
		py: 0.75,
	},
};
