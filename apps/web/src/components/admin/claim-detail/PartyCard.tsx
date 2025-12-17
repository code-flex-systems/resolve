'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Chip, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import Highlight from '@/components/common/Highlight';
import { BASE_COLOR_LIGHT, BORDER_COLOR } from '@/styles/theme';
import { ClaimPartyRoleChip, EntityCategoryChip, FacilitatorCategoryChip } from '@/components/common/ReferenceDataSelect';
import { formatCityState } from '@/schemas/addressSchemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';

dayjs.extend(relativeTime);

interface PartyCardProps {
	claimParty: any;
	isNested?: boolean;
	facilitators?: any[];
	onEditParty: (claimParty: any) => void;
	onArchiveParty?: (claimParty: any) => void;
	onAddFacilitator?: (parentClaimPartyId: number) => void;
	onEditFacilitator?: (parentClaimPartyId: number, facilitator: any) => void;
	onArchiveFacilitator?: (parentClaimPartyId: number, facilitator: any) => void;
	/** Render function for tab-specific content (coverages or liabilities) */
	renderTabContent?: (claimParty: any) => React.ReactNode;
	/** Whether to show liability percentage chip (for adverse parties tab) */
	showLiabilityPercentage?: boolean;
	/** Controlled expanded state (optional - if not provided, uses internal state) */
	expanded?: boolean;
	/** Default expanded state when uncontrolled */
	defaultExpanded?: boolean;
}

/**
 * Shared component for rendering a party card in claim detail tabs.
 * Used by both ClaimantsCoverageTab and PartyLiabilityTab.
 */
