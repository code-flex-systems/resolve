'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Card from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import Input, { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
	IconPlus,
	IconArrowRight,
	IconTrash,
	IconPencil,
	IconCheck,
	IconX,
	IconPlayerPlay,
	IconSearch,
	IconSettings,
	IconDownload,
	IconCopy,
	IconFilter,
} from '@tabler/icons-react';
import styles from './ComponentShowcase.module.css';

export default function ComponentShowcase() {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogSize, setDialogSize] = useState<'sm' | 'md' | 'lg'>('md');
	const [inputValue, setInputValue] = useState('');
	const [selectValue, setSelectValue] = useState('');
	const [textareaValue, setTextareaValue] = useState('');

	const selectOptions = [
		{ value: 'option1', label: 'Option One' },
		{ value: 'option2', label: 'Option Two' },
		{ value: 'option3', label: 'Option Three' },
		{ value: 'option4', label: 'Option Four' },
	];

	const openDialog = (size: 'sm' | 'md' | 'lg') => {
		setDialogSize(size);
		setDialogOpen(true);
	};

	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<h1 className={styles.title}>Component Showcase</h1>
				<p className={styles.subtitle}>
					Preview all UI components with every variant. These components use CSS Modules
					and design tokens — no MUI dependencies.
				</p>
			</div>

			{/* ================================================================
			    BUTTONS
			    ================================================================ */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Button</h2>
				<p className={styles.sectionDescription}>
					Buttons trigger actions. Use contained for primary actions, outlined for
					secondary, text for tertiary, solid for high-contrast, and icon for toolbar actions.
				</p>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Contained</h3>
					<div className={styles.row}>
						<Button color="primary">Primary</Button>
						<Button color="success">Success</Button>
						<Button color="error">Error</Button>
						<Button color="warning">Warning</Button>
						<Button color="neutral">Neutral</Button>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Outlined</h3>
					<div className={styles.row}>
						<Button variant="outlined" color="primary">Primary</Button>
						<Button variant="outlined" color="success">Success</Button>
						<Button variant="outlined" color="error">Error</Button>
						<Button variant="outlined" color="warning">Warning</Button>
						<Button variant="outlined" color="neutral">Neutral</Button>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Text</h3>
					<div className={styles.row}>
						<Button variant="text" color="primary">Primary</Button>
						<Button variant="text" color="success">Success</Button>
						<Button variant="text" color="error">Error</Button>
						<Button variant="text" color="neutral">Neutral</Button>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Solid (high-contrast)</h3>
					<div className={styles.row}>
						<Button variant="solid">Get Started</Button>
						<Button variant="solid" size="sm">Confirm</Button>
						<Button variant="solid" size="lg">Submit Application</Button>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Icon — Outline (default)</h3>
					<p className={styles.hint}>
						Icon buttons use an outlined border by default for easy recognition.
					</p>
					<div className={styles.row}>
						<Button variant="icon" size="sm"><IconPencil size={16} stroke={1.5} /></Button>
						<Button variant="icon" size="md"><IconPencil size={18} stroke={1.5} /></Button>
						<Button variant="icon" size="lg"><IconPencil size={20} stroke={1.5} /></Button>
						<Button variant="icon" color="error"><IconTrash size={18} stroke={1.5} /></Button>
						<Button variant="icon" color="success"><IconCheck size={18} stroke={1.5} /></Button>
						<Button variant="icon" color="primary"><IconPlayerPlay size={18} stroke={1.5} /></Button>
						<Button variant="icon" color="neutral"><IconSettings size={18} stroke={1.5} /></Button>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Icon — Filled</h3>
					<p className={styles.hint}>
						Use the filled variant when icon buttons should blend into a card or toolbar background.
					</p>
					<div className={styles.row}>
						<Button variant="icon" iconFilled size="sm"><IconPencil size={16} stroke={1.5} /></Button>
						<Button variant="icon" iconFilled size="md"><IconPencil size={18} stroke={1.5} /></Button>
						<Button variant="icon" iconFilled size="lg"><IconPencil size={20} stroke={1.5} /></Button>
						<Button variant="icon" iconFilled color="error"><IconTrash size={18} stroke={1.5} /></Button>
						<Button variant="icon" iconFilled color="success"><IconCheck size={18} stroke={1.5} /></Button>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Sizes</h3>
					<div className={styles.row}>
						<Button size="sm">Small</Button>
						<Button size="md">Medium</Button>
						<Button size="lg">Large</Button>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>States</h3>
					<div className={styles.row}>
						<Button disabled>Disabled</Button>
						<Button loading>Loading</Button>
						<Button variant="outlined" disabled>Outlined Disabled</Button>
						<Button variant="solid" disabled>Solid Disabled</Button>
					</div>
					<div className={styles.row} style={{ marginTop: 12 }}>
						<Button fullWidth>Full Width</Button>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>With Icons</h3>
					<div className={styles.row}>
						<Button startIcon={<IconPlus size={16} stroke={1.5} />}>Add Item</Button>
						<Button variant="outlined" endIcon={<IconArrowRight size={16} stroke={1.5} />}>Next Step</Button>
						<Button variant="outlined" color="error" startIcon={<IconTrash size={16} stroke={1.5} />}>Delete</Button>
						<Button variant="solid" startIcon={<IconDownload size={16} stroke={1.5} />}>Export</Button>
					</div>
				</div>
			</section>

			{/* ================================================================
			    CHIPS
			    ================================================================ */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Chip</h2>
				<p className={styles.sectionDescription}>
					Chips display status, categories, or labels. Use filled for emphasis,
					outlined for subtlety.
				</p>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Filled</h3>
					<div className={styles.row}>
						<Chip color="success">Executed</Chip>
						<Chip color="error">Failed</Chip>
						<Chip color="warning">Pending</Chip>
						<Chip color="info">In Progress</Chip>
						<Chip color="neutral">Skipped</Chip>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Outlined</h3>
					<div className={styles.row}>
						<Chip variant="outlined" color="success">Active</Chip>
						<Chip variant="outlined" color="error">Inactive</Chip>
						<Chip variant="outlined" color="warning">Draft</Chip>
						<Chip variant="outlined" color="info">Review</Chip>
						<Chip variant="outlined" color="neutral">Archived</Chip>
					</div>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Sizes</h3>
					<div className={styles.row}>
						<Chip size="sm" color="info">Small</Chip>
						<Chip size="md" color="info">Medium</Chip>
					</div>
				</div>
			</section>

			{/* ================================================================
			    CARDS
			    ================================================================ */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Card</h2>
				<p className={styles.sectionDescription}>
					Cards group related content. Float cards have a glass-morphism effect,
					beveled cards are the standard container, surface cards are lighter weight,
					and flat cards are for nesting.
				</p>

				<div className={styles.cardGrid}>
					<Card variant="float" padding="lg">
						<h3 className={styles.cardTitle}>Float Card</h3>
						<p className={styles.cardText}>
							Glass-morphism with frosted backdrop blur. Great for elevated content
							that needs to stand out from the page.
						</p>
					</Card>

					<Card variant="beveled" padding="lg">
						<h3 className={styles.cardTitle}>Beveled Card</h3>
						<p className={styles.cardText}>
							Standard container with subtle shadow. The default choice for most
							content sections.
						</p>
					</Card>

					<Card variant="surface" padding="lg">
						<h3 className={styles.cardTitle}>Surface Card</h3>
						<p className={styles.cardText}>
							Lightweight card with border only. Good for secondary content or
							dense layouts.
						</p>
					</Card>

					<Card variant="flat" padding="lg">
						<h3 className={styles.cardTitle}>Flat Card</h3>
						<p className={styles.cardText}>
							No border or shadow. Use for nesting inside other cards to
							create visual hierarchy.
						</p>
					</Card>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Nested Cards</h3>
					<Card variant="beveled" padding="lg">
						<h3 className={styles.cardTitle}>Parent Card (Beveled)</h3>
						<p className={styles.cardText}>This card contains nested flat cards for grouping.</p>
						<div className={styles.nestedCards}>
							<Card variant="flat" padding="md">
								<p className={styles.cardText}>Nested flat card 1</p>
							</Card>
							<Card variant="flat" padding="md">
								<p className={styles.cardText}>Nested flat card 2</p>
							</Card>
						</div>
					</Card>
				</div>
			</section>

			{/* ================================================================
			    DIALOG
			    ================================================================ */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Dialog</h2>
				<p className={styles.sectionDescription}>
					Dialogs capture attention for focused tasks. They include a title,
					optional description for context, content area, and footer for actions.
					Click the backdrop or press Escape to close.
				</p>

				<div className={styles.row}>
					<Button variant="outlined" onClick={() => openDialog('sm')}>Small Dialog</Button>
					<Button variant="outlined" onClick={() => openDialog('md')}>Medium Dialog</Button>
					<Button variant="outlined" onClick={() => openDialog('lg')}>Large Dialog</Button>
				</div>

				<Dialog
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					title="Example Dialog"
					description="This is a description that provides additional context about what this dialog is for. It displays unconditionally so users always know what they're looking at."
					size={dialogSize}
					footer={
						<div className={styles.dialogFooter}>
							<Button variant="outlined" color="neutral" onClick={() => setDialogOpen(false)}>
								Cancel
							</Button>
							<Button onClick={() => setDialogOpen(false)}>
								Confirm
							</Button>
						</div>
					}
				>
					<p className={styles.dialogContent}>
						This is the content area of the dialog. It supports scrolling for longer content.
						The dialog uses the native HTML dialog element for proper accessibility and focus trapping.
					</p>
					<Card variant="surface" padding="md">
						<p className={styles.cardText}>
							You can nest cards and other components inside dialogs.
						</p>
					</Card>
				</Dialog>
			</section>

			{/* ================================================================
			    INPUTS
			    ================================================================ */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Input</h2>
				<p className={styles.sectionDescription}>
					Inputs capture user text. They support labels, helper text, error states,
					and start/end adornments.
				</p>

				<div className={styles.formGrid}>
					<Input
						label="Standard Input"
						placeholder="Enter a value..."
						helperText="This is helper text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
					/>

					<Input
						label="With Error"
						placeholder="Invalid value"
						error
						errorText="This field is required"
						value="bad value"
						onChange={() => {}}
					/>

					<Input
						label="Disabled"
						placeholder="Can't edit this"
						disabled
						value=""
						onChange={() => {}}
					/>

					<Input
						label="With Start Adornment"
						placeholder="0.00"
						startAdornment={<span className={styles.adornment}>$</span>}
						value=""
						onChange={() => {}}
					/>

					<Input
						label="With End Adornment"
						placeholder="Search..."
						endAdornment={<IconSearch size={16} stroke={1.5} className={styles.adornmentIcon} />}
						value=""
						onChange={() => {}}
					/>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>Textarea</h3>
					<Textarea
						label="Description"
						placeholder="Enter a longer description..."
						helperText="Markdown is not supported"
						value={textareaValue}
						onChange={(e) => setTextareaValue(e.target.value)}
						fullWidth
					/>
				</div>
			</section>

			{/* ================================================================
			    SELECT
			    ================================================================ */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Select</h2>
				<p className={styles.sectionDescription}>
					Selects let users choose from a predefined list. They share the same
					label and error patterns as inputs for consistency.
				</p>

				<div className={styles.formGrid}>
					<Select
						label="Standard Select"
						options={selectOptions}
						placeholder="Choose an option..."
						value={selectValue}
						onChange={setSelectValue}
						helperText="Pick your favorite"
					/>

					<Select
						label="With Error"
						options={selectOptions}
						error
						errorText="Selection is required"
						value=""
						onChange={() => {}}
					/>

					<Select
						label="Disabled"
						options={selectOptions}
						value="option1"
						disabled
						onChange={() => {}}
					/>

					<Select
						label="With Preselected Value"
						options={selectOptions}
						value="option2"
						onChange={() => {}}
					/>
				</div>
			</section>

			{/* ================================================================
			    STACKED ROWS
			    ================================================================ */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Stacked Row</h2>
				<p className={styles.sectionDescription}>
					Stacked rows display a primary value with a secondary label beneath it.
					Common in tables and detail views for showing a field with its context.
				</p>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>In a card context</h3>
					<Card variant="beveled" padding="lg">
						<div className={styles.stackedGrid}>
							<div className={styles.stacked}>
								<span className={styles.stackedPrimary}>CLM-2024-00847</span>
								<span className={styles.stackedSecondary}>Claim Number</span>
							</div>
							<div className={styles.stacked}>
								<span className={styles.stackedPrimary}>John Smith</span>
								<span className={styles.stackedSecondary}>Insured</span>
							</div>
							<div className={styles.stacked}>
								<span className={styles.stackedPrimary}>$125,400.00</span>
								<span className={styles.stackedSecondary}>Claim Amount</span>
							</div>
							<div className={styles.stacked}>
								<span className={styles.stackedPrimary}>Mar 15, 2026</span>
								<span className={styles.stackedSecondary}>Date of Loss</span>
							</div>
						</div>
					</Card>
				</div>

				<div className={styles.subsection}>
					<h3 className={styles.subsectionTitle}>In a list/table context</h3>
					<Card variant="surface" padding="none">
						<div className={styles.stackedList}>
							<div className={styles.stackedListRow}>
								<div className={styles.stacked}>
									<span className={styles.stackedPrimary}>Evaluation - Transactional</span>
									<span className={styles.stackedSecondary}>Desk Location</span>
								</div>
								<Chip color="success" size="sm">Active</Chip>
							</div>
							<div className={styles.stackedListRow}>
								<div className={styles.stacked}>
									<span className={styles.stackedPrimary}>Review Queue - Complex</span>
									<span className={styles.stackedSecondary}>Desk Location</span>
								</div>
								<Chip color="warning" size="sm">Breached</Chip>
							</div>
							<div className={styles.stackedListRow}>
								<div className={styles.stacked}>
									<span className={styles.stackedPrimary}>Settlement Processing</span>
									<span className={styles.stackedSecondary}>Desk Location</span>
								</div>
								<Chip color="neutral" size="sm">Inactive</Chip>
							</div>
						</div>
					</Card>
				</div>
			</section>

			{/* ================================================================
			    COMPOSITION EXAMPLE
			    ================================================================ */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Composition Example</h2>
				<p className={styles.sectionDescription}>
					Here&apos;s how these components work together in a realistic layout —
					a workflow rule card built entirely from the new component kit.
				</p>

				<Card variant="beveled" padding="lg">
					<div className={styles.compositionHeader}>
						<div>
							<h3 className={styles.cardTitle}>Move Stale Claims to Review</h3>
							<p className={styles.cardText}>
								Claims that have been in Evaluation for more than 72 hours
								are automatically moved to the Review queue.
							</p>
						</div>
						<Chip color="success">Active</Chip>
					</div>

					<div className={styles.compositionChips}>
						<Chip variant="outlined" color="info" size="sm">Trigger: Location Age</Chip>
						<Chip variant="outlined" color="neutral" size="sm">Action: Move Claim</Chip>
						<Chip variant="outlined" color="neutral" size="sm">Mode: Suggest</Chip>
						<Chip variant="outlined" color="neutral" size="sm">Priority: 100</Chip>
					</div>

					<Card variant="flat" padding="md">
						<p className={styles.conditionLabel}>Conditions (match ALL)</p>
						<div className={styles.conditionList}>
							<p className={styles.conditionItem}>
								Hours in Current Stage <span className={styles.conditionOp}>is greater than</span> 72
							</p>
							<p className={styles.conditionItem}>
								Current Phase <span className={styles.conditionOp}>equals</span> Evaluation
							</p>
						</div>
					</Card>

					<div className={styles.compositionFooter}>
						<Button variant="icon" size="sm"><IconPlayerPlay size={16} stroke={1.5} /></Button>
						<Button variant="icon" size="sm"><IconPencil size={16} stroke={1.5} /></Button>
						<Button variant="icon" color="error" size="sm"><IconTrash size={16} stroke={1.5} /></Button>
					</div>
				</Card>
			</section>
		</div>
	);
}
