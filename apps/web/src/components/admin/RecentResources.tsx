'use client';

import Link from 'next/link';
import {
	IconFileSearch,
	IconChecklist,
	IconWaveSquare,
	IconUsers,
	IconLink,
	IconMoodEmpty,
} from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface RecentResourceItem {
	id: string;
	resource_type: string;
	resource_label: string | null;
	resource_url: string;
	visited_at: string | Date;
}

interface RecentResourcesProps {
	data: RecentResourceItem[];
	isLoading: boolean;
}

const RESOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
	claim: <IconFileSearch size={18} />,
	checklist: <IconChecklist size={18} />,
	workflow: <IconWaveSquare size={18} />,
	party: <IconUsers size={18} />,
};

function getResourceIcon(resourceType: string) {
	return RESOURCE_TYPE_ICONS[resourceType] ?? <IconLink size={18} />;
}

export default function RecentResources({ data, isLoading }: RecentResourcesProps) {
	const items = data.slice(0, 8);

	return (
		<Card variant="beveled" padding="md" style={{ flex: 1, minWidth: 0 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
					Recently Visited
				</span>

				{isLoading && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} width="100%" height={36} />
						))}
					</div>
				)}

				{!isLoading && items.length === 0 && (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 8,
							padding: '24px 0',
							color: 'var(--text-muted)',
						}}
					>
						<IconMoodEmpty size={28} />
						<span style={{ fontSize: 13 }}>No recently visited items</span>
					</div>
				)}

				{!isLoading && items.length > 0 && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{items.map((item) => (
							<Link
								key={item.id}
								href={item.resource_url}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 10,
									padding: '8px 8px',
									borderRadius: 6,
									textDecoration: 'none',
									color: 'inherit',
									transition: 'background-color 0.15s',
								}}
								onMouseEnter={(e) => {
									(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
								}}
								onMouseLeave={(e) => {
									(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
								}}
							>
								<span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
									{getResourceIcon(item.resource_type)}
								</span>
								<span
									style={{
										flex: 1,
										fontSize: 13,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
									}}
								>
									{item.resource_label || 'Untitled'}
								</span>
								<span
									style={{
										fontSize: 11,
										padding: '2px 8px',
										borderRadius: 4,
										backgroundColor: 'var(--bg-tertiary)',
										color: 'var(--text-muted)',
										flexShrink: 0,
										textTransform: 'capitalize',
									}}
								>
									{item.resource_type}
								</span>
								<span
									style={{
										fontSize: 11,
										color: 'var(--text-muted)',
										flexShrink: 0,
										whiteSpace: 'nowrap',
									}}
								>
									{dayjs(item.visited_at).fromNow()}
								</span>
							</Link>
						))}
					</div>
				)}
			</div>
		</Card>
	);
}
