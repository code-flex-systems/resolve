'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import { QuestionType } from '@/config/enums';
import { useEffect, useMemo, useState } from 'react';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import { Question } from '@/types/types';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useSelectedQuestionData } from '@/hooks/useSelectedQuestionData';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DocumentSelectorDialog from '../admin/DocumentSelectorDialog';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';
import DocumentIconWithPreview from '../common/DocumentIconWithPreview';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import {
	IconCheck,
	IconCircleCheck,
	IconCopy,
	IconPaperclip,
	IconTrash,
	IconX,
} from '@tabler/icons-react';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import Dropdown from '../ui/Dropdown';

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
	const { data: questions, isFetching: refetchingQuestions } = list({
		pageId: selectedPageInfo.pageId,
	});

	const { data: attachedDocsResult } = useDocTrpc().listDocs(
		{ filters: { question_id: selectedQuestionData.id } },
		{ enabled: !!selectedQuestionData.id }
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
		defaultValues: { ...getDefaults(selectedQuestionData as Question) },
		mode: 'onChange',
	});
	const questionText = watch('text');

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showUpdateMsg, setShowUpdateMsg] = useState(false);
	const isPlaceholder = !selectedQuestionData.id;
	const inTransition =
		isSubmitting || adding || copying || updating || deleting || refetchingQuestions;

	const onSubmit = handleSubmit(async (data) => {
		try {
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
			const newQuestion = !selectedQuestionData.id
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
			showSuccess(!selectedQuestionData.id ? 'create' : 'update');
		} catch (e) {
			showError(!selectedQuestionData.id ? 'create' : 'update', e, 'Failed to save question');
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
		if (attachedDoc && attachedDoc.id !== doc.id) {
			try {
				await updateDoc({ docId: attachedDoc.id, params: { question_id: null } });
			} catch (e) {
				console.error('Failed to unlink previous document:', e);
			}
		}
		setAttachedDoc(doc);
		setShowDocSelector(false);
	};

	const handleRemoveDocument = async () => {
		if (!attachedDoc) return;
		try {
			await updateDoc({ docId: attachedDoc.id, params: { question_id: null } });
			setAttachedDoc(null);
			showSuccess('update', 'Attachment removed from question');
		} catch (e) {
			showError('update', e, 'Failed to remove document attachment');
		}
	};

	useEffect(() => {
		reset({ ...getDefaults(selectedQuestionData as Question) });
	}, [selectedQuestionData, selectedPageInfo.pageId]);

	useEffect(() => {
		if (attachedDocs.length > 0) {
			setAttachedDoc(attachedDocs[0]);
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

	const radioOptions = [
		{ value: QuestionType.SINGLE, label: 'Single select' },
		{ value: QuestionType.MULTI, label: 'Multi select' },
		{ value: QuestionType.DROPDOWN, label: 'Dropdown' },
		{ value: QuestionType.FREEFORM, label: 'Free-form text' },
	];

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				padding: 20,
				minWidth: 500,
				overflow: 'auto',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'flex-end',
					gap: 8,
					marginBottom: 16,
					flexShrink: 0,
				}}
			>
				{showUpdateMsg && (
					<span style={{ marginRight: 'auto' }} className="flex-row-left">
						<IconCircleCheck
							size={20}
							style={{ color: 'var(--status-success)', marginRight: '5px' }}
						/>
						<span style={{ color: 'var(--status-success)' }}>Saved!</span>
					</span>
				)}
				{!isPlaceholder && (
					<>
						<Button
							variant="outlined"
							onClick={() => {
								if (selectedQuestionData.answers?.length) {
									setShowDeleteDialog(true);
								} else {
									onDelete();
								}
							}}
							disabled={inTransition}
							startIcon={<IconTrash size={16} />}
						>
							Delete
						</Button>
						<Button
							variant="outlined"
							onClick={onCopy}
							disabled={inTransition}
							startIcon={<IconCopy size={16} />}
						>
							Copy
						</Button>
					</>
				)}
				<Button
					variant="outlined"
					onClick={onSubmit}
					disabled={inTransition || (isPlaceholder ? !isValid : !isDirty)}
					startIcon={<IconCircleCheck size={16} />}
				>
					{isPlaceholder ? 'Add' : 'Save'}
				</Button>
			</div>
			{!!selectedQuestionData.id && (
				<Form control={control} style={{ width: '100%' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
						{/* Basic Information Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									padding: '12px 16px',
									fontSize: 13,
									fontWeight: 600,
									color: 'var(--text-primary)',
									backgroundColor: 'var(--bg-secondary)',
									borderBottom: '1px solid var(--border)',
								}}
							>
								Basic Information
							</div>
							<div style={{ padding: 16 }}>
								<div style={{ marginBottom: 16 }}>
									<Controller
										name="text"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<Input
												label="Question text"
												placeholder="What is the cause of loss?"
												fullWidth
												error={!!errors.text}
												{...field}
												endAdornment={
													<>
														<Button
															variant="icon"
															size="sm"
															color="neutral"
															onClick={() => onCopyText(field.name, field.value)}
														>
															{copiedField === field.name ? (
																<IconCheck size={20} style={{ color: 'var(--status-success)' }} />
															) : (
																<IconCopy size={20} style={{ color: 'var(--text-muted)' }} />
															)}
														</Button>
														<Button
															variant="icon"
															size="sm"
															color="neutral"
															onClick={() => field.onChange('')}
															disabled={!field.value}
														>
															<IconX size={20} style={{ color: 'var(--text-muted)' }} />
														</Button>
													</>
												}
											/>
										)}
									/>
								</div>
								<div>
									<Controller
										name="description_text"
										control={control}
										render={({ field }) => (
											<Textarea
												label="Description (optional)"
												placeholder="Describe how the damage occurred"
												fullWidth
												{...field}
												value={field.value ?? ''}
												minRows={3}
												endAdornment={
													<>
														<Button
															variant="icon"
															size="sm"
															color="neutral"
															onClick={() => onCopyText(field.name, field.value ?? '')}
														>
															{copiedField === field.name ? (
																<IconCheck size={20} style={{ color: 'var(--status-success)' }} />
															) : (
																<IconCopy size={20} style={{ color: 'var(--text-muted)' }} />
															)}
														</Button>
														<Button
															variant="icon"
															size="sm"
															color="neutral"
															onClick={() => field.onChange('')}
															disabled={!field.value}
														>
															<IconX size={20} style={{ color: 'var(--text-muted)' }} />
														</Button>
													</>
												}
											/>
										)}
									/>
								</div>
							</div>
						</Card>

						{/* Question Type Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									padding: '12px 16px',
									fontSize: 13,
									fontWeight: 600,
									color: 'var(--text-primary)',
									backgroundColor: 'var(--bg-secondary)',
									borderBottom: '1px solid var(--border)',
								}}
							>
								Response Type
							</div>
							<div style={{ padding: 16 }}>
								<Controller
									name="type"
									control={control}
									rules={{ required: true }}
									render={({ field }) => (
										<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
											{radioOptions.map((option) => (
												<label
													key={option.value}
													style={{
														display: 'flex',
														alignItems: 'center',
														gap: 6,
														cursor: 'pointer',
														fontSize: 13,
													}}
												>
													<input
														type="radio"
														name={field.name}
														value={option.value}
														checked={field.value === option.value}
														onChange={() => field.onChange(option.value)}
													/>
													{option.label}
												</label>
											))}
										</div>
									)}
								/>
							</div>
						</Card>

						{/* Organization Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									padding: '12px 16px',
									fontSize: 13,
									fontWeight: 600,
									color: 'var(--text-primary)',
									backgroundColor: 'var(--bg-secondary)',
									borderBottom: '1px solid var(--border)',
								}}
							>
								Organization
							</div>
							<div style={{ padding: 16 }}>
								<div style={{ display: 'flex', gap: 16 }}>
									<Controller
										name="page_id"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<Dropdown
												{...field}
												label="Assigned page"
												onChange={(v) => field.onChange(v)}
												options={pageTemplates.map((o, i) => ({
													value: o.id,
													label: `${o.title} (p${i + 1})`,
												}))}
											/>
										)}
									/>
									<Controller
										name="position"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<Dropdown
												{...field}
												label="Display order"
												renderValue={(v) =>
													isNaN(parseInt(v.toString()))
														? ''
														: (parseInt(v.toString()) + 1).toString()
												}
												onChange={(v) => field.onChange(Number(v))}
												options={positionOptions.map((o) => ({
													value: o.toString(),
													label: o.toString(),
												}))}
											/>
										)}
									/>
								</div>
							</div>
						</Card>

						{/* Attachments Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									padding: '12px 16px',
									fontSize: 13,
									fontWeight: 600,
									color: 'var(--text-primary)',
									backgroundColor: 'var(--bg-secondary)',
									borderBottom: '1px solid var(--border)',
								}}
							>
								Attachments
							</div>
							<div style={{ padding: 16 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
									<Button
										variant="outlined"
										size="sm"
										startIcon={<IconPaperclip size={20} />}
										onClick={() => setShowDocSelector(true)}
										disabled={inTransition || isPlaceholder}
									>
										{attachedDoc ? 'Change Document' : 'Add Document'}
									</Button>
									{attachedDoc && (
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 8,
												backgroundColor: 'var(--bg-secondary)',
												border: '1px solid var(--border-strong)',
												borderRadius: 8,
												padding: '6px 12px',
											}}
										>
											<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
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
											<Button
												variant="icon"
												size="sm"
												color="neutral"
												onClick={handleRemoveDocument}
												disabled={inTransition}
											>
												<IconX size={14} />
											</Button>
										</div>
									)}
								</div>
							</div>
						</Card>
					</div>
				</Form>
			)}

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
		</div>
	);
}
