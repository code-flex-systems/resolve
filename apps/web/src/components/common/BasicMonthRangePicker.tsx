'use client';

import { useEffect, useMemo, useState } from 'react';
import BasicPopper from './BasicPopper';
import { Box, Button, Chip, MenuItem, Paper, PopperProps, Select, Stack, Typography } from '@mui/material';
import { DateRange } from '@mui/x-date-pickers-pro';
import WatchLater from '@mui/icons-material/WatchLater';
import theme, { BASE_COLOR } from '@/styles/theme';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';

dayjs.extend(quarterOfYear);
dayjs.extend(utc);

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

// Use dayjs.utc() to avoid timezone issues where endOf('month') could
// shift to the next month when converted to ISO string
const shortcutItems: { label: string; getValue: () => DateRange<Dayjs> }[] = [
	{
		label: 'Last Quarter',
		getValue: () => {
			const now = dayjs();
			let quarter = now.quarter() - 1;
			let year = now.year();
			if (quarter === 0) {
				quarter = 4;
				year = year - 1;
			}
			const startMonth = (quarter - 1) * 3;
			const start = dayjs.utc().year(year).month(startMonth).startOf('month');
			const end = dayjs.utc().year(year).month(startMonth + 2).endOf('month');
			return [start, end];
		},
	},
	{
		label: 'This Quarter',
		getValue: () => {
			const now = dayjs();
			const quarter = now.quarter();
			const startMonth = (quarter - 1) * 3;
			const start = dayjs.utc().month(startMonth).startOf('month');
			const end = dayjs.utc().month(startMonth + 2).endOf('month');
			return [start, end];
		},
	},
	{
		label: 'Last 3 Months',
		getValue: () => {
			const today = dayjs.utc();
			return [today.subtract(3, 'month').startOf('month'), today.endOf('month')];
		},
	},
	{
		label: 'Last 6 Months',
		getValue: () => {
			const today = dayjs.utc();
			return [today.subtract(6, 'month').startOf('month'), today.endOf('month')];
		},
	},
	{
		label: 'This Month',
		getValue: () => {
			const today = dayjs.utc();
			return [today.startOf('month'), today.endOf('month')];
		},
	},
	{
		label: 'This Year',
		getValue: () => {
			const today = dayjs.utc();
			return [today.startOf('year'), today.endOf('year')];
		},
	},
	{ label: 'Reset', getValue: () => [null, null] },
];

const EMPTY_LABEL = 'Select a range';

function formatMonthLabel(range: DateRange<Dayjs>) {
	if (range[0]?.isSame(range[1], 'month')) {
		return range[0]?.format('MMM YYYY') ?? '-';
	}
	return range.map((r) => (r === null ? '-' : r.format('MMM YYYY'))).join(' to ');
}

