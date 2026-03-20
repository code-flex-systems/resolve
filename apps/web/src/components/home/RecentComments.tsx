'use client';
import { containerStyles } from '@/styles/theme';
import Comments from '../common/Comments';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import './styles.css';
import { buildChecklistUrl } from '@/lib/utils/buildChecklistUrl';
import { useRouter } from 'next/navigation';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { IconMessage } from '@tabler/icons-react';

export default function RecentComments() {
	const router = useRouter();
	const { data: session } = useClerkSession();
	const userId = session?.user.id;

	const { data: comments = { rows: [], count: 0 } } = useCommentTrpc().list({ filters: { userId } });

	return (
		<div style={{ ...containerStyles.section, ...styles.container }}>
			<span style={containerStyles.sectionTitle}>
				<IconMessage style={{ fontSize: 16, marginRight: 8, verticalAlign: 'text-bottom' }} />
				Recent Comments
			</span>
			<div style={{ ...containerStyles.sectionContent, ...styles.contentContainer }}>
				<div
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						justifyContent: comments.count > 0 ? 'flex-start' : 'center',
						alignItems: comments.count > 0 ? 'flex-start' : 'center',
						overflow: 'auto',
						paddingTop: 100,
					}}
				>
					<Comments
						filters={{ userId }}
						width={470}
						onNavigate={({ checklistId, claimId, instanceId, questionId }) => {
							if (!checklistId || !claimId) return;
							router.push(
								buildChecklistUrl({ checklistId, claimId, instanceId, questionId, focus: 'comments' })
							);
						}}
					/>
				</div>
				<div
					className="fade-edges"
					style={{
						width: 470,
						height: 50,
						position: 'absolute',
						zIndex: 1000,
						bottom: 16,
					}}
				/>
			</div>
		</div>
	);
}

const styles = {
	container: {
		width: 520,
		minWidth: 520,
		height: 350,
		margin: '15px',
		position: 'relative',
	} as React.CSSProperties,
	contentContainer: {
		height: 'calc(100% - 45px)',
		overflow: 'hidden',
		position: 'relative',
	} as React.CSSProperties,
};
