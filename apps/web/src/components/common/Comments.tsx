'use client';

import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { Box, Collapse, Divider, IconButton, MenuItem, Stack, Typography } from '@mui/material';
import { ArrowRightAlt } from '@mui/icons-material';
import { TransitionGroup } from 'react-transition-group';
import { useRouter } from 'next/navigation';
import { formatMD, formatUser } from '@/lib/utils/utils';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT } from '@/styles/theme';
import { CommentFilters } from '@/types/types';
import { useState } from 'react';

function countLinesByCanvas(
	text: string,
	containerWidth: number,
	font = '14px Inter, sans-serif',
	lineHeight = 17
): number {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	ctx.font = font;
	const width = ctx.measureText(text).width;
	const lines = Math.ceil(width / containerWidth);
	return Math.max(lines * lineHeight, 24);
}

export default function Comments({
	filters,
	limit,
	width,
}: {
	filters: CommentFilters;
	limit?: number;
	width: number;
}) {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
	const router = useRouter();
	const { data: comments = [] } = useCommentTrpc().list({ filters, limit });

	return !comments.length ? (
		<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
			No comments
		</Typography>
	) : (
		<TransitionGroup>
			{comments.map((c, i) => (
				<Collapse key={i} sx={{ width }}>
					<MenuItem
						disableRipple
						onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
						sx={{ ...styles.menuItem, marginBottom: i === comments.length - 1 ? '40px' : undefined }}
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
									<Box
										width={width - 20}
										height={expandedIndex === i ? countLinesByCanvas(c.body, width - 20) : 24}
										overflow="hidden"
										sx={{ textWrap: 'wrap', transition: 'height 300ms ease' }}
										marginBottom="5px"
									>
										<Typography
											fontSize={14}
											lineHeight="17px"
											paddingBottom="5px"
											textOverflow="ellipsis"
											noWrap={expandedIndex !== i}
											color={BASE_COLOR_LIGHT}
										>
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
												fontSize={13}
												lineHeight="15px"
												color={BASE_COLOR}
												minWidth="fit-content"
												noWrap
											>
												{formatUser(c)}
											</Typography>
											<div style={styles.divider} />
											<Typography
												fontSize={13}
												lineHeight="15px"
												color={BASE_COLOR}
												minWidth="fit-content"
												noWrap
											>
												{formatMD(c.updated_at ?? c.created_at)}
											</Typography>
											{c.page_title && c.question_id && (
												<>
													<div style={styles.divider} />
													<Typography
														fontSize={13}
														lineHeight="15px"
														color={theme.palette.success.light}
														textOverflow="ellipsis"
														noWrap
													>
														{c.page_title} (q{c.question_id})
													</Typography>
												</>
											)}
										</Box>
										<Box>
											<IconButton
												onClick={(e) => {
													e.stopPropagation();
													e.preventDefault();
												}}
												disableRipple
											>
												<ArrowRightAlt sx={{ fontSize: 19 }} />
											</IconButton>
										</Box>
									</Box>
								</Stack>
							</Box>
							{i !== comments.length - 1 && (
								<div style={styles.horizontalDiv}>
									<Divider />
								</div>
							)}
						</Stack>
					</MenuItem>
				</Collapse>
			))}
		</TransitionGroup>
	);
}

const styles = {
	divider: {
		minWidth: 5,
		width: 5,
		height: 5,
		borderRadius: 10,
		backgroundColor: BASE_COLOR_LIGHT,
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
