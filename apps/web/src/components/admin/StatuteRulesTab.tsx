'use client';

import { IconGavel, IconInfoCircle, IconSettings } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import { useMemo, useState } from 'react';
import { useStatuteTrpc } from '@/hooks/trpc/useStatuteTrpc';
import { STATUTE_TORT_TYPES } from '@/config/statuteConfig';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { useAdminStore } from '@/stores/useAdminStore';
import StatuteRuleDialog from './StatuteRuleDialog';
import { US_JURISDICTIONS } from '@/config/usJurisdictions';
import type { StatuteRules, TortTypeConfig, NegligenceType } from '@/schemas/statuteSchemas';
import { getNegligenceTypeLabel } from '@/schemas/statuteSchemas';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

/**
 * Render cell value for a tort type column.
 * Shows: N/A, years, or Chip with tooltip for conditional rules.
 */
function renderTortCell(rules: StatuteRules | undefined, tortType: string): React.ReactNode {
	if (!rules || !rules[tortType]) {
		return <span style={{ color: 'var(--text-secondary)', height: '100%' }}>-</span>;
	}

	const config = rules[tortType] as TortTypeConfig;
	const hasConditionalRules = config.rules && config.rules.length > 0;

	// No default and no rules = unconfigured
	if (config.default_years === null && !hasConditionalRules) {
		return <span style={{ color: 'var(--text-secondary)', height: '100%' }}>N/A</span>;
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
				<Chip size="sm" color="info" variant="outlined" style={{ cursor: 'pointer' }}>
					...
				</Chip>
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
		return <span style={{ color: 'var(--text-secondary)', height: '100%' }}>-</span>;
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

	// Build dynamic columns for each tort type (using hardcoded config)
	const columns = useMemo<ColumnDef<any, any>[]>(() => {
		const tortColumns: ColumnDef<any, any>[] = STATUTE_TORT_TYPES.map((tort) => ({
			header: tort.label,
			field: tort.value,
			size: 130,
			cell: ({ row: { original: row } }: any) => (
				<div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
					{renderTortCell(row.rules, tort.value)}
				</div>
			),
			enableSorting: false,
		}));

		return [
			{
				accessorKey: 'state_name',
				size: 200,
				header: (params) => (
					<IconHeaderCell {...params} icon={<IconGavel style={{ color: 'var(--text-muted)' }} />} />
				),
			},
			{
				header: 'Code',
				accessorKey: 'state_code',
				size: 70,
			},
			...tortColumns,
			{
				header: 'Negligence Law',
				accessorKey: 'negligence',
				size: 220,
				enableSorting: false,
				cell: ({ row: { original: row } }: any) => (
					<div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
						{renderNegligenceCell(row.negligence_type, row.negligence_bar_percent, row.negligence_notes)}
					</div>
				),
			},
			{
				header: '',
				accessorKey: 'actions',
				size: 60,
				enableSorting: false,
				cell: ({ row: { original: row } }: any) => {
					if (!isManageMode) return null;
					return (
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '100%',
								height: '100%',
							}}
						>
							<Button
								variant="icon"
								size="sm"
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
				<Card variant="beveled" padding="md" style={styles.paper}>
					<Toolbar
						left={<span>Statute of Limitations Rules</span>}
						right={
							<Tooltip content="Manage">
								<Button
									variant="icon"
									size="sm"
									onClick={() => setIsManageMode(!isManageMode)}
									style={{
										marginLeft: 8,
										backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined,
									}}
								>
									<IconSettings
										size={20}
										style={{ color: isManageMode ? 'var(--text-accent)' : undefined }}
									/>
								</Button>
							</Tooltip>
						}
						height={50}
						padding={'0px 10px'}
					/>
					<div style={styles.table}>
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={rulesFetching}
							rows={rows}
							rowHeight={50}
							hideFooter
							pinnedRight={isManageMode ? ['actions'] : []}
						/>
					</div>
				</Card>

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
		display: 'flex',
		flexDirection: 'column' as const,
		width: '100%',
		height: '100%',
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100vh - 190px)',
	},
};
