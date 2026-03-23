'use client';

import { IconArchive, IconChevronDown, IconChevronUp, IconEdit, IconUserPlus } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import Highlight from '@/components/common/Highlight';
import { capitalize } from '@/lib/utils/utils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatAddressInline } from '@/schemas/addressSchemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface PartyCardProps {
	claimParty: any;
	isNested?: boolean;
	facilitators?: any[];
	onEditParty: (claimParty: any) => void;
	onArchiveParty?: (claimParty: any) => void;
	onAddFacilitator?: (parentClaimPartyId: string) => void;
	onEditFacilitator?: (parentClaimPartyId: string, facilitator: any) => void;
	onArchiveFacilitator?: (parentClaimPartyId: string, facilitator: any) => void;
	onViewDetails?: (claimParty: any) => void;
	renderTabContent?: (claimParty: any) => React.ReactNode;
	showLiabilityPercentage?: boolean;
	expanded?: boolean;
	defaultExpanded?: boolean;
	isManageMode?: boolean;
}

export default function PartyCard({
	claimParty,
	isNested = false,
	facilitators = [],
	onEditParty,
	onArchiveParty,
	onAddFacilitator,
	onEditFacilitator,
	onArchiveFacilitator,
	onViewDetails,
	renderTabContent,
	showLiabilityPercentage = false,
	expanded: controlledExpanded,
	defaultExpanded = true,
	isManageMode = true,
}: PartyCardProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	useEffect(() => {
		if (controlledExpanded !== undefined) {
			setIsExpanded(controlledExpanded);
		}
	}, [controlledExpanded]);

	const hasNestedContent = !isNested && (renderTabContent || onAddFacilitator);

	const handleToggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div key={claimParty.id}>
			<div style={{ display: 'flex', gap: 16, position: 'relative' }}>
				{/* Primary indicator dot */}
				<div
					style={{
						width: 8,
						height: 8,
						borderRadius: '50%',
						backgroundColor: isNested ? 'var(--text-secondary)' : 'var(--text-accent)',
						marginTop: 8,
						flexShrink: 0,
						position: 'relative',
						zIndex: 1,
					}}
				/>

				{/* Vertical dotted line connecting indicator to nested content */}
				{hasNestedContent && isExpanded && (
					<div
						style={{
							position: 'absolute',
							left: 3.5,
							top: 28,
							bottom: 12,
							width: 0,
							borderLeft: '1px dashed var(--border)',
						}}
					/>
				)}

				<div style={{ flex: 1 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
						<div style={{ flex: 1 }}>
							{/* Party Name and Role */}
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									height: 20,
									marginBottom: 4,
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									{hasNestedContent && (
										<Button
											variant="icon"
											size="sm"
											onClick={handleToggleExpand}
											style={{ marginLeft: -8, marginRight: -4, padding: 2 }}
										>
											{isExpanded ? (
												<IconChevronUp size={20} style={{ color: 'var(--text-muted)' }} />
											) : (
												<IconChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
											)}
										</Button>
									)}
									<span
										style={{
											fontSize: isNested ? 14 : 16,
											fontWeight: 600,
											cursor: onViewDetails ? 'pointer' : undefined,
										}}
										onClick={onViewDetails ? () => onViewDetails(claimParty) : undefined}
									>
										{claimParty.party?.name || 'Unknown Party'}
									</span>
									{Array.isArray(claimParty.role) &&
										claimParty.role.map((r: string) => (
											<Chip key={r} size="sm" color="info" style={{ height: 20, fontSize: 11 }}>
												{capitalize(r.replace(/_/g, ' '))}
											</Chip>
										))}
									{isNested && claimParty.loss_type && (
										<Chip size="sm" color="neutral" style={{ height: 20, fontSize: 11 }}>
											{formatCoverageType(claimParty.loss_type)}
										</Chip>
									)}
									{isNested && claimParty.policy_limit != null && (
										<Chip size="sm" variant="outlined" style={{ height: 20, fontSize: 11 }}>
											{`Policy Limit: ${formatCurrencyExact(parseFloat(claimParty.policy_limit.toString()))}`}
										</Chip>
									)}
								</div>
								{isManageMode && (
									<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
										<Button variant="icon" size="sm" color="neutral">
							<IconEdit size={16} />
						</Button>
										{onArchiveParty && (
											<Button variant="icon" size="sm" color="neutral">
							<IconArchive size={16} />
						</Button>
										)}
									</div>
								)}
							</div>

							{/* Party Organization */}
							{claimParty.party?.organization && (
								<span style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)', display: 'block' }}>
									Organization: <Highlight>{claimParty.party.organization}</Highlight>
								</span>
							)}

							{/* Party Contact Info */}
							{(claimParty.party?.email || claimParty.party?.phone) && (
								<div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
									{claimParty.party?.email && (
										<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
											✉️ {claimParty.party.email}
										</span>
									)}
									{claimParty.party?.phone && (
										<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
											📞 {claimParty.party.phone}
										</span>
									)}
								</div>
							)}

							{/* Representative - Facilitators (structured) */}
							{claimParty.party?.party_type === 'facilitator' && claimParty.representative && (
								<div style={{ marginBottom: 4 }}>
									<span style={{ fontSize: 13, display: 'inline' }}>
										Representative:{' '}
										<Highlight>
											{claimParty.representative.first_name} {claimParty.representative.last_name}
										</Highlight>
										{claimParty.representative.title && ` - ${claimParty.representative.title}`}
										{(claimParty.representative.email || claimParty.representative.phone) && (
											<>
												{' '}
												<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
													(
													{claimParty.representative.email && (
														<>✉️ {claimParty.representative.email}</>
													)}
													{claimParty.representative.email &&
														claimParty.representative.phone &&
														' • '}
													{claimParty.representative.phone && (
														<>📞 {claimParty.representative.phone}</>
													)}
													)
												</span>
											</>
										)}
									</span>
								</div>
							)}

							{/* Representative - Entities (free-form) */}
							{claimParty.party?.party_type === 'entity' && claimParty.representative_name && (
								<div style={{ marginBottom: 4 }}>
									<span style={{ fontSize: 13, display: 'inline' }}>
										Representative: <Highlight>{claimParty.representative_name}</Highlight>
									</span>
								</div>
							)}

							{/* Address */}
							{claimParty.address && (
								<span style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
									📍{' '}
									{claimParty.address.name && (
										<span style={{ fontWeight: 500 }}>
											{claimParty.address.name}:{' '}
										</span>
									)}
									{formatAddressInline(claimParty.address)}
								</span>
							)}

							{/* Collapsible secondary content (coverages, facilitators) */}
							{hasNestedContent && (
								<Collapse open={isExpanded}>
									{showLiabilityPercentage && claimParty.liability_percentage != null && (
										<div style={{ marginTop: 8, marginBottom: 4 }}>
											<Chip size="sm" color="warning">
												{`Liability: ${parseFloat(claimParty.liability_percentage.toString()).toFixed(2)}%`}
											</Chip>
										</div>
									)}

									{renderTabContent && renderTabContent(claimParty)}

									{onAddFacilitator && (
										<div style={{ marginTop: 16 }}>
											<div
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													marginBottom: 16,
												}}
											>
												<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
													Facilitators ({facilitators.length})
												</span>
												<Button
													size="sm"
													startIcon={<IconUserPlus size={20} />}
													variant="outlined"
													onClick={() => onAddFacilitator(claimParty.id)}
												>
													Add Facilitator
												</Button>
											</div>

											{facilitators.length === 0 && (
												<span
													style={{
														fontSize: 12,
														color: 'var(--text-secondary)',
														fontStyle: 'italic',
														margin: '8px 0',
														display: 'block',
													}}
												>
													No facilitators linked yet
												</span>
											)}

											{facilitators.length > 0 && (
												<div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8, marginLeft: 16 }}>
													{facilitators.map((facilitator: any) => (
														<PartyCard
															key={facilitator.id}
															claimParty={facilitator}
															isNested={true}
															onEditParty={(f) =>
																onEditFacilitator
																	? onEditFacilitator(claimParty.id, f)
																	: onEditParty(f)
															}
															onArchiveParty={
																onArchiveFacilitator
																	? (f) => onArchiveFacilitator(claimParty.id, f)
																	: onArchiveParty
															}
															onViewDetails={onViewDetails}
															isManageMode={isManageMode}
														/>
													))}
												</div>
											)}
										</div>
									)}
								</Collapse>
							)}

							{/* Notes */}
							{claimParty.notes && (
								<span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, display: 'block' }}>
									Notes: {claimParty.notes}
								</span>
							)}

							{/* Metadata */}
							<span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
								Linked {dayjs(claimParty.created_at).format('MMM D, YYYY')} (
								{dayjs(claimParty.created_at).fromNow()})
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
