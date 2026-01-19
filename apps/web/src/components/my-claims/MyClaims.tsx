'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Paper, PopperProps, Typography } from '@mui/material';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ClaimDetailPanel from '@/components/admin/ClaimDetailPanel';
import MyClaimsMetrics from './MyClaimsMetrics';
import MyClaimsDeadlines from './MyClaimsDeadlines';
import MyClaimsQueueTable, { type MyClaimListItem } from './MyClaimsQueueTable';
import { ClaimSubstatus, RecoveryStatus } from '@/config/enums';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import useDebounce from '@/lib/utils/useDebounce';

export default function MyClaims() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const claimTrpc = useClaimTrpc();

	// URL filters hook
	const { getParam, setParams, clearParams, setParam } = useUrlFilters();

	// Applied filter states (read from URL params)
	const appliedSubstatus = getParam('substatus');
	const appliedRecoveryStatus = getParam('recovery_status');
	const appliedSearch = getParam('search') ?? '';

	// Draft filter states (in the popper, not yet applied)
	const [draftSubstatus, setDraftSubstatus] = useState<string | null>(null);
	const [draftRecoveryStatus, setDraftRecoveryStatus] = useState<string | null>(null);

	// Search state - synced with URL param
	const [searchTerm, setSearchTerm] = useState('');

	// Selected claim for detail panel
	const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);

	// Filters popper
	const [filtersAnchorEl, setFiltersAnchorEl] = useState<PopperProps['anchorEl']>();

	// Debounce search - write to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(appliedSearch);
	}, [appliedSearch]);

	// Debounce local search input to URL param
	useEffect(() => {
		debouncedSearch(searchTerm);
	}, [searchTerm, debouncedSearch]);

	// Sync selectedClaimId with URL query param
	useEffect(() => {
		const selected = searchParams.get('selected');
		if (selected) {
			const claimId = parseInt(selected, 10);
			if (!isNaN(claimId)) {
				setSelectedClaimId(claimId);
			}
		} else {
			setSelectedClaimId(null);
		}
	}, [searchParams]);

	// Fetch claims from desk queue
	const { data, isFetching } = claimTrpc.listMyDeskClaims(
		{
			searchTerm: appliedSearch || undefined,
			substatus: (appliedSubstatus as ClaimSubstatus) || undefined,
			recoveryStatus: (appliedRecoveryStatus as RecoveryStatus) || undefined,
		},
		{
			refetchOnMount: 'always',
			refetchOnWindowFocus: true,
			staleTime: 0,
		}
	);

	const rows = (data?.rows ?? []) as MyClaimListItem[];
	const count = data?.count ?? 0;
	const metrics = data?.metrics ?? { totalValue: 0, avgDaysInQueue: 0 };

	// Handle panel close - clear selected claim from URL
	const handleClosePanel = () => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.delete('selected');
		router.push(`${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`);
	};

	// Handle opening filters popper - sync draft states with applied states
	const handleOpenFilters = (e: React.MouseEvent) => {
		setDraftSubstatus(appliedSubstatus);
		setDraftRecoveryStatus(appliedRecoveryStatus);
		setFiltersAnchorEl(e.currentTarget);
	};

	// Apply filters from draft to URL params
	const handleApplyFilters = () => {
		setParams({
			substatus: draftSubstatus,
			recovery_status: draftRecoveryStatus,
		});
		setFiltersAnchorEl(null);
	};

	// Clear all filters from URL params
	const handleClearAllFilters = () => {
		clearParams(['selected']);
		setDraftSubstatus(null);
		setDraftRecoveryStatus(null);
		setSearchTerm('');
	};

	// Handle closing filters popper
	const handleCloseFilters = useCallback(() => {
		setFiltersAnchorEl(null);
	}, []);

	const hasActiveFilters = appliedSubstatus || appliedRecoveryStatus || appliedSearch;

	return (
		<Box display="flex" gap={2} width="100%" height="100%" padding="20px">
			<Box flexShrink={0}>
				<MyClaimsDeadlines />
			</Box>
			<Box flex={1} minWidth={0} height="100%">
				<Paper sx={styles.paper} className="flex-col-start">
					{/* Title */}
					<Box width="100%" padding="10px 10px 0px" mb={3}>
						<Typography variant="h6">My Queue</Typography>
					</Box>

					{/* Metrics and Legend */}
					<Box
						width="100%"
						display="flex"
						alignItems="center"
						justifyContent="space-between"
						padding="0px 10px"
					>
						<MyClaimsMetrics
							count={count}
							totalValue={metrics.totalValue}
							avgDaysInQueue={metrics.avgDaysInQueue}
							isLoading={isFetching}
						/>
						<Box display="flex" flexDirection="column" gap={0.5} mr={2}>
							<Typography fontSize={11} fontWeight={600} color="text.secondary" mb={0.5}>
								LAST ACTIVITY
							</Typography>
							<Box display="flex" alignItems="center" gap={0.75}>
								<Box sx={{ ...styles.indicator, bgcolor: 'success.main' }} />
								<Typography fontSize={12}>Today</Typography>
							</Box>
							<Box display="flex" alignItems="center" gap={0.75}>
								<Box sx={{ ...styles.indicator, bgcolor: 'warning.main' }} />
								<Typography fontSize={12}>Within 7 days</Typography>
							</Box>
							<Box display="flex" alignItems="center" gap={0.75}>
								<Box sx={{ ...styles.indicator, bgcolor: 'error.main' }} />
								<Typography fontSize={12}>Over 7 days</Typography>
							</Box>
						</Box>
					</Box>

					{/* Queue Table */}
					<MyClaimsQueueTable
						rows={rows}
						count={count}
						isFetching={isFetching}
						searchTerm={searchTerm}
						setSearchTerm={setSearchTerm}
						appliedSubstatus={appliedSubstatus}
						appliedRecoveryStatus={appliedRecoveryStatus}
						appliedSearch={appliedSearch}
						hasActiveFilters={!!hasActiveFilters}
						filtersAnchorEl={filtersAnchorEl}
						handleOpenFilters={handleOpenFilters}
						handleCloseFilters={handleCloseFilters}
						handleClearAllFilters={handleClearAllFilters}
						draftSubstatus={draftSubstatus}
						setDraftSubstatus={setDraftSubstatus}
						draftRecoveryStatus={draftRecoveryStatus}
						setDraftRecoveryStatus={setDraftRecoveryStatus}
						handleApplyFilters={handleApplyFilters}
						showDeskColumn={true}
					/>
				</Paper>
			</Box>

			{/* Claim Detail Panel */}
			<ClaimDetailPanel claimId={selectedClaimId} open={!!selectedClaimId} onClose={handleClosePanel} />
		</Box>
	);
}

const styles = {
	paper: {
		width: '100%',
		height: '100%',
		padding: '24px 24px 0px',
	},
	indicator: {
		width: 8,
		height: 8,
		borderRadius: '50%',
		marginLeft: 1,
	},
};
