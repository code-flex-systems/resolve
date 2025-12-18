'use client';

import { Box, Divider, Typography } from '@mui/material';
import OpenInNew from '@mui/icons-material/OpenInNew';
import BasicDialog from '@/components/common/BasicDialog';
import { ClaimPartyRoleChip, EntityCategoryChip, FacilitatorCategoryChip } from '@/components/common/ReferenceDataSelect';
import { formatAddressInline } from '@/schemas/addressSchemas';
import { BASE_COLOR_LIGHT, BORDER_COLOR } from '@/styles/theme';

interface PartyDetailDialogProps {
	open: boolean;
	onClose: () => void;
	claimParty: any;
}

/**
 * Dialog that shows comprehensive party information with links to edit in admin pages.
 */
export default function PartyDetailDialog({ open, onClose, claimParty }: PartyDetailDialogProps) {
	if (!open || !claimParty) return null;

	const party = claimParty.party;
	const office = claimParty.office;
	const representative = claimParty.representative;

	// Build admin URLs for deep linking
	const partyEditUrl = party ? `/admin/party-management/parties?edit=${party.id}` : null;
	const officeEditUrl = office ? `/admin/party-management/offices?edit=${office.id}` : null;
	const representativeEditUrl = representative ? `/admin/party-management/representatives?edit=${representative.id}` : null;

	const handleOpenInNewTab = (url: string) => {
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	return (
		<BasicDialog
			title="Party Details"
			onClose={onClose}
			width={600}
			secondaryActions={[{ label: 'Close', onClick: onClose }]}
		>
			<Box display="flex" flexDirection="column" gap={3} paddingTop={1}>
				{/* Party Information Section */}
				{party && (
					<Section
						title="Party Information"
						editLabel="Edit in Parties"
						onEdit={partyEditUrl ? () => handleOpenInNewTab(partyEditUrl) : undefined}
					>
						<DetailRow label="Name" value={party.name} />
						<DetailRow
							label="Type"
							value={party.party_type === 'entity' ? 'Entity' : 'Facilitator'}
						/>
						<DetailRow
							label="Role"
							value={<ClaimPartyRoleChip value={claimParty.role} showEmoji={false} />}
						/>
						<DetailRow
							label="Category"
							value={
								party.party_type === 'entity' ? (
									<EntityCategoryChip value={party.party_category} showEmoji />
								) : (
									<FacilitatorCategoryChip value={party.party_category} showEmoji />
								)
							}
						/>
						{party.organization && <DetailRow label="Organization" value={party.organization} />}
						{party.email && <DetailRow label="Email" value={party.email} />}
						{party.phone && <DetailRow label="Phone" value={party.phone} />}
						{formatAddressInline(party) && <DetailRow label="Address" value={formatAddressInline(party)} />}
						{party.notes && <DetailRow label="Notes" value={party.notes} />}
					</Section>
				)}

				{/* Office Information Section */}
				{office && (
					<Section
						title="Office Information"
						editLabel="Edit in Offices"
						onEdit={officeEditUrl ? () => handleOpenInNewTab(officeEditUrl) : undefined}
					>
						<DetailRow label="Office Name" value={office.office_name || 'Unnamed'} />
						{office.phone && <DetailRow label="Phone" value={office.phone} />}
						{office.fax && <DetailRow label="Fax" value={office.fax} />}
						{formatAddressInline(office) && <DetailRow label="Address" value={formatAddressInline(office)} />}
					</Section>
				)}

				{/* Representative Information Section */}
				{representative && (
					<Section
						title="Representative Information"
						editLabel="Edit in Representatives"
						onEdit={representativeEditUrl ? () => handleOpenInNewTab(representativeEditUrl) : undefined}
					>
						<DetailRow
							label="Name"
							value={`${representative.first_name} ${representative.last_name}`}
						/>
						{representative.title && <DetailRow label="Title" value={representative.title} />}
						{representative.email && <DetailRow label="Email" value={representative.email} />}
						{representative.phone && <DetailRow label="Phone" value={representative.phone} />}
						{representative.mobile_phone && (
							<DetailRow label="Mobile" value={representative.mobile_phone} />
						)}
						{representative.fax && <DetailRow label="Fax" value={representative.fax} />}
					</Section>
				)}

				{/* Claim Party Notes */}
				{claimParty.notes && (
					<Section title="Linking Notes">
						<Typography fontSize={13} color="text.secondary">
							{claimParty.notes}
						</Typography>
					</Section>
				)}
			</Box>
		</BasicDialog>
	);
}

interface SectionProps {
	title: string;
	editLabel?: string;
	onEdit?: () => void;
	children: React.ReactNode;
}

function Section({ title, editLabel, onEdit, children }: SectionProps) {
	return (
		<Box>
			<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
				<Typography fontSize={12} fontWeight={600} color={BASE_COLOR_LIGHT} textTransform="uppercase">
					{title}
				</Typography>
				{editLabel && onEdit && (
					<Typography
						fontSize={12}
						sx={{
							color: 'primary.main',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: 0.5,
							'&:hover': { textDecoration: 'underline' },
						}}
						onClick={onEdit}
					>
						{editLabel}
						<OpenInNew sx={{ fontSize: 14 }} />
					</Typography>
				)}
			</Box>
			<Divider sx={{ marginBottom: 1.5, borderColor: BORDER_COLOR }} />
			<Box display="flex" flexDirection="column" gap={0.75}>
				{children}
			</Box>
		</Box>
	);
}

interface DetailRowProps {
	label: string;
	value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
	return (
		<Box display="flex" alignItems="flex-start" gap={1}>
			<Typography fontSize={13} color="text.secondary" minWidth={100}>
				{label}:
			</Typography>
			{typeof value === 'string' ? (
				<Typography fontSize={13}>{value}</Typography>
			) : (
				value
			)}
		</Box>
	);
}
