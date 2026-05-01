'use client';

import Link from 'next/link';
import {
	IconAlertTriangle,
	IconClock,
	IconBulb,
	IconChecks,
	IconCircleCheck,
	IconArrowRight,
	IconSettings,
	IconUserOff,
	IconRoute,
	IconGauge,
} from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import KpiCard from '@/components/ui/KpiCard';
import Skeleton from '@/components/ui/Skeleton';

interface WorkflowHealthCounts {
	slaBreaches: number;
	slaWarnings: number;
	pendingSuggestions: number;
	pendingApprovals: number;
}

interface ConfigHealthCheck {
	locationsWithoutWorkflow: any[];
	workflowsWithoutThreshold: any[];
	locationsMissingCapacity: any[];
	usersWithoutAssignments: any[];
}

interface WorkflowHealthCardProps {
	counts: WorkflowHealthCounts;
	configHealth?: ConfigHealthCheck | null;
	inactiveUserCount?: number;
	isLoading: boolean;
}

interface ActionableItem {
	label: string;
	count: number;
	icon: React.ReactNode;
	href: string;
	color: string;
}

export default function WorkflowHealthCard({
	counts,
	configHealth,
	inactiveUserCount = 0,
	isLoading,
}: WorkflowHealthCardProps) {
	const allCountsClear =
		!isLoading &&
		counts.slaBreaches === 0 &&
		counts.slaWarnings === 0 &&
		counts.pendingSuggestions === 0 &&
		counts.pendingApprovals === 0;

	// Build actionable items from config health + inactive users
	const actionableItems: ActionableItem[] = [];

	if (configHealth) {
		if (configHealth.locationsWithoutWorkflow.length > 0) {
			actionableItems.push({
				label: 'Desk locations without workflows',
				count: configHealth.locationsWithoutWorkflow.length,
				icon: <IconRoute size={16} />,
				href: '/admin/workflow-management/workflows',
				color: 'var(--status-warning)',
			});
		}
		if (configHealth.workflowsWithoutThreshold.length > 0) {
			actionableItems.push({
				label: 'Workflows without SLA thresholds',
				count: configHealth.workflowsWithoutThreshold.length,
				icon: <IconClock size={16} />,
				href: '/admin/workflow-management/workflows',
				color: 'var(--status-warning)',
			});
		}
		if (configHealth.locationsMissingCapacity.length > 0) {
			actionableItems.push({
				label: 'Locations missing capacity settings',
				count: configHealth.locationsMissingCapacity.length,
				icon: <IconGauge size={16} />,
				href: '/admin/workflow-management/desk-locations',
				color: 'var(--status-warning)',
			});
		}
		if (configHealth.usersWithoutAssignments.length > 0) {
			actionableItems.push({
				label: 'Users without desk assignments',
				count: configHealth.usersWithoutAssignments.length,
				icon: <IconSettings size={16} />,
				href: '/admin/workflow-management/desk-assignments',
				color: 'var(--text-secondary)',
			});
		}
	}

	if (inactiveUserCount > 0) {
		actionableItems.push({
			label: 'Inactive user accounts',
			count: inactiveUserCount,
			icon: <IconUserOff size={16} />,
			href: '/admin/user-management/users?inactive=true',
			color: 'var(--text-secondary)',
		});
	}

	return (
		<Card variant="beveled" padding="md" style={{ maxWidth: 700 }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 12,
				}}
			>
				<span style={{ fontSize: 16, fontWeight: 600 }}>Workflow Health</span>
				<Link
					href="/admin/workflow-management/overview"
					style={{
						fontSize: 12,
						color: 'var(--text-accent)',
						textDecoration: 'none',
						display: 'flex',
						alignItems: 'center',
						gap: 4,
					}}
				>
					Go to Workflows <IconArrowRight size={14} />
				</Link>
			</div>

			{/* KPI counts */}
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 12,
					marginBottom: actionableItems.length > 0 || allCountsClear ? 16 : 0,
				}}
			>
				{isLoading ? (
					<>
						<Skeleton width={160} height={72} />
						<Skeleton width={160} height={72} />
						<Skeleton width={160} height={72} />
						<Skeleton width={160} height={72} />
					</>
				) : (
					<>
						<KpiCard
							size="sm"
							value={counts.slaBreaches}
							label="SLA Breaches"
							icon={<IconAlertTriangle size={16} />}
							iconColor={counts.slaBreaches > 0 ? '#fff' : 'var(--text-secondary)'}
							iconBgColor={counts.slaBreaches > 0 ? 'var(--status-error)' : 'var(--bg-tertiary)'}
							subtitleColor={counts.slaBreaches > 0 ? 'negative' : 'default'}
						/>
						<KpiCard
							size="sm"
							value={counts.slaWarnings}
							label="SLA Warnings"
							icon={<IconClock size={16} />}
							iconColor={counts.slaWarnings > 0 ? '#fff' : 'var(--text-secondary)'}
							iconBgColor={counts.slaWarnings > 0 ? 'var(--status-warning)' : 'var(--bg-tertiary)'}
						/>
						<KpiCard
							size="sm"
							value={counts.pendingSuggestions}
							label="Pending Suggestions"
							icon={<IconBulb size={16} />}
							iconColor="#fff"
							iconBgColor="var(--text-accent)"
						/>
						<KpiCard
							size="sm"
							value={counts.pendingApprovals}
							label="Pending Approvals"
							icon={<IconChecks size={16} />}
							iconColor="#fff"
							iconBgColor="var(--text-accent)"
						/>
					</>
				)}
			</div>

			{/* All clear message */}
			{allCountsClear && actionableItems.length === 0 && (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						padding: '8px 12px',
						borderRadius: 6,
						backgroundColor: 'var(--bg-tertiary)',
						color: 'var(--status-success)',
						fontSize: 13,
					}}
				>
					<IconCircleCheck size={16} />
					<span>All clear — no workflow issues or configuration gaps</span>
				</div>
			)}

			{/* Actionable items */}
			{actionableItems.length > 0 && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					<span
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: 'var(--text-secondary)',
							marginBottom: 4,
						}}
					>
						Action Items
					</span>
					{actionableItems.map((item, i) => (
						<Card key={i} variant="surface" style={{ padding: 0, maxWidth: 450 }}>
							<Link
								href={item.href}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 10,
									padding: '8px 12px',
									borderRadius: 6,
									textDecoration: 'none',
									color: 'inherit',
									fontSize: 13,
								}}
							>
								<span style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
								<span style={{ flex: 1 }}>{item.label}</span>
								<span style={{ fontWeight: 600, color: item.color }}>{item.count}</span>
								<IconArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
							</Link>
						</Card>
					))}
				</div>
			)}
		</Card>
	);
}
