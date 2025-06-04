import React, { useRef, useState } from 'react';
import { DialogContent, DialogActions, Stepper, Step, StepLabel, Button, Box, Fade } from '@mui/material';
import { CSVStep1 } from './CSVWizardStep1';
import { CSVStep2ColumnMapping, Step2RefHandle } from './CSVWizardStep2';
import { CSVStep3Preview, Step3RefHandle } from './CSVWizardStep3';
import BasicDialog from '../BasicDialog';

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
	onSubmit: (validRows: any[]) => Promise<void>;
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
		<BasicDialog title="Import Wizard" onClose={handleClose} width={700} height={600}>
			<DialogContent dividers>
				<Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
					{steps.map((label) => (
						<Step key={label}>
							<StepLabel>{label}</StepLabel>
						</Step>
					))}
				</Stepper>

				<Box sx={{ position: 'relative', height: 350 }}>
					<Fade in={activeStep === 0} timeout={400} unmountOnExit>
						<Box key="step1" sx={{ position: 'absolute', width: '100%' }}>
							<CSVStep1 fields={fields} onParsed={handleFileParsed} />
						</Box>
					</Fade>
					<Fade in={activeStep === 1} timeout={400} unmountOnExit>
						<Box key="step2" sx={{ position: 'absolute', width: '100%' }}>
							<CSVStep2ColumnMapping
								ref={step2Ref}
								headers={headers}
								fields={fields}
								onMapped={handleMappingComplete}
								setContinueEnabled={setContinueEnabled}
							/>
						</Box>
					</Fade>
					<Fade in={activeStep === 2} timeout={400} unmountOnExit>
						<Box key="step3" sx={{ position: 'absolute', width: '100%' }}>
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
						</Box>
					</Fade>
				</Box>
			</DialogContent>

			<DialogActions>
				{activeStep > 0 && (
					<Button disabled={submitting} onClick={handleBack}>
						Back
					</Button>
				)}

				{activeStep === 1 && (
					<Button
						variant="contained"
						onClick={() => {
							step2Ref.current?.onNext?.();
							setActiveStep((prev) => prev + 1);
						}}
						disabled={!continueEnabled}
					>
						Continue
					</Button>
				)}

				{activeStep === 2 && (
					<Button
						variant="contained"
						onClick={() => step3Ref.current?.submit()}
						disabled={submitting || validRowCount === 0}
					>
						Import {validRowCount} row
						{validRowCount === 1 ? '' : 's'}
					</Button>
				)}
			</DialogActions>
		</BasicDialog>
	);
}