export default function BasicMonthRangePicker({
	defaultLabel,
	defaultValue,
	onConfirm,
	clearable = false,
	height = 30,
}: {
	defaultLabel: string;
	defaultValue: DateRange<Dayjs>;
	onConfirm: (value: DateRange<Dayjs>) => void;
	clearable?: boolean;
	height?: number;
}) {
	const [label, setLabel] = useState(defaultLabel);
	const [labelConfirmed, setLabelConfirmed] = useState(defaultLabel);
	const [range, setRange] = useState<DateRange<Dayjs>>(defaultValue);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();
	const isEmpty = labelConfirmed === EMPTY_LABEL;

	// Dropdown state - using month (0-11) and year as numbers
	const [startMonth, setStartMonth] = useState<number>(range[0]?.month() ?? dayjs().month());
	const [startYear, setStartYear] = useState<number>(range[0]?.year() ?? dayjs().year());
	const [endMonth, setEndMonth] = useState<number>(range[1]?.month() ?? dayjs().month());
	const [endYear, setEndYear] = useState<number>(range[1]?.year() ?? dayjs().year());

	const shortcuts = useMemo(() => shortcutItems, []);

	// Generate year options (last 5 years and next 2 years)
	const yearOptions = useMemo(() => {
		const currentYear = dayjs().year();
		const years = [];
		for (let i = currentYear - 5; i <= currentYear + 2; i++) {
			years.push(i);
		}
		return years;
	}, []);

	useEffect(() => {
		if (range.every((r) => r === null)) {
			setLabel(EMPTY_LABEL);
		} else {
			// Update dropdown values when range changes
			if (range[0]) {
				setStartMonth(range[0].month());
				setStartYear(range[0].year());
			}
			if (range[1]) {
				setEndMonth(range[1].month());
				setEndYear(range[1].year());
			}
		}
	}, [range]);

	// Update range when dropdowns change
	// Use dayjs.utc() to avoid timezone issues
	useEffect(() => {
		const start = dayjs.utc().year(startYear).month(startMonth).startOf('month');
		const end = dayjs.utc().year(endYear).month(endMonth).endOf('month');
		setRange([start, end]);
		setLabel(formatMonthLabel([start, end]));
	}, [startMonth, startYear, endMonth, endYear]);

	const onClose = (newAnchor: PopperProps['anchorEl'] = null) => {
		setLabel(defaultLabel);
		setRange(defaultValue);
		// Reset dropdowns to default values
		if (defaultValue[0]) {
			setStartMonth(defaultValue[0].month());
			setStartYear(defaultValue[0].year());
		}
		if (defaultValue[1]) {
			setEndMonth(defaultValue[1].month());
			setEndYear(defaultValue[1].year());
		}
		setAnchorEl(newAnchor);
	};

	const handleShortcut = (shortcut: { label: string; getValue: () => DateRange<Dayjs> }) => {
		const value = shortcut.getValue();
		if (shortcut.label !== 'Reset') {
			setLabel(shortcut.label);
		}
		setRange(value);
		// Update dropdowns
		if (value[0]) {
			setStartMonth(value[0].month());
			setStartYear(value[0].year());
		}
		if (value[1]) {
			setEndMonth(value[1].month());
			setEndYear(value[1].year());
		}
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
									width={150}
									display="flex"
									justifyContent="flex-start"
									alignItems="flex-start"
									padding="10px"
								>
									{shortcuts.map((s, i) => (
										<Chip
											key={i}
											label={s.label}
											onClick={() => handleShortcut(s)}
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
								<Box padding="20px" width={320}>
									<Stack spacing={2}>
										{/* Start Date */}
										<Box>
											<Typography variant="caption" fontSize={11} color="text.secondary" mb={0.5}>
												Start Month
											</Typography>
											<Box display="flex" gap={1}>
												<Select
													value={startMonth}
													onChange={(e) => setStartMonth(e.target.value as number)}
													size="small"
													sx={{ flex: 2 }}
													MenuProps={{ sx: { zIndex: 9999 } }}
												>
													{MONTHS.map((month, idx) => (
														<MenuItem key={idx} value={idx}>
															{month}
														</MenuItem>
													))}
												</Select>
												<Select
													value={startYear}
													onChange={(e) => setStartYear(e.target.value as number)}
													size="small"
													sx={{ flex: 1 }}
													MenuProps={{ sx: { zIndex: 9999 } }}
												>
													{yearOptions.map((year) => (
														<MenuItem key={year} value={year}>
															{year}
														</MenuItem>
													))}
												</Select>
											</Box>
										</Box>

										{/* End Date */}
										<Box>
											<Typography variant="caption" fontSize={11} color="text.secondary" mb={0.5}>
												End Month
											</Typography>
											<Box display="flex" gap={1}>
												<Select
													value={endMonth}
													onChange={(e) => setEndMonth(e.target.value as number)}
													size="small"
													sx={{ flex: 2 }}
													MenuProps={{ sx: { zIndex: 9999 } }}
												>
													{MONTHS.map((month, idx) => (
														<MenuItem key={idx} value={idx}>
															{month}
														</MenuItem>
													))}
												</Select>
												<Select
													value={endYear}
													onChange={(e) => setEndYear(e.target.value as number)}
													size="small"
													sx={{ flex: 1 }}
													MenuProps={{ sx: { zIndex: 9999 } }}
												>
													{yearOptions.map((year) => (
														<MenuItem key={year} value={year}>
															{year}
														</MenuItem>
													))}
												</Select>
											</Box>
										</Box>
									</Stack>
								</Box>
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
