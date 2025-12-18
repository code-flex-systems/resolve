'use client';

import { useEffect, useMemo, useState } from 'react';
import BasicPopper from './BasicPopper';
import { Box, Button, Chip, Paper, PopperProps, Stack } from '@mui/material';
import { DateRange, DateRangeCalendar } from '@mui/x-date-pickers-pro';
import WatchLater from '@mui/icons-material/WatchLater';
import theme, { BASE_COLOR } from '@/styles/theme';
import dayjs, { Dayjs } from 'dayjs';
import { getCurrentFiscalQuarterStart } from '@/lib/utils/utils';

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
	height = 30,
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
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();
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

	const onClose = (newAnchor: PopperProps['anchorEl'] = null) => {
		setLabel(defaultLabel);
		setRange(defaultValue);
		setAnchorEl(newAnchor);
	};

	return (
		<>
			<Chip
				label={labelConfirmed}
				icon={<WatchLater />}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={
					isEmpty || !clearable
						? undefined
						: () => {
								setRange([null, null]);
								setLabelConfirmed(EMPTY_LABEL);
								onConfirm(range);
							}
				}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: isEmpty ? undefined : theme.palette.secondary.main,
					},
					'& .MuiChip-label': {
						color: isEmpty ? undefined : theme.palette.secondary.main,
						fontStyle: isEmpty ? 'italic' : undefined,
					},
				}}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={onClose} placement="bottom-start">
					<Paper sx={styles.paper}>
						<Stack display="flex" justifyContent="center" alignItems="flex-start">
							<Box width="100%" display="flex" justifyContent="center" alignItems="flex-start">
								<Stack
									width={130}
									display="flex"
									justifyContent="flex-start"
									alignItems="flex-start"
									padding="10px"
								>
									{shortcuts.map((s, i) => (
										<Chip
											key={i}
											label={s.label}
											onClick={() => {
												if (s.label !== 'Reset') setLabel(s.label);
												setRange(s.getValue());
											}}
											sx={{
												margin: '5px 0px',
												'& .MuiChip-icon': {
													color:
														s.label === label ? theme.palette.secondary.main : BASE_COLOR,
												},
												'& .MuiChip-label': {
													color:
														s.label === label ? theme.palette.secondary.main : BASE_COLOR,
												},
											}}
										/>
									))}
								</Stack>
								<DateRangeCalendar
									value={range}
									onChange={(v) => {
										setLabel(formatDateLabel(v));
										setRange(v);
									}}
									disableFuture={disableFuture}
								/>
							</Box>

							<Box
								width="100%"
								display="flex"
								justifyContent="space-between"
								alignItems="center"
								padding="10px"
							>
								<Box></Box>
								<Box>
									<Button
										onClick={() => onClose()}
										variant="outlined"
										sx={{ height: 30, marginRight: '10px' }}
									>
										Cancel
									</Button>
									<Button
										onClick={() => {
											setLabelConfirmed(label);
											onConfirm(range);
											setAnchorEl(null);
										}}
										variant="contained"
										color="secondary"
										sx={{ height: 30 }}
										disabled={!clearable && range.some((r) => !r)}
									>
										Apply
									</Button>
								</Box>
							</Box>
						</Stack>
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	chip: {
		margin: '5px 0px',
	},
	paper: {
		mt: 0.625,
	},
};
