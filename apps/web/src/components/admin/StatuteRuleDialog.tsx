'use client';

import { useState, useEffect } from 'react';
import {
	Box,
	Button,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
	IconButton,
	Accordion,
	AccordionSummary,
	AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import BasicDialog from '../common/BasicDialog';
import { useStatuteTrpc } from '@/hooks/trpc/useStatuteTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { STATUTE_TORT_TYPES, STATUTE_LOB_TYPES } from '@/config/statuteConfig';
import { getJurisdictionName } from '@/config/usJurisdictions';
import type { StatuteRules, TortTypeConfig, ConditionalRule, NegligenceType } from '@/schemas/statuteSchemas';
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

	const updateConditionalRule = (tortType: string, index: number, updates: Partial<ConditionalRule>) => {
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
				icon: <SaveIcon />,
				disabled: isPending,
			}}
			onClose={handleClose}
			width={700}
			maxHeight="80vh"
		>
			<Stack sx={{ pt: 1 }}>
				{/* Negligence Law Section */}
				<Accordion defaultExpanded>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography fontWeight={500}>Negligence Law</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Stack spacing={2}>
							<Box display="flex" alignItems="center" gap={2}>
								<FormControl size="small" sx={{ minWidth: 200 }}>
									<InputLabel>Negligence Type</InputLabel>
									<Select
										value={negligenceType ?? ''}
										label="Negligence Type"
										onChange={(e) =>
											setNegligenceType((e.target.value as NegligenceType) || null)
										}
									>
										<MenuItem value="">
											<em>Not Set</em>
										</MenuItem>
										{negligenceTypeOptions.map((opt) => (
											<MenuItem key={opt.value} value={opt.value}>
												{opt.label}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<TextField
									label="Bar Percentage"
									size="small"
									value={
										negligenceType
											? getBarPercentForType(negligenceType) !== null
												? `${getBarPercentForType(negligenceType)}%`
												: 'Varies'
											: ''
									}
									disabled
									sx={{ width: 120 }}
								/>
							</Box>
							<TextField
								label="Notes"
								size="small"
								value={negligenceNotes}
								onChange={(e) => setNegligenceNotes(e.target.value)}
								placeholder="Optional notes (e.g., date-based changes, special rules)"
								fullWidth
								multiline
								rows={2}
							/>
						</Stack>
					</AccordionDetails>
				</Accordion>

				{/* Tort Type Sections */}
				{STATUTE_TORT_TYPES.map((tort) => {
					const config = getTortConfig(tort.value);
					return (
						<Accordion key={tort.value} defaultExpanded>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<Typography fontWeight={500}>{tort.label}</Typography>
							</AccordionSummary>
							<AccordionDetails>
								<Stack spacing={2}>
									{/* Default Years */}
									<Box display="flex" alignItems="center" gap={2}>
										<TextField
											label="Default Years"
											type="number"
											size="small"
											value={config.default_years ?? ''}
											onChange={(e) => {
												const val = e.target.value;
												updateTortConfig(tort.value, {
													...config,
													default_years: val === '' ? null : parseInt(val, 10),
												});
											}}
											placeholder="N/A"
											sx={{ width: 120 }}
											InputProps={{ inputProps: { min: 0 } }}
										/>
										<Typography variant="body2" color="text.secondary">
											Leave blank for N/A (no limit)
										</Typography>
									</Box>

									{/* Conditional Rules */}
									<Box>
										<Typography variant="subtitle2" gutterBottom>
											Conditional Rules
										</Typography>
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{ display: 'block', mb: 1 }}
										>
											Add rules for specific LOB or date ranges. First matching rule wins.
										</Typography>
										{config.rules.map((rule, idx) => (
											<Box
												key={idx}
												sx={{
													display: 'flex',
													alignItems: 'center',
													gap: 1,
													mb: 1,
													p: 1,
													bgcolor: 'grey.50',
													borderRadius: 1,
													flexWrap: 'wrap',
												}}
											>
												<FormControl size="small" sx={{ minWidth: 130 }}>
													<InputLabel>LOB</InputLabel>
													<Select
														value={rule.lob || ''}
														label="LOB"
														onChange={(e) =>
															updateConditionalRule(tort.value, idx, {
																lob: e.target.value || undefined,
															})
														}
													>
														<MenuItem value="">
															<em>Any</em>
														</MenuItem>
														{STATUTE_LOB_TYPES.map((lob) => (
															<MenuItem key={lob.value} value={lob.value}>
																{lob.label}
															</MenuItem>
														))}
													</Select>
												</FormControl>
												<TextField
													label="From Date"
													type="date"
													size="small"
													value={rule.date_from ?? ''}
													onChange={(e) =>
														updateConditionalRule(tort.value, idx, {
															date_from: e.target.value || undefined,
														})
													}
													slotProps={{
														inputLabel: { shrink: true },
													}}
													sx={{ width: 150 }}
												/>
												<TextField
													label="To Date"
													type="date"
													size="small"
													value={rule.date_to ?? ''}
													onChange={(e) =>
														updateConditionalRule(tort.value, idx, {
															date_to: e.target.value || undefined,
														})
													}
													slotProps={{
														inputLabel: { shrink: true },
													}}
													sx={{ width: 150 }}
												/>
												<TextField
													label="Years"
													type="number"
													size="small"
													value={rule.years}
													onChange={(e) =>
														updateConditionalRule(tort.value, idx, {
															years: parseInt(e.target.value, 10) || 0,
														})
													}
													sx={{ width: 80 }}
													InputProps={{ inputProps: { min: 0 } }}
												/>
												<IconButton
													size="small"
													color="error"
													onClick={() => removeConditionalRule(tort.value, idx)}
												>
													<DeleteIcon fontSize="small" />
												</IconButton>
											</Box>
										))}
										<Button
											size="small"
											startIcon={<AddIcon />}
											onClick={() => addConditionalRule(tort.value)}
										>
											Add Rule
										</Button>
									</Box>
								</Stack>
							</AccordionDetails>
						</Accordion>
					);
				})}
			</Stack>
		</BasicDialog>
	);
}
