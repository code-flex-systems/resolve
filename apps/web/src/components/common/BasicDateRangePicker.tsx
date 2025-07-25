'use client';

import { useEffect, useMemo, useState } from 'react';
import BasicPopper from './BasicPopper';
import { Box, Button, Chip, Paper, PopperProps, Stack } from '@mui/material';
import { DateRange, DateRangeCalendar } from '@mui/x-date-pickers-pro';
import { WatchLater } from '@mui/icons-material';
import theme, { BASE_COLOR } from '@/styles/theme';
import dayjs, { Dayjs } from 'dayjs';

const shortcutItems: { label: string; getValue: () => DateRange<Dayjs> }[] = [
	{
		label: 'Last Week',
		getValue: () => {
			const today = dayjs();
			const prevWeek = today.subtract(7, 'day');
			return [prevWeek.startOf('week'), prevWeek.endOf('week')];
		},
	},
	{
		label: 'This Week',
		getValue: () => {
			const today = dayjs();
			return [today.startOf('week'), today.endOf('week')];
		},
	},
	{
		label: 'Last 7 Days',
		getValue: () => {
			const today = dayjs();
			return [today.subtract(7, 'day'), today];
		},
	},
	{
		label: 'This Month',
		getValue: () => {
			const today = dayjs();
			return [today.startOf('month'), today.endOf('month')];
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
	return range.map((r) => (r === null ? '-' : r.format('MM/DD/YY'))).join(' to ');
}

export default function BasicDateRangePicker({
	defaultLabel,
	defaultValue,
	onConfirm,
	disableFuture = true,
}: {
	defaultLabel: string;
	defaultValue: DateRange<Dayjs>;
	onConfirm: (value: DateRange<Dayjs>) => void;
	disableFuture?: boolean;
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
				color={isEmpty ? undefined : 'primary'}
				icon={<WatchLater />}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={
					isEmpty
						? undefined
						: () => {
								setRange([null, null]);
								setLabelConfirmed(EMPTY_LABEL);
								onConfirm(range);
							}
				}
				sx={{
					...styles.chip,
					'& .MuiChip-icon': {
						color: isEmpty ? BASE_COLOR : undefined,
					},
					'& .MuiChip-label': {
						color: isEmpty ? BASE_COLOR : undefined,
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
											color={s.label === label ? 'primary' : undefined}
											onClick={() => {
												if (s.label !== 'Reset') setLabel(s.label);
												setRange(s.getValue());
											}}
											sx={{ margin: '5px 0px' }}
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
										sx={{ height: 30 }}
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
		margin: '5px',
	},
	paper: {
		outline: 1,
		outlineColor: theme.palette.primary.main,
		marginTop: '5px',
	},
};
