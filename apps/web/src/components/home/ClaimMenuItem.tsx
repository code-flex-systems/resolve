'use client';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import CurrencyExchange from '@mui/icons-material/CurrencyExchange';
import { Box, MenuItem, Stack, Typography } from '@mui/material';
import { formatMDYAbv } from '@/lib/utils/utils';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { Claim } from '@/types/types';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';

export default function ClaimMenuItem(props: {
	claim: Claim | null;
	onClose?: () => void;
	onSelect?: (claimId: number) => void;
	selected?: boolean;
}) {
	const { claim, onClose, onSelect, selected } = props;

	const claimAmount = claim?.claim_amount ? parseFloat(claim.claim_amount.toString()) : null;

	const handleClick = () => {
		if (onSelect && claim?.id) {
			// If onSelect is provided, use it (hero mode)
			onSelect(claim.id);
		} else {
			// Otherwise, use the store (standard mode)
			useChecklistsStore.getState().updateSelectedClaim(claim);
		}
		if (typeof onClose === 'function') onClose();
	};

	return (
		<MenuItem sx={styles.menuItem} onClick={handleClick}>
			<Stack width="100%" spacing={0.5}>
				{/* Top row: Claim number and amount */}
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1}>
						<ContentPasteSearch sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
						<Typography variant="subtitle1" fontSize={16} fontWeight={600}>
							{claim?.claim_number ?? 'N/A'}
						</Typography>
						{selected && <CheckCircle sx={{ color: theme.palette.primary.main, fontSize: 20 }} />}
					</Box>

					{/* Claim Amount Badge */}
					{claimAmount !== null && (
						<Box
							px={1.5}
							py={0.5}
							borderRadius={2}
							bgcolor={theme.palette.primary.light}
							display="flex"
							alignItems="center"
							gap={0.5}
						>
							<CurrencyExchange sx={{ fontSize: 14, color: 'white' }} />
							<Typography fontSize={12} fontWeight={600} color="white">
								{formatCurrencyExact(claimAmount)}
							</Typography>
						</Box>
					)}
				</Box>

				{/* Second row: Client and Insured */}
				<Box display="flex" alignItems="center" gap={1}>
					{claim?.client && (
						<Typography variant="body2" fontSize={13} color="text.primary">
							{claim.client}
						</Typography>
					)}
					{claim?.client && claim?.insured && (
						<Box width={4} height={4} borderRadius="50%" bgcolor={BASE_COLOR_LIGHT} />
					)}
					{claim?.insured && (
						<Typography variant="body2" fontSize={13} color="text.secondary">
							{claim.insured}
						</Typography>
					)}
				</Box>

				{/* Third row: Date of loss */}
				{claim?.date_of_loss && (
					<Typography variant="caption" fontSize={12} color={BASE_COLOR_LIGHT}>
						Loss Date: {formatMDYAbv(claim.date_of_loss.toString())}
					</Typography>
				)}
			</Stack>
		</MenuItem>
	);
}

const styles = {
	menuItem: {
		minHeight: 80,
		padding: '16px',
		borderBottom: '1px solid #f0f0f0',
		transition: 'background-color 0.2s ease',
		'&:hover': {
			backgroundColor: '#F0F7F5 !important',
		},
		'&:last-child': {
			borderBottom: 'none',
		},
		'&.Mui-focused': {
			backgroundColor: '#F0F7F5',
		},
	},
};
