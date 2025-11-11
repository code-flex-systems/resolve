'use client';
import Info from '@mui/icons-material/Info';
import './styles.css';
import { Fade, Paper, Popper, Tooltip, Typography, Box } from '@mui/material';
import { useRef } from 'react';
import theme from '@/styles/theme';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';
import DocumentIconWithPreview from '../common/DocumentIconWithPreview';

export default function QuestionInfo(props: {
	description: string | null;
	filename: string | null;
	questionId: number;
}) {
	const { description, questionId } = props;
	const ref = useRef(null);

	// Fetch attached document for this question
	const { data: attachedDocs = [] } = useDocTrpc().listDocs({
		filters: { question_id: questionId },
	}, { enabled: questionId !== -1 });

	const attachedDoc = attachedDocs.length > 0 ? attachedDocs[0] : null;

	return (
		<>
			{/* Show info icon with description tooltip if there's a description */}
			{description && (
				<>
					<Tooltip title={description ?? ''} placement="top" arrow>
						<Info ref={ref} sx={{ color: 'primary.main', marginLeft: '10px' }} className="info" />
					</Tooltip>

					<Popper
						open={true}
						anchorEl={ref.current}
						placement="right"
						className="popper"
						style={{ zIndex: 100 }}
						transition
					>
						{({ TransitionProps }) => (
							<Fade {...TransitionProps} timeout={350}>
								<span>
									<Paper style={styles.paper}>
										<Typography fontSize={17} fontWeight="bold">
											{description}
										</Typography>
									</Paper>
								</span>
							</Fade>
						)}
					</Popper>
				</>
			)}

			{/* Show attached document/image */}
			{attachedDoc && (
				<Box display="inline-flex" ml={description ? 0 : 1}>
					{attachedDoc.mime_type?.startsWith('image/') ? (
						<ImageTooltip
							imageUrl={`/api/download?docId=${attachedDoc.id}`}
							description={attachedDoc.title ?? undefined}
						/>
					) : (
						<DocumentIconWithPreview document={attachedDoc} />
					)}
				</Box>
			)}
		</>
	);
}

const styles = {
	paper: {
		width: 250,
		height: 'fit-content',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		outline: `1px solid ${theme.palette.primary.light}`,
		padding: 10,
		marginTop: 5,
	},
};
