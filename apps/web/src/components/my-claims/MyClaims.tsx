'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Paper, IconButton, PopperProps, Typography, Button, Tabs, Tab } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ClaimDetailPanel from '@/components/admin/ClaimDetailPanel';
import ClaimStatusSelect from '@/components/common/ClaimStatusSelect';
import RecoveryStatusSelect from '@/components/common/RecoveryStatusSelect';
import MyClaimsMetrics from './MyClaimsMetrics';
import MyClaimsDeadlines from './MyClaimsDeadlines';
import MyClaimsQueueTable, { type MyClaimListItem } from './MyClaimsQueueTable';
import CustomNoRowsOverlay from '@/components/common/CustomNoRowsOverlay';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import ClaimStatusCell from '@/components/metrics/Claims/ClaimStatusCell';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicPopper from '@/components/common/BasicPopper';
import Toolbar from '@/components/common/Toolbar';
import Search from '@mui/icons-material/Search';
import FileDownload from '@mui/icons-material/FileDownload';
import FilterList from '@mui/icons-material/FilterList';
import Clear from '@mui/icons-material/Clear';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import Desk from '@mui/icons-material/Desk';
import Person from '@mui/icons-material/Person';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatMDYAbv, formatUser } from '@/lib/utils/utils';
import dayjs from 'dayjs';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimStatus, RecoveryStatus } from '@/config/enums';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import useDebounce from '@/lib/utils/useDebounce';
import config from '@/config/config';

export default function MyClaims() {
	const showDeskHierarchy = config.FEATURES.DESK_HIERARCHY;
	const [activeTab, setActiveTab] = useState(showDeskHierarchy ? 0 : 1); // 0 = Desk Queue, 1 = Direct Assignments
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const claimTrpc = useClaimTrpc();

	// URL filters hook
	const { getParam, setParams, clearParams, setParam } = useUrlFilters();

	// Applied filter states (read from URL params)
	const appliedClaimStatus = getParam('status');
	const appliedRecoveryStatus = getParam('recovery_status');
	const appliedSearch = getParam('search') ?? '';

	// Draft filter states (in the popper, not yet applied)
	const [draftClaimStatus, setDraftClaimStatus] = useState<string | null>(null);
	const [draftRecoveryStatus, setDraftRecoveryStatus] = useState<string | null>(null);

	// Search state - synced with URL param
	const [searchTerm, setSearchTerm] = useState(appliedSearch);

	// Selected claim for detail panel
	const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);

	// Filters popper
	const [filtersAnchorEl, setFiltersAnchorEl] = useState<PopperProps['anchorEl']>();

	// Debounce search - write to URL param
	const debouncedSearch = useCallback(
		useDebounce((search: string) => setParam('search', search), 500),
		[setParam]
	);

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

	// Fetch direct assignment claims
	const { data: directData, isFetching: directFetching } = claimTrpc.listMyClaims(
		{
			searchTerm: appliedSearch || undefined,
			claimStatus: (appliedClaimStatus as ClaimStatus) || undefined,
			recoveryStatus: (appliedRecoveryStatus as RecoveryStatus) || undefined,
		},
		{
			refetchOnMount: 'always',
			refetchOnWindowFocus: true,
			staleTime: 0,
		}
	);

	// Fetch desk queue claims (only if feature enabled)
	const { data: deskData, isFetching: deskFetching } = claimTrpc.listMyDeskClaims(
		{
			searchTerm: appliedSearch || undefined,
			claimStatus: (appliedClaimStatus as ClaimStatus) || undefined,
			recoveryStatus: (appliedRecoveryStatus as RecoveryStatus) || undefined,
		},
		{
			enabled: showDeskHierarchy,
			refetchOnMount: 'always',
			refetchOnWindowFocus: true,
			staleTime: 0,
		}
	);

	// Use data from active tab
	const activeData = activeTab === 0 ? deskData : directData;
	const rows = activeData?.rows ?? [];
	const count = activeData?.count ?? 0;
	const metrics = activeData?.metrics ?? { totalValue: 0, avgDaysInQueue: 0 };
	const isFetching = activeTab === 0 ? deskFetching : directFetching;

	// Handle panel close - clear selected claim from URL
	const handleClosePanel = () => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.delete('selected');
		router.push(`${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`);
	};

	// Handle opening filters popper - sync draft states with applied states
	const handleOpenFilters = (e: React.MouseEvent) => {
		setDraftClaimStatus(appliedClaimStatus);
		setDraftRecoveryStatus(appliedRecoveryStatus);
		setFiltersAnchorEl(e.currentTarget);
	};

	// Apply filters from draft to URL params
	const handleApplyFilters = () => {
		setParams({
			status: draftClaimStatus,
			recovery_status: draftRecoveryStatus,
		});
		setFiltersAnchorEl(null);
	};

	// Clear all filters from URL params
	const handleClearAllFilters = () => {
		clearParams(['selected']);
		setDraftClaimStatus(null);
		setDraftRecoveryStatus(null);
		setSearchTerm('');
	};

	// Handle closing filters popper
	const handleCloseFilters = useCallback(() => {
		setFiltersAnchorEl(null);
	}, []);

	const hasActiveFilters = appliedClaimStatus || appliedRecoveryStatus || appliedSearch;

	return (
		<Box display="flex" gap={2} width="100%" height="100%" padding="20px">
			<Box flexShrink={0}>
				<MyClaimsDeadlines />
			</Box>
			<Box flex={1} minWidth={0} height="100%">
				<Paper sx={styles.paper} className="flex-col-start">
					{/* Title */}
					<Box width="100%" padding="10px">
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

					{/* Tabs (only show if desk hierarchy enabled) */}
					{showDeskHierarchy && (
						<Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
							<Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
								<Tab icon={<Desk sx={{ fontSize: 18 }} />} iconPosition="start" label="Desk Queue" />
								<Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="Direct Assignments" />
							</Tabs>
						</Box>
					)}

					{/* Queue Table */}
					<MyClaimsQueueTable
						rows={rows}
						count={count}
						isFetching={isFetching}
						searchTerm={searchTerm}
						setSearchTerm={setSearchTerm}
						appliedClaimStatus={appliedClaimStatus}
						appliedRecoveryStatus={appliedRecoveryStatus}
						appliedSearch={appliedSearch}
						hasActiveFilters={hasActiveFilters}
						filtersAnchorEl={filtersAnchorEl}
						handleOpenFilters={handleOpenFilters}
						handleCloseFilters={handleCloseFilters}
						handleClearAllFilters={handleClearAllFilters}
						draftClaimStatus={draftClaimStatus}
						setDraftClaimStatus={setDraftClaimStatus}
						draftRecoveryStatus={draftRecoveryStatus}
						setDraftRecoveryStatus={setDraftRecoveryStatus}
						handleApplyFilters={handleApplyFilters}
						showDeskColumn={activeTab === 0}
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
		border: 1,
		borderColor: 'divider',
		padding: '15px 15px 0px',
	},
	indicator: {
		width: 8,
		height: 8,
		borderRadius: '50%',
		marginLeft: 1,
	},
};
