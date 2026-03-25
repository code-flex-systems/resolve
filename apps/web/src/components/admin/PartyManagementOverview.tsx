'use client';

import CardioLoadingIndicator from '@/components/common/CardioLoadingIndicator';
import KpiCard from '@/components/ui/KpiCard';
import { IconUsersGroup, IconMapPin, IconBriefcase } from '@tabler/icons-react';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';

export default function PartyManagementOverview() {
	const { data, isLoading } = usePartyTrpc().managementStats(undefined);

	if (isLoading || !data) {
		return <CardioLoadingIndicator message="Loading party data..." />;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<h6 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
					Party Management
				</h6>
				<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
					Overview of parties, addresses, and representatives across all claims.
				</span>
			</div>

			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<KpiCard
					icon={<IconUsersGroup size={20} />}
					iconColor="var(--text-accent)"
					iconBgColor="var(--status-info-bg)"
					value={data.totalParties}
					label="Total Parties"
					subtitle={`${data.entities} entities · ${data.facilitators} facilitators`}
				/>
				<KpiCard
					icon={<IconMapPin size={20} />}
					iconColor="var(--status-success)"
					iconBgColor="var(--status-success-bg)"
					value={data.totalAddresses}
					label="Addresses"
					subtitle="Active addresses on file"
				/>
				<KpiCard
					icon={<IconBriefcase size={20} />}
					iconColor="#8b5cf6"
					iconBgColor="rgba(139, 92, 246, 0.1)"
					value={data.totalRepresentatives}
					label="Representatives"
					subtitle="Active representatives on file"
				/>
			</div>
		</div>
	);
}
