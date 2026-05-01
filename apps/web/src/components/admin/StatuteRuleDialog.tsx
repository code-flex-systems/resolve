'use client';

import { IconChevronDown, IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import Accordion from '@/components/ui/Accordion';
import Input, { Textarea } from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import BasicDialog from '../common/BasicDialog';
import DateField from '../common/DateField';
import { useStatuteTrpc } from '@/hooks/trpc/useStatuteTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { STATUTE_TORT_TYPES, STATUTE_LOB_TYPES } from '@/config/statuteConfig';
import { getJurisdictionName } from '@/config/usJurisdictions';
import type {
	StatuteRules,
	TortTypeConfig,
	ConditionalRule,
	NegligenceType,
} from '@/schemas/statuteSchemas';
import { getBarPercentForType, getNegligenceTypeLabel } from '@/schemas/statuteSchemas';

export default function StatuteRuleDialog() {
	const selectedStatuteStateCode = useAdminStore((state) => state.selectedStatuteStateCode);
	const toggleStatuteRuleDialog = useAdminStore((state) => state.toggleStatuteRuleDialog);
	const setStatuteStateCode = useAdminStore((state) => state.setStatuteStateCode);

	const { get, update } = useStatuteTrpc();

	// Fetch current rule
	const { data: currentRule, isFetching } = get(
		{ stateCode: selectedStatuteStateCode! },
		{ enabled: !!selectedStatuteStateCode }
	);

	const { mutateAsync: updateRule, isPending } = update;

	// Local state for editing
	const [rules, setRules] = useState<StatuteRules>({});
	const [negligenceType, setNegligenceType] = useState<NegligenceType | null>(null);
	const [negligenceNotes, setNegligenceNotes] = useState<string>('');

	// Initialize from current rule
	useEffect(() => {
		if (currentRule?.rules) {
			setRules(currentRule.rules as StatuteRules);
		}
		if (currentRule) {
			setNegligenceType((currentRule.negligence_type as NegligenceType | null) ?? null);
			setNegligenceNotes(currentRule.negligence_notes ?? '');
		}
	}, [currentRule]);

	const handleClose = () => {
		setStatuteStateCode(null);
		toggleStatuteRuleDialog();
	};

	const handleSave = async () => {
		if (!selectedStatuteStateCode) return;
		try {
			await updateRule({
				stateCode: selectedStatuteStateCode,
				rules,
				negligenceType,
				negligenceNotes: negligenceNotes || null,
			});
			handleClose();
		} catch (e) {
			console.error('Error updating statute rule:', e);
		}
	};

	// Negligence type options for dropdown
	const negligenceTypeOptions: { value: NegligenceType; label: string }[] = [
		{ value: 'contributory', label: 'Contributory' },
		{ value: 'pure_comparative', label: 'Pure Comparative' },
		{ value: 'comparative_49', label: 'Comparative (49%)' },
		{ value: 'comparative_50', label: 'Comparative (50%)' },
		{ value: 'slight', label: 'Slight' },
	];

	const getTortConfig = (tortType: string): TortTypeConfig => {
		return rules[tortType] || { default_years: null, rules: [] };
	};

	const updateTortConfig = (tortType: string, config: TortTypeConfig) => {
		setRules((prev) => ({
			...prev,
			[tortType]: config,
		}));
	};

	const addConditionalRule = (tortType: string) => {
		const config = getTortConfig(tortType);
		updateTortConfig(tortType, {
			...config,
			rules: [...config.rules, { years: 0 }],
		});
	};

	const removeConditionalRule = (tortType: string, index: number) => {
		const config = getTortConfig(tortType);
		updateTortConfig(tortType, {
			...config,
			rules: config.rules.filter((_, i) => i !== index),
		});
	};

	const updateConditionalRule = (
		tortType: string,
		index: number,
		updates: Partial<ConditionalRule>
	) => {
		const config = getTortConfig(tortType);
		const newRules = [...config.rules];
		newRules[index] = { ...newRules[index], ...updates };
		updateTortConfig(tortType, { ...config, rules: newRules });
	};

	const stateName = selectedStatuteStateCode ? getJurisdictionName(selectedStatuteStateCode) : '';

	return (
		<BasicDialog
			title={`Statute Rules - ${stateName} (${selectedStatuteStateCode})`}
			primaryAction={{
				label: 'Save',
				onClick: handleSave,
				icon: <IconDeviceFloppy size={20} />,
				disabled: isPending,
			}}
			onClose={handleClose}
			width={700}
			maxHeight="80vh"
		>
			<div style={{ paddingTop: 8 }}>
				{/* Negligence Law Section */}
				<Accordion title="Negligence Law" defaultOpen>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
							<div style={{ minWidth: 200 }}>
								<Dropdown
									label="Negligence Type"
									options={[
										{ value: '', label: 'Not Set' },
										...negligenceTypeOptions.map((opt) => ({
											value: opt.value,
											label: opt.label,
										})),
									]}
									value={negligenceType ?? ''}
									onChange={(v) => setNegligenceType((String(v) as NegligenceType) || null)}
								/>
							</div>
							<Input
								label="Bar Percentage"
								value={
									negligenceType
										? getBarPercentForType(negligenceType) !== null
											? `${getBarPercentForType(negligenceType)}%`
											: 'Varies'
										: ''
								}
								disabled
								style={{ width: 120 }}
							/>
						</div>
						<Textarea
							label="Notes"
							value={negligenceNotes}
							onChange={(e) => setNegligenceNotes(e.target.value)}
							placeholder="Optional notes (e.g., date-based changes, special rules)"
							fullWidth
							rows={2}
						/>
					</div>
				</Accordion>

				{/* Tort Type Sections */}
				{STATUTE_TORT_TYPES.map((tort) => {
					const config = getTortConfig(tort.value);
					return (
						<Accordion key={tort.value} title={tort.label} defaultOpen>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
								{/* Default Years */}
								<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
									<Input
										label="Default Years"
										type="number"
										value={config.default_years ?? ''}
										onChange={(e) => {
											const val = e.target.value;
											updateTortConfig(tort.value, {
												...config,
												default_years: val === '' ? null : parseInt(val, 10),
											});
										}}
										placeholder="N/A"
										style={{ width: 120 }}
										min={0}
									/>
									<span style={{ color: 'var(--text-secondary)' }}>
										Leave blank for N/A (no limit)
									</span>
								</div>

								{/* Conditional Rules */}
								<div>
									<span>Conditional Rules</span>
									<span
										style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}
									>
										Add rules for specific LOB or date ranges. First matching rule wins.
									</span>
									{config.rules.map((rule, idx) => (
										<div
											key={idx}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 8,
												marginBottom: 8,
												padding: 8,
												backgroundColor: 'var(--bg-secondary)',
												borderRadius: 4,
												flexWrap: 'wrap',
											}}
										>
											<div style={{ minWidth: 130 }}>
												<Dropdown
													label="LOB"
													options={[
														{ value: '', label: 'Any' },
														...STATUTE_LOB_TYPES.map((lob) => ({
															value: lob.value,
															label: lob.label,
														})),
													]}
													value={rule.lob || ''}
													onChange={(v) =>
														updateConditionalRule(tort.value, idx, {
															lob: String(v) || undefined,
														})
													}
													size="sm"
												/>
											</div>
											<DateField
												label="From Date"
												value={rule.date_from ?? null}
												onChange={(val) =>
													updateConditionalRule(tort.value, idx, {
														date_from: val || undefined,
													})
												}
												sx={{ width: 150 }}
											/>
											<DateField
												label="To Date"
												value={rule.date_to ?? null}
												onChange={(val) =>
													updateConditionalRule(tort.value, idx, {
														date_to: val || undefined,
													})
												}
												sx={{ width: 150 }}
											/>
											<Input
												label="Years"
												type="number"
												value={rule.years}
												onChange={(e) =>
													updateConditionalRule(tort.value, idx, {
														years: parseInt(e.target.value, 10) || 0,
													})
												}
												style={{ width: 80 }}
												min={0}
											/>
											<Button
												variant="icon"
												size="sm"
												color="error"
												onClick={() => removeConditionalRule(tort.value, idx)}
											>
												<IconTrash size={20} />
											</Button>
										</div>
									))}
									<Button
										size="sm"
										startIcon={<IconPlus size={20} />}
										onClick={() => addConditionalRule(tort.value)}
									>
										Add Rule
									</Button>
								</div>
							</div>
						</Accordion>
					);
				})}
			</div>
		</BasicDialog>
	);
}
