'use client';
import Card from '@/components/ui/Card';
import Comments from '../common/Comments';
import { useSession } from '@/lib/auth/use-session';
import './styles.css';
import { buildChecklistUrl } from '@/lib/utils/buildChecklistUrl';
import { useRouter } from 'next/navigation';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { IconMessage } from '@tabler/icons-react';

export default function RecentComments() {
	const router = useRouter();
	const { data: session } = useSession();
	const userId = session?.user.id;

	const { data: comments = { rows: [], count: 0 } } = useCommentTrpc().list({
		filters: { userId },
	});

	return (
		<Card variant="beveled" padding="none" style={{ ...styles.container, overflow: 'hidden' }}>
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
				<IconMessage style={{ fontSize: 16, marginRight: 8, verticalAlign: 'text-bottom' }} />
				Recent Comments
			</div>
			<div style={{ ...styles.contentContainer, padding: 16 }}>
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
								buildChecklistUrl({
									checklistId,
									claimId,
									instanceId,
									questionId,
									focus: 'comments',
								})
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
		</Card>
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
