'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Typography, LinearProgress, Box, Alert, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';

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
				{submitting && <LinearProgress />}
				{submitSuccess === true && <Alert severity="success">Import successful!</Alert>}
				{submitSuccess === false && <Alert severity="error">Import failed. Please try again.</Alert>}

				<Box height={250} minHeight={250}>
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
					/>
				</Box>

				{skippedRows.length > 0 && (
					<>
						<Box
							sx={{
								width: '100%',
								height: 30,
								cursor: 'pointer',
								mt: 1,
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
							}}
							onClick={() => setSkippedRowsExpanded((prev) => !prev)}
						>
							<ExpandMoreIcon
								sx={{
									mr: 0.5,
									transform: skippedRowsExpanded ? undefined : 'rotate(-90deg)',
									transition: 'transform 100ms ease',
								}}
							/>
							<Typography fontSize={13}>{skippedRows.length} skipped row(s)</Typography>
						</Box>
						<Collapse
							in={skippedRowsExpanded}
							sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
							unmountOnExit
						>
							{skippedRows.map((row, idx) => (
								<Typography key={idx} fontSize={13} py={0.5}>
									<b>Row {row.rowIndex}:</b> Invalid entry for <b>{row.reason}</b>
								</Typography>
							))}
						</Collapse>
					</>
				)}
			</>
		);
	}
);
