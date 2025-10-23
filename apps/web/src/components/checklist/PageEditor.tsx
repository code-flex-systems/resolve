'use client';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import { Box, Divider, Fade, TextField, Typography } from '@mui/material';
import FormQuestion from './FormQuestion';
import FormAnswer from './FormAnswer';
import Toolbar from '../common/Toolbar';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import East from '@mui/icons-material/East';
import Description from '@mui/icons-material/Description';
import SubdirectoryArrowRight from '@mui/icons-material/SubdirectoryArrowRight';
import TaskAlt from '@mui/icons-material/TaskAlt';
import BasicButton from '../common/BasicButton';
import { useState } from 'react';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { BASE_COLOR_LIGHT } from '@/styles/theme';

export default function PageEditor() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const selectedAnswer = useChecklistStore((state) => state.selectedAnswer);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const selectedPageInstance = useChecklistStore((state) => state.selectedPageInstance);
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const updateSelectedPage = useChecklistStore((state) => state.updateSelectedPage);
	const updateSelectedPageTitle = useChecklistStore((state) => state.updateSelectedPageTitle);

	const [pageTitle, setPageTitle] = useState('');
	const [editingPageTitle, setEditingPageTitle] = useState(false);
	const [showUpdateMsg, setShowUpdateMsg] = useState(false);

	const { data: questions } = useQuestionTrpc().list({ pageId: selectedPageInfo.pageId });
	const { createTemplate, createInstance, removeInstance, updateTemplate, getInstanceTree } = usePageTrpc();
	const { mutateAsync: addPage, isPending: adding } = createTemplate;
	const { mutateAsync: copyPage, isPending: copying } = createInstance;
	const { mutateAsync: deletePage, isPending: deleting } = removeInstance;
	const { mutateAsync: modifyPage, isPending: updating } = updateTemplate;
	const { isFetching, data = { tree: [], maxPosition: 0 } } = getInstanceTree(
		{
			checklistId,
			claimId,
		},
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const inTransition = adding || copying || deleting || isFetching;

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
			if (newInstance) updateSelectedPage(newInstance.instance_id);
		} catch (e) {
			console.error(e);
		}
	};

	const onCopyPage = async () => {
		try {
			const newInstance = await copyPage({
				checklistId,
				pageId: selectedPageInfo.pageId,
				params: {
					parentId: selectedPageInfo.parentInstanceId ?? -1,
					position: selectedPageInfo.position + 1,
				},
			});
			if (newInstance) updateSelectedPage(newInstance.id);
		} catch (e) {
			console.error(e);
		}
	};

	const onDeletePage = async () => {
		try {
			await deletePage({ instanceId: selectedPageInfo.instanceId });
			updateSelectedPage(null);
		} catch (e) {
			console.error(e);
		}
	};

	const onModifyPage = async () => {
		try {
			const modifiedPage = await modifyPage({ id: selectedPageInfo.pageId, params: { title: pageTitle } });
			if (modifiedPage) {
				updateSelectedPageTitle(selectedPageInfo.instanceId, modifiedPage.title, data.tree);
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
					<Typography fontStyle="italic">Questions: {questions?.length ?? 0}</Typography>
				</>
			)}
			{!!selectedPageInstance && !selectedQuestion && (
				<div className="flex-col-left">
					<BasicButton
						buttonProps={{
							onClick: () => onCopyPage().catch((e) => console.error(e)),
							disabled: inTransition,
							variant: 'contained',
							color: 'primary',
							sx: styles.button,
							startIcon: <ContentCopy sx={{ color: 'white' }} />,
						}}
					>
						New page copy
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
		</div>
	);
}

const styles = {
	button: {
		marginTop: '10px',
	},
	container: {
		flex: 1,
		minWidth: 0,
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: 20,
	},
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
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
