'use client';

import { Box, Chip, Divider, Typography } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import { formatAddressInline } from '@/schemas/addressSchemas';
import { BASE_COLOR_LIGHT, BORDER_COLOR } from '@/styles/theme';
import { capitalize } from '@/lib/utils/utils';
import { useState, useMemo } from 'react';
import PartyDialog from '../PartyDialog';
import AddressDialog from '../AddressDialog';
import RepresentativeDialog from '../RepresentativeDialog';
import { trpc } from '@/lib/trpc';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';

interface PartyDetailDialogProps {
	open: boolean;
	onClose: () => void;
	claimParty: any;
}

/**
 * Dialog that shows comprehensive party information with inline editing via second-level dialogs.
 * Subscribes to fresh query data to ensure updates are shown immediately after edits.
 */
export default function PartyDetailDialog({ open, onClose, claimParty }: PartyDetailDialogProps) {
	const [editingParty, setEditingParty] = useState(false);
	const [editingAddress, setEditingAddress] = useState(false);
	const [editingRepresentative, setEditingRepresentative] = useState(false);
	const utils = trpc.useUtils();
	const partyTrpc = usePartyTrpc();

	// Extract values before early return to avoid breaking hooks rules
	const claimId = claimParty?.claim_id;
	const claimPartyId = claimParty?.id;
	const roleListEntity = claimParty?.role?.[0]?.includes('claimant') ? 'claimant_party_role' : 'adverse_party_role';

	// Subscribe to the query to get fresh data after mutations
	const { data: claimParties = [] } = partyTrpc.listClaimParties(
		{ claimId: claimId!, roleListEntity },
		{ enabled: !!claimId && open }
	);

	// Find the current claim party from fresh query data
	const freshClaimParty = useMemo(() => {
		return claimParties.find((cp: any) => cp.id === claimPartyId) || claimParty;
	}, [claimParties, claimPartyId, claimParty]);

	// Early return AFTER all hooks have been called
	if (!open || !claimParty) return null;

	const party = freshClaimParty.party;
	const address = freshClaimParty.address;
	const representative = freshClaimParty.representative;

	const handleClosePartyEdit = () => {
		setEditingParty(false);
		// Invalidate claim parties query to refresh the PartyDetailDialog data
		if (claimId) {
			utils.party.getClaimParties.invalidate({ claimId });
		}
	};

	const handleCloseAddressEdit = () => {
		setEditingAddress(false);
		// Invalidate claim parties query to refresh the PartyDetailDialog data
		if (claimId) {
			utils.party.getClaimParties.invalidate({ claimId });
		}
	};

	const handleCloseRepEdit = () => {
		setEditingRepresentative(false);
		// Invalidate claim parties query to refresh the PartyDetailDialog data
		if (claimId) {
			utils.party.getClaimParties.invalidate({ claimId });
		}
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
						editLabel="Edit Party"
						onEdit={() => setEditingParty(true)}
					>
						<DetailRow label="Name" value={party.name} />
						<DetailRow
							label="Type"
							value={party.party_type === 'entity' ? 'Entity' : 'Facilitator'}
						/>
						<DetailRow
							label="Role"
							value={
								<Box display="flex" gap={0.5} flexWrap="wrap">
									{Array.isArray(freshClaimParty.role) && freshClaimParty.role.map((r: string) => (
										<Chip
											key={r}
											label={capitalize(r.replace(/_/g, ' '))}
											size="small"
											color="primary"
											sx={{ height: 20, fontSize: 11 }}
										/>
									))}
								</Box>
							}
						/>
						{party.organization && <DetailRow label="Organization" value={party.organization} />}
						{party.email && <DetailRow label="Email" value={party.email} />}
						{party.phone && <DetailRow label="Phone" value={party.phone} />}
						{formatAddressInline(party) && <DetailRow label="Address" value={formatAddressInline(party)} />}
						{party.notes && <DetailRow label="Notes" value={party.notes} />}
					</Section>
				)}

				{/* Address Information Section */}
				{address && (
					<Section
						title="Address Information"
						editLabel="Edit Address"
						onEdit={() => setEditingAddress(true)}
					>
						<DetailRow label="Label" value={address.name || 'Unnamed'} />
						{formatAddressInline(address) && <DetailRow label="Address" value={formatAddressInline(address)} />}
					</Section>
				)}

				{/* Representative Information Section - Facilitators (structured) */}
				{party.party_type === 'facilitator' && representative && (
					<Section
						title="Representative Information"
						editLabel="Edit Representative"
						onEdit={() => setEditingRepresentative(true)}
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

				{/* Representative Information Section - Entities (free-form) */}
				{party.party_type === 'entity' && (freshClaimParty.representative_name ||
					freshClaimParty.representative_title ||
					freshClaimParty.representative_email ||
					freshClaimParty.representative_phone) && (
					<Section title="Representative Information">
						{freshClaimParty.representative_name && (
							<DetailRow label="Name" value={freshClaimParty.representative_name} />
						)}
						{freshClaimParty.representative_title && (
							<DetailRow label="Title" value={freshClaimParty.representative_title} />
						)}
						{freshClaimParty.representative_email && (
							<DetailRow label="Email" value={freshClaimParty.representative_email} />
						)}
						{freshClaimParty.representative_phone && (
							<DetailRow label="Phone" value={freshClaimParty.representative_phone} />
						)}
					</Section>
				)}

				{/* Claim Party Notes */}
				{freshClaimParty.notes && (
					<Section title="Linking Notes">
						<Typography fontSize={13} color="text.secondary">
							{freshClaimParty.notes}
						</Typography>
					</Section>
				)}
			</Box>

			{/* Second-level Edit Dialogs */}
			{editingParty && party && (
				<PartyDialog
					party={{
						...party,
						// Map contact fields to the format PartyDialog expects
						primary_email: party.email,
						primary_phone: party.phone,
						primary_street_address: party.street_address,
						primary_city: party.city,
						primary_state: party.state,
						primary_postal_code: party.postal_code,
						primary_country: party.country,
					}}
					onClose={handleClosePartyEdit}
				/>
			)}

			{editingAddress && address && (
				<AddressDialog
					address={{
						...address,
						party_name: party?.name,
					}}
					onClose={handleCloseAddressEdit}
				/>
			)}

			{editingRepresentative && representative && (
				<RepresentativeDialog
					representative={{
						...representative,
						party_name: party?.name,
					}}
					onClose={handleCloseRepEdit}
				/>
			)}
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
							'&:hover': { textDecoration: 'underline' },
						}}
						onClick={onEdit}
					>
						{editLabel}
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