export default function PartyCard({
	claimParty,
	isNested = false,
	facilitators = [],
	onEditParty,
	onArchiveParty,
	onAddFacilitator,
	onEditFacilitator,
	onArchiveFacilitator,
	renderTabContent,
	showLiabilityPercentage = false,
	expanded: controlledExpanded,
	defaultExpanded = true,
}: PartyCardProps) {
	// Internal expanded state - always used for actual display
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	// Sync with controlled state when it changes (for expand all/collapse all)
	useEffect(() => {
		if (controlledExpanded !== undefined) {
			setIsExpanded(controlledExpanded);
		}
	}, [controlledExpanded]);

	// Determine if this card has nested content that needs a connecting line
	const hasNestedContent = !isNested && (renderTabContent || onAddFacilitator);

	// Toggle expand/collapse - always works with internal state
	const handleToggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<Box key={claimParty.id}>
			<Box display="flex" gap={2} position="relative">
				{/* Primary indicator dot */}
				<Box
					sx={{
						width: 8,
						height: 8,
						borderRadius: '50%',
						bgcolor: isNested ? 'secondary.main' : 'primary.main',
						marginTop: '8px',
						flexShrink: 0,
						position: 'relative',
						zIndex: 1,
					}}
				/>

				{/* Vertical dotted line connecting indicator to nested content */}
				{hasNestedContent && isExpanded && (
					<Box
						sx={{
							position: 'absolute',
							left: 3.5, // Center under the 8px dot
							top: 28, // Start with gap below the dot
							bottom: 12, // End near the bottom with some padding
							width: 0,
							borderLeft: `1px dashed ${BORDER_COLOR}`,
						}}
					/>
				)}

				<Box flex={1}>
					<Box display="flex" justifyContent="space-between" alignItems="flex-start">
						<Box flex={1}>
							{/* Party Name and Role */}
							<Box display="flex" alignItems="center" gap={1} marginBottom={0.5}>
								{/* Expand/Collapse toggle for entities with nested content */}
								{hasNestedContent && (
									<IconButton
										size="small"
										onClick={handleToggleExpand}
										sx={{ ml: -1, mr: -0.5, p: 0.25 }}
									>
										{isExpanded ? (
											<ExpandLess sx={{ fontSize: 20, color: BASE_COLOR_LIGHT }} />
										) : (
											<ExpandMore sx={{ fontSize: 20, color: BASE_COLOR_LIGHT }} />
										)}
									</IconButton>
								)}
								<Typography fontSize={isNested ? 14 : 16} fontWeight={600}>
									{claimParty.party?.name || 'Unknown Party'}
								</Typography>
								<ClaimPartyRoleChip value={claimParty.role} showEmoji={false} />
								{claimParty.party?.party_type === 'entity' && claimParty.party?.party_category && (
									<EntityCategoryChip value={claimParty.party.party_category} showEmoji={false} />
								)}
								{claimParty.party?.party_type === 'facilitator' && claimParty.party?.party_category && (
									<FacilitatorCategoryChip value={claimParty.party.party_category} showEmoji={false} />
								)}
							</Box>

							{/* Party Organization */}
							{claimParty.party?.organization && (
								<Typography fontSize={13} marginBottom={0.5} color="text.secondary">
									Organization: <Highlight>{claimParty.party.organization}</Highlight>
								</Typography>
							)}

							{/* Party Contact Info */}
							{(claimParty.party?.email || claimParty.party?.phone) && (
								<Box display="flex" gap={2} marginBottom={0.5}>
									{claimParty.party?.email && (
										<Typography fontSize={12} color="text.secondary">
											✉️ {claimParty.party.email}
										</Typography>
									)}
									{claimParty.party?.phone && (
										<Typography fontSize={12} color="text.secondary">
											📞 {claimParty.party.phone}
										</Typography>
									)}
								</Box>
							)}

							{/* Representative */}
							{claimParty.representative && (
								<Box marginBottom={0.5}>
									<Typography fontSize={13} display="inline">
										Representative:{' '}
										<Highlight>
											{claimParty.representative.first_name} {claimParty.representative.last_name}
										</Highlight>
										{claimParty.representative.title && ` - ${claimParty.representative.title}`}
										{(claimParty.representative.email || claimParty.representative.phone) && (
											<>
												{' '}
												<Typography component="span" fontSize={12} color="text.secondary">
													(
													{claimParty.representative.email && <>✉️ {claimParty.representative.email}</>}
													{claimParty.representative.email && claimParty.representative.phone && ' • '}
													{claimParty.representative.phone && <>📞 {claimParty.representative.phone}</>}
													)
												</Typography>
											</>
										)}
									</Typography>
								</Box>
							)}

							{/* Office */}
							{claimParty.office && (
								<Typography fontSize={13} marginBottom={0.5}>
									Office: <Highlight>{claimParty.office.office_name}</Highlight>
									{(claimParty.office.city || claimParty.office.state) &&
										` - ${formatCityState(claimParty.office.city, claimParty.office.state)}`}
								</Typography>
							)}

							{/* Collapsible secondary content (coverages/liabilities, facilitators) */}
							{hasNestedContent && (
								<Collapse in={isExpanded} timeout="auto">
									{/* Liability Percentage (for adverse parties tab) - only for entities */}
									{showLiabilityPercentage && claimParty.liability_percentage != null && (
										<Box marginTop={1} marginBottom={0.5}>
											<Chip
												label={`Liability: ${parseFloat(claimParty.liability_percentage.toString()).toFixed(2)}%`}
												size="small"
												color="warning"
											/>
										</Box>
									)}

									{/* Tab-specific content (coverages or liabilities) */}
									{renderTabContent && renderTabContent(claimParty)}

									{/* Facilitators Section */}
									{onAddFacilitator && (
										<Box marginTop={2}>
											<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
												<Typography fontSize={13} fontWeight={600} color={BASE_COLOR_LIGHT}>
													Facilitators ({facilitators.length})
												</Typography>
												<Button
													size="small"
													startIcon={<PersonAdd />}
													variant="outlined"
													onClick={() => onAddFacilitator(claimParty.id)}
												>
													Add Facilitator
												</Button>
											</Box>

											{facilitators.length === 0 && (
												<Typography fontSize={12} color="text.secondary" fontStyle="italic" marginY={1}>
													No facilitators linked yet
												</Typography>
											)}

											{facilitators.length > 0 && (
												<Stack spacing={1.5} marginTop={1} sx={{ ml: 2 }}>
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
														/>
													))}
												</Stack>
											)}
										</Box>
									)}
								</Collapse>
							)}

							{/* Notes */}
							{claimParty.notes && (
								<Typography fontSize={13} color="text.secondary" marginTop={1}>
									Notes: {claimParty.notes}
								</Typography>
							)}

							{/* Metadata */}
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginTop={1}>
								Linked {dayjs(claimParty.created_at).format('MMM D, YYYY')} (
								{dayjs(claimParty.created_at).fromNow()})
							</Typography>
						</Box>

						{/* Action Buttons */}
						<Box display="flex" gap={0.5}>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => onEditParty(claimParty),
								}}
								icon={<Edit />}
								compact
							/>
							{onArchiveParty && (
								<BasicButtonStyled
									buttonProps={{
										onClick: () => onArchiveParty(claimParty),
									}}
									icon={<Archive />}
									compact
								/>
							)}
						</Box>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
