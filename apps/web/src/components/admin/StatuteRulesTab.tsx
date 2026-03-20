'use client';

import { IconGavel, IconInfoCircle, IconSettings } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import { useMemo, useState } from 'react';
import { useStatuteTrpc } from '@/hooks/trpc/useStatuteTrpc';
import { STATUTE_TORT_TYPES } from '@/config/statuteConfig';
import { DataGridPro, GridColDef, GridPinnedColumnFields, GridRenderCellParams } from '@mui/x-data-grid-pro';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { dataGridFocusStyles } from '@/styles/theme';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { useAdminStore } from '@/stores/useAdminStore';
import StatuteRuleDialog from './StatuteRuleDialog';
import { US_JURISDICTIONS } from '@/config/usJurisdictions';
import type { StatuteRules, TortTypeConfig, NegligenceType } from '@/schemas/statuteSchemas';
import { getNegligenceTypeLabel } from '@/schemas/statuteSchemas';
import { Dialog } from '@mui/material';

/**
 * Render cell value for a tort type column.
 * Shows: N/A, years, or Chip with tooltip for conditional rules.
 */
function renderTortCell(rules: StatuteRules | undefined, tortType: string): React.ReactNode {
	if (!rules || !rules[tortType]) {
		return (
			<span style={{ color: 'var(--text-secondary)', height: '100%' }}>
				-
			</span>
		);
	}

	const config = rules[tortType] as TortTypeConfig;
	const hasConditionalRules = config.rules && config.rules.length > 0;

	// No default and no rules = unconfigured
	if (config.default_years === null && !hasConditionalRules) {
		return (
			<span style={{ color: 'var(--text-secondary)', height: '100%' }}>
				N/A
			</span>
		);
	}

	// Has conditional rules - show as chip with tooltip
	if (hasConditionalRules) {
		return (
			<Tooltip
				content={
					<div>
						{config.default_years !== null && (
							<span style={{ color: 'white' }}>Default: {config.default_years} years</span>
						)}
						{config.rules.map((rule, idx) => (
							<span key={idx} style={{ color: 'white' }}>
								{rule.lob && `LOB: ${rule.lob}`}
								{rule.date_from && ` From: ${rule.date_from}`}
								{rule.date_to && ` To: ${rule.date_to}`}
								{` = ${rule.years} years`}
							</span>
						))}
					</div>
				}
			>
				<Chip  size="sm" color="info" variant="outlined" style={{ cursor: 'pointer' }}>...</Chip>
			</Tooltip>
		);
	}

	// Simple default years
	return <span>{config.default_years} yrs</span>;
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
			<span style={{ color: 'var(--text-secondary)', height: '100%' }}>
				-
			</span>
		);
	}

	const label = getNegligenceTypeLabel(type);
	const barText = barPercent !== null ? `${barPercent}% bars` : 'varies';

	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%' }}>
			<span>
				{label}, {barText}
			</span>
			{notes && (
				<Tooltip content={notes}>
					<IconInfoCircle size={20} style={{ color: 'var(--status-warning)', cursor: 'pointer' }} />
				</Tooltip>
			)}
		</div>
	);
}

function NoRowsOverlay() {
	return (
		<CustomNoRowsOverlay
			text="No statute rules found"
			icon={<IconGavel size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

export default function StatuteRulesTab() {
	const showStatuteRuleDialog = useAdminStore((state) => state.showStatuteRuleDialog);
	const setStatuteStateCode = useAdminStore((state) => state.setStatuteStateCode);
	const toggleStatuteRuleDialog = useAdminStore((state) => state.toggleStatuteRuleDialog);

	const [isManageMode, setIsManageMode] = useState(false);

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

	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

	// Build dynamic columns for each tort type (using hardcoded config)
	const columns = useMemo<GridColDef[]>(() => {
		const tortColumns: GridColDef[] = STATUTE_TORT_TYPES.map((tort) => ({
			headerName: tort.label,
			field: tort.value,
			width: 130,
			renderCell: ({ row }: GridRenderCellParams) => (
				<div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
					{renderTortCell(row.rules, tort.value)}
				</div>
			),
			sortable: false,
		}));

		return [
			{
				headerName: 'State',
				field: 'state_name',
				width: 200,
				renderHeader: (params) => (
					<IconHeaderCell {...params} icon={<IconGavel style={{ color: 'var(--text-muted)' }} />} />
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
					<div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
						{renderNegligenceCell(row.negligence_type, row.negligence_bar_percent, row.negligence_notes)}
					</div>
				),
			},
			{
				headerName: '',
				field: 'actions',
				width: 60,
				sortable: false,
				filterable: false,
				disableColumnMenu: true,
				renderCell: ({ row }: GridRenderCellParams) => {
					if (!isManageMode) return null;
					return (
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
							<Button variant="icon" size="sm"
								onClick={(e) => {
									e.stopPropagation();
									setStatuteStateCode(row.state_code);
									toggleStatuteRuleDialog();
								}}
							>
								<IconSettings size={20} />
							</Button>
						</div>
					);
				},
			},
		];
	}, [isManageMode, setStatuteStateCode, toggleStatuteRuleDialog]);

	return (
		<div>
			<div style={styles.container}>
				<div style={styles.paper} className="flex-col-start">
					<Toolbar
						left={<span>Statute of Limitations Rules</span>}
						right={
							<Tooltip content="Manage">
								<Button variant="icon" size="sm"
									onClick={() => setIsManageMode(!isManageMode)}
									style={{ marginLeft: 8, backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined }}
								>
									<IconSettings size={20} style={{ color: isManageMode ? 'primary.main' : undefined }} />
								</Button>
							</Tooltip>
						}
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
							pinnedColumns={pinnedColumns}
							style={styles.tableOverrides}
						/>
					</div>
				</div>

				{showStatuteRuleDialog && <StatuteRuleDialog />}
			</div>
		</div>
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
