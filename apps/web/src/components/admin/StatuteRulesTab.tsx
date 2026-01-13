'use client';

import { useMemo } from 'react';
import { useStatuteTrpc } from '@/hooks/trpc/useStatuteTrpc';
import { STATUTE_TORT_TYPES } from '@/config/statuteConfig';
import { Chip, Fade, Paper, Tooltip, Typography, Box, IconButton } from '@mui/material';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import GavelIcon from '@mui/icons-material/Gavel';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { useAdminStore } from '@/stores/useAdminStore';
import StatuteRuleDialog from './StatuteRuleDialog';
import { US_JURISDICTIONS } from '@/config/usJurisdictions';
import type { StatuteRules, TortTypeConfig, NegligenceType } from '@/schemas/statuteSchemas';
import { getNegligenceTypeLabel } from '@/schemas/statuteSchemas';

/**
 * Render cell value for a tort type column.
 * Shows: N/A, years, or Chip with tooltip for conditional rules.
 */
function renderTortCell(rules: StatuteRules | undefined, tortType: string): React.ReactNode {
	if (!rules || !rules[tortType]) {
		return (
			<Typography color="text.secondary" height="100%">
				-
			</Typography>
		);
	}

	const config = rules[tortType] as TortTypeConfig;
	const hasConditionalRules = config.rules && config.rules.length > 0;

	// No default and no rules = unconfigured
	if (config.default_years === null && !hasConditionalRules) {
		return (
			<Typography color="text.secondary" height="100%">
				N/A
			</Typography>
		);
	}

	// Has conditional rules - show as chip with tooltip
	if (hasConditionalRules) {
		return (
			<Tooltip
				title={
					<Box>
						{config.default_years !== null && (
							<Typography color="white">Default: {config.default_years} years</Typography>
						)}
						{config.rules.map((rule, idx) => (
							<Typography key={idx} color="white">
								{rule.lob && `LOB: ${rule.lob}`}
								{rule.date_from && ` From: ${rule.date_from}`}
								{rule.date_to && ` To: ${rule.date_to}`}
								{` = ${rule.years} years`}
							</Typography>
						))}
					</Box>
				}
			>
				<Chip label="..." size="small" color="info" variant="outlined" sx={{ cursor: 'pointer' }} />
			</Tooltip>
		);
	}

	// Simple default years
	return <Typography>{config.default_years} yrs</Typography>;
}

/**
 * Render the combined negligence law cell.
 * Shows: type label, bar percentage, and notes indicator.
 */
function renderNegligenceCell(
	type: NegligenceType | null,
	barPercent: number | null,
	notes: string | null
): React.ReactNode {
	if (!type) {
		return (
			<Typography color="text.secondary" height="100%">
				-
			</Typography>
		);
	}

	const label = getNegligenceTypeLabel(type);
	const barText = barPercent !== null ? `${barPercent}% bars` : 'varies';

	return (
		<Box display="flex" alignItems="center" gap={1} height="100%">
			<Typography variant="body2">
				{label}, {barText}
			</Typography>
			{notes && (
				<Tooltip title={notes}>
					<InfoOutlinedIcon fontSize="small" sx={{ color: 'warning.main', cursor: 'pointer' }} />
				</Tooltip>
			)}
		</Box>
	);
}

