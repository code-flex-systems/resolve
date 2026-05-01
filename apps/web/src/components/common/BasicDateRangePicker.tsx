'use client';

import { useEffect, useMemo, useState } from 'react';
import BasicPopper from './BasicPopper';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import type { DateRange } from '@/types/dateTypes';
import { IconClock } from '@tabler/icons-react';
import dayjs, { Dayjs } from 'dayjs';
import { getCurrentFiscalQuarterStart } from '@/lib/utils/utils';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import styles from './BasicDateRangePicker.module.css';

const shortcutItems: { label: string; getValue: () => DateRange<Dayjs> }[] = [
	{
		label: 'Last Quarter',
		getValue: () => {
			const currentQuarterStart = getCurrentFiscalQuarterStart();
			const previousQuarterStart = currentQuarterStart.subtract(3, 'months');
			return [previousQuarterStart.startOf('day'), currentQuarterStart.subtract(1, 'days').endOf('day')];
		},
	},
	{
		label: 'This Quarter',
		getValue: () => {
			const today = dayjs();
			const currentQuarterStart = getCurrentFiscalQuarterStart();
			return [currentQuarterStart.startOf('day'), today.endOf('day')];
		},
	},
	{
		label: 'Last Week',
		getValue: () => {
			const today = dayjs();
			const prevWeek = today.subtract(7, 'day');
			return [prevWeek.startOf('week').startOf('day'), prevWeek.endOf('week').endOf('day')];
		},
	},
	{
		label: 'This Week',
		getValue: () => {
			const today = dayjs();
			return [today.startOf('week').startOf('day'), today.endOf('week').endOf('day')];
		},
	},
	{
		label: 'Last 7 Days',
		getValue: () => {
			const today = dayjs();
			return [today.subtract(7, 'day').startOf('day'), today.endOf('day')];
		},
	},
	{
		label: 'This Month',
		getValue: () => {
			const today = dayjs();
			return [today.startOf('month').startOf('day'), today.endOf('month').endOf('day')];
		},
	},
	{ label: 'Reset', getValue: () => [null, null] },
];

const shortcutFutureItems: { label: string; getValue: () => DateRange<Dayjs> }[] = [
	{
		label: 'Next Month',
		getValue: () => {
			const today = dayjs();
			const startOfNextMonth = today.endOf('month').add(1, 'day');
			return [startOfNextMonth, startOfNextMonth.endOf('month')];
		},
	},
];

const EMPTY_LABEL = 'Select a range';

function formatDateLabel(range: DateRange<Dayjs>) {
	return range[0]?.isSame(range[1], 'date')
		? (range[0]?.format('MM/DD/YY') ?? '-')
		: range.map((r) => (r === null ? '-' : r.format('MM/DD/YY'))).join(' to ');
}

export default function BasicDateRangePicker({
	defaultLabel,
	defaultValue,
	onConfirm,
	clearable = false,
	disableFuture = true,
}: {
	defaultLabel: string;
	defaultValue: DateRange<Dayjs>;
	onConfirm: (value: DateRange<Dayjs>) => void;
	clearable?: boolean;
	disableFuture?: boolean;
	height?: number;
}) {
	const [label, setLabel] = useState(defaultLabel);
	const [labelConfirmed, setLabelConfirmed] = useState(defaultLabel);
	const [range, setRange] = useState<DateRange<Dayjs>>(defaultValue);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const isEmpty = labelConfirmed === EMPTY_LABEL;

	const shortcuts = useMemo(() => {
		let items = [...shortcutItems];
		if (!disableFuture) {
			items = [...items.slice(items.length - 1), ...shortcutFutureItems, items[items.length - 1]];
		}
		return items;
	}, [disableFuture]);

	useEffect(() => {
		if (range.every((r) => r === null)) setLabel(EMPTY_LABEL);
	}, [range]);

	const onClose = (newAnchor: HTMLElement | null = null) => {
		setLabel(defaultLabel);
		setRange(defaultValue);
		setAnchorEl(newAnchor);
	};

	const selectedRange =
		range[0] && range[1]
			? { from: range[0].toDate(), to: range[1].toDate() }
			: range[0]
				? { from: range[0].toDate(), to: undefined }
				: undefined;

	return (
		<>
			<span className={styles.trigger}>
				<Button
					variant="ghost"
					size="md"
					color={isEmpty || !clearable ? 'neutral' : 'primary'}
					startIcon={<IconClock size={14} />}
					onClick={(e) => {
						setAnchorEl(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					{labelConfirmed}
				</Button>
				{!isEmpty && clearable && (
					<button
						className={styles.clearBtn}
						onClick={(e) => {
							e.stopPropagation();
							setRange([null, null]);
							setLabelConfirmed(EMPTY_LABEL);
							onConfirm(range);
						}}
					>
						×
					</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={onClose} placement="bottom-start">
					<div className={styles.popover}>
						<div className={styles.body}>
							<div className={styles.calendarRow}>
								<div className={styles.shortcuts}>
									{shortcuts.map((s) => (
										<Chip
											key={s.label}
											size="sm"
											color={s.label === label ? 'primary' : 'neutral'}
											onClick={() => {
												if (s.label !== 'Reset') setLabel(s.label);
												setRange(s.getValue());
											}}
										>
											{s.label}
										</Chip>
									))}
								</div>
								<DayPicker
									mode="range"
									selected={selectedRange}
									onSelect={(newRange) => {
										const from = newRange?.from ? dayjs(newRange.from) : null;
										const to = newRange?.to ? dayjs(newRange.to) : null;
										const newDateRange: DateRange<Dayjs> = [from, to];
										setLabel(formatDateLabel(newDateRange));
										setRange(newDateRange);
									}}
									disabled={disableFuture ? { after: new Date() } : undefined}
									numberOfMonths={2}
								/>
							</div>

							<div className={styles.footer}>
								<Button onClick={() => onClose()} variant="outlined" size="sm" color="neutral">
									Cancel
								</Button>
								<Button
									onClick={() => {
										setLabelConfirmed(label);
										onConfirm(range);
										setAnchorEl(null);
									}}
									variant="contained"
									size="sm"
									disabled={!clearable && range.some((r) => !r)}
								>
									Apply
								</Button>
							</div>
						</div>
					</div>
				</BasicPopper>
			)}
		</>
	);
}
