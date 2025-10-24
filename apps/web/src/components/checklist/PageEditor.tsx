'use client';
import { useChecklistStore, getSelectedPageInfoOrDefault, findInstancesByTemplateId } from '@/stores/useChecklistStore';
import { Box, Divider, Fade, Link, TextField, Typography } from '@mui/material';
import FormQuestion from './FormQuestion';
import FormAnswer from './FormAnswer';
import CopyPageDialog from './CopyPageDialog';
import Toolbar from '../common/Toolbar';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import East from '@mui/icons-material/East';
import Description from '@mui/icons-material/Description';
import SubdirectoryArrowRight from '@mui/icons-material/SubdirectoryArrowRight';
import TaskAlt from '@mui/icons-material/TaskAlt';
import BasicButton from '../common/BasicButton';
import { useMemo, useState } from 'react';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import ExpandableTitle from '../common/ExpandableTitle';
import HelpOutline from '@mui/icons-material/HelpOutline';
import FormatQuote from '@mui/icons-material/FormatQuote';

export default function PageEditor() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const selectedAnswer = useChecklistStore((state) => state.selectedAnswer);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const selectedPageInstance = useChecklistStore((state) => state.selectedPageInstance);
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const updateSelectedPage = useChecklistStore((state) => state.updateSelectedPage);
	const updateSelectedPageInfo = useChecklistStore((state) => state.updateSelectedPageInfo);
	const updateSelectedPageInfoSearch = useChecklistStore((state) => state.updateSelectedPageInfoSearch);
	const updateSelectedPageTitle = useChecklistStore((state) => state.updateSelectedPageTitle);
	const goToPage = useChecklistStore((state) => state.goToPage);

	const [pageTitle, setPageTitle] = useState('');
	const [editingPageTitle, setEditingPageTitle] = useState(false);
	const [showUpdateMsg, setShowUpdateMsg] = useState(false);
	const [copyDialogOpen, setCopyDialogOpen] = useState(false);
	const [copyType, setCopyType] = useState<'template' | 'instance'>('template');

	const { data: questions = [] } = useQuestionTrpc().list({ pageId: selectedPageInfo.pageId });
	const { createTemplate, copyTemplate, createInstance, removeInstance, updateTemplate, getInstanceTree } =
		usePageTrpc();
	const { mutateAsync: addPage, isPending: adding } = createTemplate;
	const { mutateAsync: copyPageTemplate, isPending: copyingTemplate } = copyTemplate;
	const { mutateAsync: copyPageInstance, isPending: copyingInstance } = createInstance;
	const { mutateAsync: deletePage, isPending: deleting } = removeInstance;
	const { mutateAsync: modifyPage, isPending: updating } = updateTemplate;
	const {
		isFetching,
		data = { tree: [], maxPosition: 0 },
		refetch: refetchTree,
	} = getInstanceTree(
		{
			checklistId,
			claimId,
		},
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);

	const answerCount = questions.reduce((prev, curr) => prev + (curr.answers?.length ?? 0), 0);
	const inTransition = adding || copyingTemplate || copyingInstance || deleting || isFetching;
	const otherInstances = useMemo(() => {
		return findInstancesByTemplateId(selectedPageInfo.pageId, data.tree).filter(
			(node) => node.instanceId !== selectedPageInfo.instanceId
		);
	}, [selectedPageInfo, data.tree]);

	const onAddPage = async (passedParentId: number | null) => {
		try {
			const newInstance = await addPage({
				checklistId,
				params: {
					title: 'New Page',
					parentId: passedParentId ?? -1,
					position: selectedPageInfo.position + 1,
				},
			});
			if (newInstance) {
				const { data: freshData } = await refetchTree();
				updateSelectedPage(newInstance.instance_id);
				if (freshData) {
					updateSelectedPageInfoSearch(newInstance.instance_id, freshData.tree);
				}
			}
		} catch (e) {
			console.error(e);
		}
	};

	const handleCopyWithParent = async (parentId: number | null, position: number) => {
		try {
			if (copyType === 'template') {
				const newPage = await copyPageTemplate({
					checklistId,
					pageId: selectedPageInfo.pageId,
					params: {
						parentId: parentId ?? -1,
						position,
					},
				});
				if (newPage) {
					const { data: freshData } = await refetchTree();
					updateSelectedPage(newPage.instance_id);
					if (freshData) {
						updateSelectedPageInfoSearch(newPage.instance_id, freshData.tree);
					}
				}
			} else {
				const newInstance = await copyPageInstance({
					checklistId,
					pageId: selectedPageInfo.pageId,
					params: {
						parentId: parentId ?? -1,
						position,
					},
				});
				if (newInstance) {
					const { data: freshData } = await refetchTree();
					updateSelectedPage(newInstance.id);
					if (freshData) {
						updateSelectedPageInfoSearch(newInstance.id, freshData.tree);
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	};

	const onDeletePage = async () => {
		try {
			await deletePage({ instanceId: selectedPageInfo.instanceId });
			await refetchTree();
			updateSelectedPage(null);
			updateSelectedPageInfo(null);
		} catch (e) {
			console.error(e);
		}
	};

	const onModifyPage = async () => {
		try {
			const modifiedPage = await modifyPage({ id: selectedPageInfo.pageId, params: { title: pageTitle } });
			if (modifiedPage) {
				const { data: freshData } = await refetchTree();
				if (freshData) {
					updateSelectedPageTitle(selectedPageInfo.instanceId, modifiedPage.title, freshData.tree);
				}
			}
		} catch (e) {
			console.error(e);
		}
	};

	const startEditing = () => {
		if (!updating) {
			setEditingPageTitle(true);
			setPageTitle(selectedPageInfo.title);
		}
	};

	const stopEditing = async () => {
		if (!updating) {
			try {
				if (pageTitle && pageTitle !== selectedPageInfo.title) {
					await onModifyPage();
					setShowUpdateMsg(true);
					setTimeout(() => setShowUpdateMsg(false), 1000);
				}
				setEditingPageTitle(false);
				setPageTitle('');
			} catch (e) {
				console.error(e);
			}
		}
	};

	return (
		<div style={styles.container}>
			{!!selectedPageInstance && !selectedQuestion && !selectedAnswer && (
				<>
					<Toolbar
						left={
							<>
								{editingPageTitle ? (
									<TextField
										autoFocus
										value={pageTitle}
										onChange={(e) => setPageTitle(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') stopEditing();
										}}
										placeholder="New Page"
										onBlur={stopEditing}
										error={!pageTitle}
										variant="outlined"
										disabled={updating}
										sx={styles.textFieldOverrides}
									/>
								) : (
									<Typography
										onClick={startEditing}
										className="text-hover"
										lineHeight={'21px'}
										fontSize={19}
										minWidth={200}
									>
										{selectedPageInfo.title} (p{selectedPageInfo.pageId}.i
										{selectedPageInfo.instanceId})
									</Typography>
								)}
								<Fade in={showUpdateMsg} timeout={500}>
									<div style={{ marginLeft: 10 }} className="flex-row-left">
										<TaskAlt sx={{ color: 'warning.main', marginRight: '5px' }} />
										<Typography color="warning" fontStyle="italic">
											Updated!
										</Typography>
									</div>
								</Fade>
							</>
						}
						leftWidth="100%"
						rightWidth="0%"
						height={60}
						padding={'10px 0px'}
					/>
					<div style={styles.divider}>
						<Divider />
					</div>
					<ExpandableTitle title={`Questions: ${questions.length}`} color="white" icon={<HelpOutline />} />
					<Box margin="10px 0px">
						<ExpandableTitle title={`Answers: ${answerCount}`} color="white" icon={<FormatQuote />} />
					</Box>
					{otherInstances.length > 0 && (
						<>
							{otherInstances.length === 1 ? (
								<Typography fontSize={15} marginTop="5px">
									Another page uses this template:
								</Typography>
							) : (
								<Typography fontSize={15} marginTop="5px">
									<b>{otherInstances.length}</b> other pages use this template:
								</Typography>
							)}
							{otherInstances.map((node) => (
								<Link
									key={node.instanceId}
									onClick={() => {
										updateSelectedPage(node.instanceId);
										updateSelectedPageInfo(node);
									}}
									fontSize={15}
									sx={{ marginTop: '5px' }}
								>
									p{node.pageId}.i{node.instanceId}
								</Link>
							))}
						</>
					)}
				</>
			)}
			{!!selectedPageInstance && !selectedQuestion && (
				<div className="flex-col-left" style={{ marginTop: 10 }}>
					<BasicButton
						buttonProps={{
							onClick: () => {
								setCopyType('template');
								setCopyDialogOpen(true);
							},
							disabled: inTransition,
							variant: 'contained',
							color: 'primary',
							sx: styles.button,
							startIcon: <ContentCopy sx={{ color: 'white' }} />,
						}}
					>
						Copy page template...
					</BasicButton>
					<BasicButton
						buttonProps={{
							onClick: () => {
								setCopyType('instance');
								setCopyDialogOpen(true);
							},
							disabled: inTransition,
							variant: 'contained',
							color: 'error',
							sx: styles.button,
							startIcon: <ContentCopy sx={{ color: 'white' }} />,
						}}
					>
						Copy page instance...
					</BasicButton>
					<BasicButton
						buttonProps={{
							onClick: () => onAddPage(selectedPageInfo.parentInstanceId).catch((e) => console.error(e)),
							disabled: inTransition,
							variant: 'contained',
							color: 'secondary',
							sx: styles.button,
							startIcon: <East sx={{ color: 'white', fontSize: 17 }} />,
						}}
					>
						New sibling page
					</BasicButton>
					<BasicButton
						buttonProps={{
							onClick: () => onAddPage(selectedPageInfo.instanceId).catch((e) => console.error(e)),
							disabled: inTransition,
							variant: 'contained',
							color: 'secondary',
							sx: styles.button,
							startIcon: <SubdirectoryArrowRight sx={{ color: 'white' }} />,
						}}
					>
						New child page
					</BasicButton>
					<BasicButton
						buttonProps={{
							onClick: () => onDeletePage().catch((e) => console.error(e)),
							disabled: inTransition,
							variant: 'contained',
							color: 'warning',
							sx: styles.button,
							startIcon: <Delete sx={{ color: 'white' }} />,
						}}
					>
						Delete page
					</BasicButton>
				</div>
			)}
			{!!selectedQuestion && !selectedAnswer && <FormQuestion />}
			{!!selectedAnswer && <FormAnswer />}
			{!selectedPageInstance && (
				<div style={{ width: '100%', height: '100%' }} className="flex-col-center">
					<Box width={200} display="flex" justifyContent="center" alignItems="center">
						<Description sx={{ color: BASE_COLOR_LIGHT, fontSize: 25 }} />
						<Typography color={BASE_COLOR_LIGHT} fontSize={15} paddingLeft="10px">
							No page selected
						</Typography>
					</Box>
				</div>
			)}
			{copyDialogOpen && (
				<CopyPageDialog
					onClose={() => setCopyDialogOpen(false)}
					onCopy={handleCopyWithParent}
					title={copyType === 'template' ? 'Copy Page Template' : 'Copy Page Instance'}
					tree={data.tree}
					currentInstanceId={selectedPageInfo.instanceId}
					currentParentId={selectedPageInfo.parentInstanceId ?? null}
					currentPosition={selectedPageInfo.position}
					isPending={inTransition}
				/>
			)}
		</div>
	);
}

const styles = {
	button: {
		marginTop: '10px',
	},
	container: {
		flex: 1,
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: 20,
		minWidth: 500,
	},
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 10,
	},
	textFieldOverrides: {
		minWidth: 200,
		width: 300,
		'& .MuiInputBase-root': {
			fontSize: 19,
			lineHeight: '21px',
			padding: '2px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '2px 10px',
		},
	},
};
