'use client';

import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { Box, Collapse, Divider, MenuItem, Stack, Typography } from '@mui/material';
import { ArrowRightAlt } from '@mui/icons-material';
import { TransitionGroup } from 'react-transition-group';
import { formatMD, formatUser } from '@/lib/utils/utils';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import { CommentFilters } from '@/types/types';
import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toggleComments } from '@/state/checklist/actions';

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
	onNavigate: (args: { checklistId?: number; claimId?: number; instanceId?: number; questionId?: number }) => void;
}) {
	const router = useRouter();
	const { data: session } = useSession();

	const { data: comments = { rows: [], count: 0 } } = useCommentTrpc().list(
		{ filters, limit, offset },
		{
			enabled:
				(!filters.checklistId || filters.checklistId !== -1) && (!filters.claimId || filters.claimId !== -1),
		}
	);

	const pagedData = useMemo(() => {
		if (page == null || pageSize == null) return comments.rows;
		return comments.rows.slice(page, page + pageSize);
	}, [comments.rows, page, pageSize]);

	return !comments.rows.length ? (
		<Typography fontSize={13} color={BASE_COLOR_LIGHT} paddingTop="10px">
			No comments
		</Typography>
	) : (
		<TransitionGroup>
			{pagedData.map((c, i) => {
				const canNavigate = !viewingInChecklist || (!!c.instance_id && !!c.question_id);
				return (
					<Collapse key={i} sx={{ width }}>
						<MenuItem
							disableRipple
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
							sx={{
								...styles.menuItem,
								marginBottom: offset == null && i === pagedData.length - 1 ? '40px' : undefined,
							}}
							className="comment"
						>
							<Stack width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
								<Box padding="5px 10px" display="flex" justifyContent="flex-start" alignItems="center">
									<Stack
										width="100%"
										display="flex"
										justifyContent="flex-start"
										alignItems="flex-start"
										padding="5px"
									>
										<Box width={width - 20} overflow="hidden" sx={{ textWrap: 'wrap' }}>
											<Typography fontSize={13} lineHeight="17px" paddingBottom="2px">
												{c.body}
											</Typography>
										</Box>

										<Box
											width={width - 20}
											display="flex"
											justifyContent="space-between"
											alignItems="center"
										>
											<Box
												width={width - 50}
												display="flex"
												justifyContent="flex-start"
												alignItems="center"
												overflow="hidden"
											>
												<Typography
													fontSize={12}
													lineHeight="15px"
													color={BASE_COLOR_LIGHT}
													minWidth="fit-content"
													noWrap
												>
													{formatUser(c, session?.user?.email)}
												</Typography>
												<div style={styles.divider} />
												<Typography
													fontSize={12}
													lineHeight="15px"
													color={BASE_COLOR_LIGHT}
													minWidth="fit-content"
													noWrap
												>
													{formatMD(c.updated_at ?? c.created_at)}
												</Typography>
												{c.page_title && c.question_id && (
													<>
														<div style={styles.divider} />
														<Typography
															fontSize={12}
															lineHeight="15px"
															color={theme.palette.secondary.main}
															textOverflow="ellipsis"
															noWrap
														>
															{c.page_title} (Q{c.position})
														</Typography>
													</>
												)}
											</Box>
											<div className="go-icon">
												{canNavigate && <ArrowRightAlt sx={{ fontSize: 19 }} />}
											</div>
										</Box>
									</Stack>
								</Box>
								{i !== pagedData.length - 1 && (
									<div style={styles.horizontalDiv}>
										<Divider />
									</div>
								)}
							</Stack>
						</MenuItem>
					</Collapse>
				);
			})}
		</TransitionGroup>
	);
}

const styles = {
	divider: {
		minWidth: 5,
		width: 5,
		height: 5,
		borderRadius: 10,
		backgroundColor: '#d9d9d9',
		margin: '0px 10px',
	},
	horizontalDiv: {
		padding: 0,
		height: 1,
		width: '100%',
	},
	icon: {
		marginRight: '5px',
	},
	link: {
		padding: 10,
	},
	menuItem: {
		flex: 1,
		width: '100%',
		padding: 0,
		bgcolor: 'white',
	},
};