function NoRowsOverlay() {
	return (
		<CustomNoRowsOverlay
			text="No statute rules found"
			icon={<GavelIcon sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function StatuteRulesTab() {
	const showStatuteRuleDialog = useAdminStore((state) => state.showStatuteRuleDialog);
	const setStatuteStateCode = useAdminStore((state) => state.setStatuteStateCode);
	const toggleStatuteRuleDialog = useAdminStore((state) => state.toggleStatuteRuleDialog);

	const { list } = useStatuteTrpc();

	// Fetch all statute rules
	const { data: statuteRules = [], isFetching: rulesFetching } = list({});

	// Build map for O(1) lookups by state code
	const rulesByState = useMemo(() => {
		const map = new Map<string, (typeof statuteRules)[0]>();
		for (const rule of statuteRules) {
			map.set(rule.state_code, rule);
		}
		return map;
	}, [statuteRules]);

	// Build rows - combine jurisdictions with rules (O(1) lookup via map)
	const rows = useMemo(
		() =>
			US_JURISDICTIONS.map((jurisdiction) => {
				const rule = rulesByState.get(jurisdiction.code);
				return {
					id: jurisdiction.code,
					state_code: jurisdiction.code,
					state_name: jurisdiction.name,
					rules: (rule?.rules as StatuteRules) ?? {},
					negligence_type: (rule?.negligence_type as NegligenceType | null) ?? null,
					negligence_bar_percent: rule?.negligence_bar_percent ?? null,
					negligence_notes: rule?.negligence_notes ?? null,
				};
			}),
		[rulesByState]
	);

	// Build dynamic columns for each tort type (using hardcoded config)
	const columns = useMemo<GridColDef[]>(() => {
		const tortColumns: GridColDef[] = STATUTE_TORT_TYPES.map((tort) => ({
			headerName: tort.label,
			field: tort.value,
			width: 130,
			renderCell: ({ row }: GridRenderCellParams) => (
				<Box display="flex" alignItems="center" height="100%">
					{renderTortCell(row.rules, tort.value)}
				</Box>
			),
			sortable: false,
		}));

		return [
			{
				headerName: 'State',
				field: 'state_name',
				width: 200,
				renderHeader: (params) => (
					<IconHeaderCell {...params} icon={<GavelIcon style={{ color: BASE_COLOR_LIGHT }} />} />
				),
			},
			{
				headerName: 'Code',
				field: 'state_code',
				width: 70,
			},
			...tortColumns,
			{
				headerName: 'Negligence Law',
				field: 'negligence',
				width: 220,
				sortable: false,
				renderCell: ({ row }: GridRenderCellParams) => (
					<Box display="flex" alignItems="center" height="100%">
						{renderNegligenceCell(row.negligence_type, row.negligence_bar_percent, row.negligence_notes)}
					</Box>
				),
			},
			{
				headerName: '',
				field: 'actions',
				width: 60,
				sortable: false,
				filterable: false,
				disableColumnMenu: true,
				renderCell: ({ row }: GridRenderCellParams) => (
					<Box display="flex" alignItems="center" justifyContent="center" width="100%" height="100%">
						<IconButton
							size="small"
							onClick={(e) => {
								e.stopPropagation();
								setStatuteStateCode(row.state_code);
								toggleStatuteRuleDialog();
							}}
						>
							<SettingsIcon fontSize="small" />
						</IconButton>
					</Box>
				),
			},
		];
	}, [setStatuteStateCode, toggleStatuteRuleDialog]);

	return (
		<Fade in={true} timeout={1000}>
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar
						left={<Typography variant="h6">Statute of Limitations Rules</Typography>}
						height={50}
						padding={'0px 10px'}
					/>
					<div style={styles.table}>
						<DataGridPro
							columns={columns}
							columnHeaderHeight={45}
							loading={rulesFetching}
							slots={{
								noRowsOverlay: NoRowsOverlay,
								noResultsOverlay: NoRowsOverlay,
							}}
							slotProps={{
								loadingOverlay: {
									noRowsVariant: 'linear-progress',
									variant: 'linear-progress',
								},
							}}
							rows={rows}
							rowHeight={50}
							hideFooter
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							pinnedColumns={{ right: ['actions'] }}
							sx={styles.tableOverrides}
						/>
					</div>
				</Paper>

				{showStatuteRuleDialog && <StatuteRuleDialog />}
			</div>
		</Fade>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
	},
	paper: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column' as const,
		padding: '15px 15px 0px',
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
		...dataGridFocusStyles,
	},
};
