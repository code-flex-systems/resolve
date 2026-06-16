'use client';
import PageNavigation from '@/components/checklist/PageNavigation';
import Page from '@/components/checklist/Page';
import PageEditor from '@/components/checklist/PageEditor';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useTrackResource } from '@/hooks/useTrackResource';
import { ChecklistMode } from '@/config/enums';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import ChecklistProgressDialog from '../checklist/ChecklistProgressDialog';
import ChecklistHandoffDialog from '../checklist/ChecklistHandoffDialog';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { IconEye, IconEdit, IconPlayerPlay, IconChevronDown } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import { useBreadcrumbs } from '@/components/common/BreadcrumbContext';
import { getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import { useSelectedQuestionData } from '@/hooks/useSelectedQuestionData';
import { useSelectedAnswerData } from '@/hooks/useSelectedAnswerData';

const MODE_CONFIG = [
	{ mode: ChecklistMode.VIEW, label: 'View', icon: IconEye, requiresClaim: true },
	{ mode: ChecklistMode.TEST, label: 'Test', icon: IconPlayerPlay, requiresClaim: false },
	{ mode: ChecklistMode.EDIT, label: 'Edit', icon: IconEdit, requiresClaim: false },
] as const;

export default function Checklist() {
	const { checklistId, claimId } = useChecklistParams();
	const mode = useChecklistStore((state) => state.mode);
	const updateMode = useChecklistStore((state) => state.updateMode);
	const showChecklistHandoffDialog = useChecklistStore((state) => state.showChecklistHandoffDialog);
	const showChecklistProgressDialog = useChecklistStore(
		(state) => state.showChecklistProgressDialog
	);
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const [modeHandleOpen, setModeHandleOpen] = useState(false);
	const { setSegments } = useBreadcrumbs();
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const selectedAnswer = useChecklistStore((state) => state.selectedAnswer);
	const selectedQuestionData = useSelectedQuestionData();
	const selectedAnswerData = useSelectedAnswerData();

	const { data: checklist } = useChecklistTrpc().get(
		{ id: checklistId! },
		{ enabled: !!checklistId }
	);
	const { data: claim } = useClaimTrpc().get(
		{ checklistId: checklistId!, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
	);
	usePageTrpc().listTemplates();

	const checklistUrl = claimId
		? `/checklists/${checklistId}/claim/${claimId}`
		: `/checklists/${checklistId}`;
	useTrackResource(
		'checklist',
		checklistId ?? null,
		checklist?.name ?? null,
		checklistUrl,
		!!checklistId
	);

	// Index checklist for global search (standalone entry)
	const indexMutation = trpc.user.indexResource.useMutation();
	const indexedStandalone = useRef(false);
	const indexedLinked = useRef(false);

	useEffect(() => {
		if (!checklistId || !checklist?.name || indexedStandalone.current) return;
		indexedStandalone.current = true;
		indexMutation.mutate({
			resource_type: 'checklist',
			resource_id: checklistId,
			label: checklist.name,
			metadata: {},
			url: `/checklists/${checklistId}`,
		});
	}, [checklistId, checklist?.name]);

	// Index checklist+claim linked entry (separate effect so it doesn't race with standalone)
	useEffect(() => {
		if (
			!checklistId ||
			!claimId ||
			!checklist?.name ||
			!claim?.claim_number ||
			indexedLinked.current
		)
			return;
		indexedLinked.current = true;
		indexMutation.mutate({
			resource_type: 'checklist',
			resource_id: checklistId,
			linked_resource_type: 'claim',
			linked_resource_id: claimId,
			label: checklist.name,
			secondary_label: claim.claim_number,
			metadata: {
				Claim: claim.claim_number,
				Insured: claim.insured ?? 'N/A',
			},
			url: `/checklists/${checklistId}/claim/${claimId}`,
		});
	}, [checklistId, claimId, checklist?.name, claim?.claim_number]);

	useEffect(() => {
		return () => useChecklistStore.getState().reset();
	}, []);

	// Breadcrumbs: Checklist > [name] > page > question > answer
	// Uses setSegments (full override) to hide "claim" from URL and control the full chain
	useEffect(() => {
		const segments: { label: string; href?: string }[] = [
			{ label: 'Checklists', href: '/checklists' },
			{ label: checklist?.name ?? 'Loading...' },
		];
		if (selectedPageInfo?.title) {
			segments.push({ label: `${selectedPageInfo.title} (p${selectedPageInfo.position + 1})` });
		}
		if (selectedQuestion && selectedQuestionData?.text) {
			segments.push({
				label: `${selectedQuestionData.text} (q${selectedQuestionData.position + 1})`,
			});
		}
		if (selectedAnswer && selectedAnswerData?.text) {
			segments.push({ label: `${selectedAnswerData.text} (a${selectedAnswerData.position + 1})` });
		}
		setSegments(segments);
	}, [
		checklist?.name,
		selectedPageInfo?.title,
		selectedPageInfo?.position,
		selectedQuestion,
		selectedQuestionData?.text,
		selectedAnswer,
		selectedAnswerData?.text,
	]);

	const availableModes = MODE_CONFIG.filter((m) => !m.requiresClaim || !!claimId);
	const currentModeConfig = MODE_CONFIG.find((m) => m.mode === mode);
	const CurrentIcon = currentModeConfig?.icon ?? IconEye;

	return !checklist || (claimId && !claim) ? (
		<></>
	) : (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				justifyContent: 'flex-start',
				alignItems: 'stretch',
				position: 'relative',
				padding: '20px',
			}}
		>
			<PageNavigation />
			{mode === ChecklistMode.EDIT ? <PageEditor /> : <Page />}

			{/* Floating mode selector — top center */}
			{(isAdmin || isSuperAdmin) && (
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 10,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
					}}
				>
					<div
						style={{
							background: 'var(--bg-white)',
							border: '1px solid var(--border)',
							borderTop: 'none',
							borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
							boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
							overflow: 'hidden',
							transition: 'all 200ms ease',
							maxHeight: modeHandleOpen ? 60 : 28,
							padding: modeHandleOpen ? '6px 8px' : '2px 12px 4px',
						}}
					>
						{modeHandleOpen ? (
							<div style={{ display: 'flex', gap: 4 }}>
								{availableModes.map(({ mode: m, label, icon: Icon }) => (
									<Tooltip key={m} content={label} position="bottom">
										<button
											onClick={() => {
												updateMode(m);
												setModeHandleOpen(false);
											}}
											style={{
												background: mode === m ? 'var(--bg-tertiary)' : 'transparent',
												color: mode === m ? 'var(--text-accent)' : 'var(--text-muted)',
												border: 'none',
												padding: '6px 10px',
												borderRadius: 'var(--radius-md)',
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												gap: 4,
												transition: 'all 150ms ease',
											}}
										>
											<Icon size={16} />
										</button>
									</Tooltip>
								))}
							</div>
						) : (
							<button
								onClick={() => setModeHandleOpen(true)}
								style={{
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									gap: 4,
									color: 'var(--text-secondary)',
									fontSize: 'var(--text-xs)',
									fontFamily: 'var(--font-sans)',
									padding: 0,
								}}
							>
								<CurrentIcon size={13} />
								<span>{currentModeConfig?.label}</span>
								<IconChevronDown
									size={11}
									style={{
										transition: 'transform 200ms ease',
										transform: undefined,
									}}
								/>
							</button>
						)}
					</div>
				</div>
			)}

			{showChecklistHandoffDialog && <ChecklistHandoffDialog />}
			{showChecklistProgressDialog && claimId && <ChecklistProgressDialog />}
		</div>
	);
}
