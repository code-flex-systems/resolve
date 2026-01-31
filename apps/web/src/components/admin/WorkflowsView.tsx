'use client';

import { useState, useMemo } from 'react';
import {
	Box,
	Paper,
	TextField,
	Typography,
	InputAdornment,
	Stack,
	Chip,
	Skeleton,
	MenuItem,
	Select,
	FormControl,
	Divider,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import Public from '@mui/icons-material/Public';
import LocationOn from '@mui/icons-material/LocationOn';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import WorkflowDetailPanel from '@/components/admin/WorkflowDetailPanel';
import WorkflowDefinitionFormDialog from '@/components/admin/WorkflowDefinitionFormDialog';
import { useWorkflowTrpc } from '@/hooks/trpc/useWorkflowTrpc';
import { useDeskLocationStore } from '@/stores/useDeskLocationStore';
import { BORDER_LIGHT, BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';

export default function WorkflowsView() {
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [isActive, setIsActive] = useState(true);

	const { listDefinitions } = useWorkflowTrpc();
	const deskStore = useDeskLocationStore();

	const { data: definitionsData, isLoading } = listDefinitions({ isActive });
	const allDefinitions = definitionsData?.rows || [];

	// Client-side search filter
	const definitions = useMemo(() => {
		if (!searchTerm) return allDefinitions;
		const term = searchTerm.toLowerCase();
		return allDefinitions.filter((def) => def.name.toLowerCase().includes(term));
	}, [allDefinitions, searchTerm]);

	const handleCreateSuccess = (workflowId: number) => {
		setSelectedWorkflowId(workflowId);
	};

	return (
		<Box display="flex" height="100%" sx={{ overflow: 'hidden' }}>
			{/* Left Panel - Workflow List */}
			<Box
				sx={{
					...containerStyles.beveledCard,
					width: 320,
				}}
			>
				{/* Title */}
				<Box p={2} pb={1}>
					<Typography variant="h6" mb={1}>
						Workflows
					</Typography>
				</Box>

				{/* Search */}
				<Box px={2} pb={1}>
					<TextField
						size="small"
						fullWidth
						placeholder="Search workflows..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<Search fontSize="small" />
									</InputAdornment>
								),
							},
						}}
					/>
				</Box>

				{/* Active/Inactive Filter and Add New Button */}
				<Box px={2} pb={1} display="flex" justifyContent="space-between" gap={1}>
					<FormControl size="small" sx={{ minWidth: 100 }}>
						<Select
							value={isActive ? 'active' : 'inactive'}
							onChange={(e) => setIsActive(e.target.value === 'active')}
						>
							<MenuItem value="active">Active</MenuItem>
							<MenuItem value="inactive">Inactive</MenuItem>
						</Select>
					</FormControl>

					<BasicButtonStyled
						buttonProps={{
							variant: 'contained',
							size: 'small',
							onClick: () => setShowCreateDialog(true),
							startIcon: <Add />,
							sx: { height: 35 },
						}}
					>
						Workflow
					</BasicButtonStyled>
				</Box>

				<div style={{ padding: '0px 10px 10px' }}>
					<Divider sx={{ padding: '5px' }} />
				</div>

				{/* Workflow List */}
				<Box flex={1} sx={{ overflowY: 'auto', px: 2, pb: 2 }}>
					{isLoading ? (
						<Stack spacing={1}>
							<Skeleton variant="rectangular" height={80} />
							<Skeleton variant="rectangular" height={80} />
							<Skeleton variant="rectangular" height={80} />
						</Stack>
					) : definitions.length === 0 ? (
						<Typography fontSize={13} color="text.secondary" textAlign="center" mt={2}>
							{searchTerm ? 'No workflows found' : 'No workflows yet'}
						</Typography>
					) : (
						<Stack spacing={1}>
							{definitions.map((definition) => {
								const isSelected = selectedWorkflowId === definition.id;
								const location = definition.desk_location_id
									? deskStore.locationsById.get(definition.desk_location_id)
									: null;

								return (
									<Paper
										key={definition.id}
										variant="outlined"
										sx={{
											p: 1.5,
											border: isSelected ? '2px solid' : '1px solid',
											borderColor: isSelected ? 'primary.main' : BORDER_LIGHT,
											bgcolor: isSelected ? 'rgba(33, 181, 255, 0.04)' : 'background.paper',
											cursor: 'pointer',
											transition: 'all 0.2s',
											'&:hover': {
												borderColor: 'primary.light',
											},
										}}
										onClick={() => setSelectedWorkflowId(definition.id)}
									>
										<Typography fontSize={14} fontWeight={isSelected ? 600 : 500} mb={0.5}>
											{definition.name}
										</Typography>

										{definition.description && (
											<Typography
												fontSize={12}
												color="text.secondary"
												mb={1}
												sx={{
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													display: '-webkit-box',
													WebkitLineClamp: 2,
													WebkitBoxOrient: 'vertical',
												}}
											>
												{definition.description}
											</Typography>
										)}

										<Box display="flex" gap={0.5} flexWrap="wrap">
											<Chip
												icon={location ? <LocationOn /> : <Public />}
												label={location ? `Desk Location: ${location.name}` : 'Global'}
												size="small"
												color={location ? 'primary' : 'default'}
												variant="outlined"
												sx={{
													fontSize: 11,
													height: 22,
													'& .MuiChip-icon': { color: location ? 'primary.main' : undefined },
												}}
											/>
											{!definition.is_active && (
												<Chip
													label="Inactive"
													size="small"
													color="default"
													sx={{ fontSize: 11, height: 20 }}
												/>
											)}
										</Box>
									</Paper>
								);
							})}
						</Stack>
					)}
				</Box>
			</Box>

			{/* Right Panel - Workflow Detail */}
			<Box
				flex={1}
				sx={{
					overflowY: 'auto',
					bgcolor: 'background.default',
				}}
			>
				{selectedWorkflowId ? (
					<WorkflowDetailPanel workflowId={selectedWorkflowId} />
				) : (
					<Box display="flex" alignItems="center" justifyContent="center" height="100%" p={3}>
						<Typography fontSize={14} color="text.secondary">
							Select a workflow to view details
						</Typography>
					</Box>
				)}
			</Box>

			{/* Create Dialog */}
			{showCreateDialog && (
				<WorkflowDefinitionFormDialog
					onClose={() => setShowCreateDialog(false)}
					onSuccess={handleCreateSuccess}
				/>
			)}
		</Box>
	);
}
