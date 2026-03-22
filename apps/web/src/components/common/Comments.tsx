'use client';

import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { IconArrowRight } from '@tabler/icons-react';

import { formatMD, formatUser } from '@/lib/utils/utils';
import { CommentFilters } from '@/types/types';
import { useMemo } from 'react';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { useRouter } from 'next/navigation';
import { useChecklistStore } from '@/stores/useChecklistStore';

export default function Comments({
	filters,
	limit,
	offset,
	page,
	pageSize,
	width,
	viewingInChecklist = false,
	onNavigate,
}: {
	filters: CommentFilters;
	limit?: number;
	offset?: number;
	page?: number;
	pageSize?: number;
	width: number;
	viewingInChecklist?: boolean;
	onNavigate: (args: { checklistId?: string; claimId?: string; instanceId?: string; questionId?: string }) => void;
}) {
	const router = useRouter();
	const { data: session } = useClerkSession();
	const toggleComments = useChecklistStore((state) => state.toggleComments);

	const { data: comments = { rows: [], count: 0 } } = useCommentTrpc().list(
		{ filters, limit, offset },
		{
			enabled:
				(!filters.checklistId || !!filters.checklistId) && (!filters.claimId || !!filters.claimId),
		}
	);

	const pagedData = useMemo(() => {
		if (page == null || pageSize == null) return comments.rows;
		return comments.rows.slice(page, page + pageSize);
	}, [comments.rows, page, pageSize]);

	return !comments.rows.length ? (
		<span style={{ fontSize: 15, color: 'var(--text-muted)', paddingTop: 10, display: 'block' }}>
			No comments
		</span>
	) : (
		<>
			{pagedData.map((c, i) => {
				const canNavigate = !viewingInChecklist || (!!c.instance_id && !!c.question_id);
				return (
					<div key={i} style={{ width }}>
						<div
							onClick={() => {
								if (!canNavigate) return;
								if (!viewingInChecklist) toggleComments();
								onNavigate({
									checklistId: c.checklist_id,
									claimId: c.claim_id,
									instanceId: c.instance_id ?? undefined,
									questionId: c.question_id ?? undefined,
								});
							}}
							style={{
								...styles.menuItem,
								marginBottom: offset == null && i === pagedData.length - 1 ? '40px' : undefined,
								cursor: 'pointer',
							}}
							className="comment">
							<div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
								<div style={{ padding: '5px 10px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
									<div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', padding: 5 }}>
										<div style={{ width: width - 20, overflow: 'hidden', textWrap: 'wrap' }}>
											<span style={{ fontSize: 13, lineHeight: '17px', paddingBottom: 2 }}>
												{c.body}
											</span>
										</div>

										<div
style={{
												width: width - 20,
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}>
											<div
style={{
													width: width - 50,
													display: 'flex',
													justifyContent: 'flex-start',
													alignItems: 'center',
													overflow: 'hidden',
												}}>
												<span
style={{
														fontSize: 12,
														lineHeight: '15px',
														color: 'var(--text-muted)',
														minWidth: 'fit-content',
														whiteSpace: 'nowrap',
													}}>
													{formatUser(c, session?.user?.email ?? undefined)}
												</span>
												<div style={dividerStyle} />
												<span
style={{
														fontSize: 12,
														lineHeight: '15px',
														color: 'var(--text-muted)',
														minWidth: 'fit-content',
														whiteSpace: 'nowrap',
													}}>
													{formatMD(c.updated_at ?? c.created_at)}
												</span>
												{c.page_title && c.question_id && (
													<>
														<div style={dividerStyle} />
														<span
style={{
																fontSize: 12,
																lineHeight: '15px',
																color: 'var(--text-accent)',
																textOverflow: 'ellipsis',
																whiteSpace: 'nowrap',
																overflow: 'hidden',
															}}>
															{c.page_title} (Q{c.position})
														</span>
													</>
												)}
											</div>
											<div className="go-icon">
												{canNavigate && (
													<IconArrowRight size={19} style={{ color: 'var(--text-muted)' }} />
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</>
	);
}

const dividerStyle: React.CSSProperties = {
	minWidth: 5,
	width: 5,
	height: 5,
	borderRadius: 10,
	backgroundColor: '#d9d9d9',
	margin: '0px 10px',
};

const styles = {
	menuItem: {
		flex: 1,
		width: '100%',
		padding: 0,
	},
};
