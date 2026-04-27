'use client';

import React, { useRef, useState } from 'react';
import CustomButton from '@/components/ui/Button';
import { CSVStep1 } from './CSVWizardStep1';
import { CSVStep2ColumnMapping, Step2RefHandle } from './CSVWizardStep2';
import { CSVStep3Preview, Step3RefHandle } from './CSVWizardStep3';
import Dialog from '@/components/ui/Dialog';

type Field = {
	key: string;
	label: string;
	required?: boolean;
};

type ParsedRow = Record<string, string>;

type Props = {
	onClose: () => void;
	fields: Field[];
	validateRow?: (row: any) => { success: boolean; error?: any };
	onSubmit: (validRows: any[]) => Promise<any>;
	submitting: boolean;
};

export function CSVImportWizard({ onClose, fields, validateRow, onSubmit, submitting }: Props) {
	const [activeStep, setActiveStep] = useState(0);
	const [file, setFile] = useState<File | null>(null);
	const [headers, setHeaders] = useState<string[]>([]);
	const [mapping, setMapping] = useState<Record<string, string | null>>({});
	const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
	const [continueEnabled, setContinueEnabled] = useState(false);
	const [validRowCount, setValidRowCount] = useState(0);
	const step2Ref = useRef<Step2RefHandle>(null);
	const step3Ref = useRef<Step3RefHandle>(null);

	const handleFileParsed = (headers: string[], file: File) => {
		setHeaders(headers.filter((v) => !!v.trim()));
		setFile(file);
		setActiveStep(1);
	};

	const handleMappingComplete = (mapping: Record<string, string | null>) => {
		setMapping(mapping);

		// Parse entire file now
		if (file) {
			import('papaparse').then(({ default: Papa }) => {
				Papa.parse<ParsedRow>(file, {
					header: true,
					skipEmptyLines: true,
					complete: (results) => {
						setParsedRows(results.data);
						setActiveStep(2);
					},
					error: () => {
						// fallback logic here if needed
					},
				});
			});
		}
	};

	const steps = ['Select File', 'Map Columns', 'Preview & Import'];

	const handleBack = () => {
		if (activeStep === 0) return;
		setActiveStep((s) => s - 1);
	};

	const handleClose = () => {
		setActiveStep(0);
		setHeaders([]);
		setFile(null);
		setParsedRows([]);
		setMapping({});
		onClose();
	};

	return (
		<Dialog
			open={true}
			onClose={handleClose}
			title="Import Wizard"
			size="lg"
			footer={
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					{activeStep > 0 && (
						<CustomButton variant="text" disabled={submitting} onClick={handleBack}>
							Back
						</CustomButton>
					)}

					{activeStep === 1 && (
						<CustomButton
							variant="contained"
							onClick={() => {
								step2Ref.current?.onNext?.();
								setActiveStep((prev) => prev + 1);
							}}
							disabled={!continueEnabled}
						>
							Continue
						</CustomButton>
					)}

					{activeStep === 2 && (
						<CustomButton
							variant="contained"
							onClick={() => step3Ref.current?.submit()}
							disabled={submitting || validRowCount === 0}
						>
							Import {validRowCount} row
							{validRowCount === 1 ? '' : 's'}
						</CustomButton>
					)}
				</div>
			}
		>
			<div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
				{steps.map((label, index) => (
					<div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<div style={{
							width: 24, height: 24, borderRadius: '50%',
							display: 'flex', alignItems: 'center', justifyContent: 'center',
							fontSize: 12, fontWeight: 600,
							backgroundColor: index <= activeStep ? 'var(--text-accent)' : 'var(--bg-tertiary)',
							color: index <= activeStep ? 'white' : 'var(--text-muted)',
						}}>
							{index + 1}
						</div>
						<span style={{ fontSize: 13, color: index <= activeStep ? 'var(--text-primary)' : 'var(--text-muted)' }}>
							{label}
						</span>
						{index < steps.length - 1 && <div style={{ width: 24, height: 1, backgroundColor: 'var(--border)' }} />}
					</div>
				))}
			</div>

			<div style={{ position: 'relative', height: 350 }}>
				{activeStep === 0 && (
					<div style={{ position: 'absolute', width: '100%' }}>
						<CSVStep1 fields={fields} onParsed={handleFileParsed} />
					</div>
				)}
				{activeStep === 1 && (
					<div style={{ position: 'absolute', width: '100%' }}>
						<CSVStep2ColumnMapping
							ref={step2Ref}
							headers={headers}
							fields={fields}
							onMapped={handleMappingComplete}
							setContinueEnabled={setContinueEnabled}
						/>
					</div>
				)}
				{activeStep === 2 && (
					<div style={{ position: 'absolute', width: '100%' }}>
						<CSVStep3Preview
							ref={step3Ref}
							rows={parsedRows}
							mapping={mapping}
							fields={fields}
							validateRow={validateRow}
							onSubmit={onSubmit}
							submitting={submitting}
							setValidRowCount={setValidRowCount}
						/>
					</div>
				)}
			</div>
		</Dialog>
	);
}
