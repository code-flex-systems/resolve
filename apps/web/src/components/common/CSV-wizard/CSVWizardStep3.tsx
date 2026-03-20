'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { ProgressBar } from '@/components/ui/Progress';
import Collapse from '@/components/ui/Collapse';
import { IconChevronDown } from '@tabler/icons-react';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { dataGridFocusStyles } from '@/styles/theme';

type ParsedRow = Record<string, string>;

type Field = { key: string; label: string };

type Props = {
	rows: ParsedRow[];
	mapping: Record<string, string | null>;
	fields: Field[];
	validateRow?: (row: any) => { success: boolean; error?: string };
	onSubmit: (validRows: any[]) => Promise<any>;
	submitting: boolean;
	setValidRowCount: (count: number) => void;
};

export type Step3RefHandle = {
	submit: () => void;
};

export const CSVStep3Preview = forwardRef<Step3RefHandle, Props>(
	({ rows, mapping, fields, validateRow, onSubmit, submitting, setValidRowCount }: Props, ref) => {
		const [validRows, setValidRows] = useState<any[]>([]);
		const [skippedRows, setSkippedRows] = useState<{ rowIndex: number; reason: string }[]>([]);
		const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);
		const [skippedRowsExpanded, setSkippedRowsExpanded] = useState(false);

		// Parse and validate rows on mount
		useEffect(() => {
			const _validRows: any[] = [];
			const _skipped: { rowIndex: number; reason: string }[] = [];

			rows.forEach((originalRow, index) => {
				const mappedRow: Record<string, string> = {};
				for (const field of fields) {
					const column = mapping[field.key];
					mappedRow[field.key] = column ? originalRow[column] || '' : '';
				}

				if (validateRow) {
					const result = validateRow(mappedRow);
					if (result.success) {
						_validRows.push(mappedRow);
					} else {
						const issue = result.error?.issues?.[0]?.path?.slice(-1)?.[0];
						const issueField = fields.find((f) => f.key === issue)?.label ?? 'Unknown issue';
						_skipped.push({ rowIndex: index + 1, reason: issueField });
					}
				} else {
					_validRows.push(mappedRow);
				}
			});

			setValidRows(_validRows);
			setSkippedRows(_skipped);
		}, [rows, mapping, fields, validateRow]);

		useEffect(() => {
			setValidRowCount(validRows.length);
		}, [validRows]);

		useImperativeHandle(ref, () => ({
			submit: async () => {
				try {
					await onSubmit(validRows);
					setSubmitSuccess(true);
				} catch {
					setSubmitSuccess(false);
				}
			},
		}));

		const gridColumns: GridColDef[] = fields.map((f) => ({
			field: f.key,
			headerName: f.label,
			width: 120,
		}));

		return (
			<>
				{submitting && <ProgressBar />}
				{submitSuccess === true && (
					<div style={{ padding: '12px 16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', fontSize: 13 }}>
						Import successful!
					</div>
				)}
				{submitSuccess === false && (
					<div style={{ padding: '12px 16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', fontSize: 13 }}>
						Import failed. Please try again.
					</div>
				)}

				<div style={{ height: 250, minHeight: 250 }}>
					<DataGridPro
						columnHeaderHeight={35}
						rowHeight={35}
						rows={validRows.map((r, i) => ({ id: i, ...r }))}
						getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '')}
						columns={gridColumns}
						disableRowSelectionOnClick
						disableColumnMenu
						disableColumnSorting
						hideFooter
						sx={dataGridFocusStyles}
					/>
				</div>

				{skippedRows.length> 0 && (
					<>
						<div
style={{
								width: '100%',
								height: 30,
								cursor: 'pointer',
								marginTop: 8,
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
							}}
							onClick={() => setSkippedRowsExpanded((prev) => !prev)}>
							<IconChevronDown
								size={20}
								style={{
									marginRight: 4,
									transform: skippedRowsExpanded ? undefined : 'rotate(-90deg)',
									transition: 'transform 100ms ease',
								}}
							/>
							<span style={{ fontSize: 13 }}>{skippedRows.length} skipped row(s)</span>
						</div>
						<Collapse
							open={skippedRowsExpanded}>
							{skippedRows.map((row, idx) => (
								<p key={idx} style={{ fontSize: 13, padding: '4px 0' }}>
									<b>Row {row.rowIndex}:</b> Invalid entry for <b>{row.reason}</b>
								</p>
							))}
						</Collapse>
					</>
				)}
			</>
		);
	}
);
