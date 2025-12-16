import {
	Box,
	Stack,
	Step,
	StepConnector,
	stepConnectorClasses,
	StepLabel,
	Stepper,
	styled,
	Typography,
	Skeleton,
	Tooltip,
} from '@mui/material';
import { useState } from 'react';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Check from '@mui/icons-material/Check';
import Event from '@mui/icons-material/Event';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import { getCurrentFiscalQuarter } from '@/lib/utils/utils';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import config from '@/config/config';
import dayjs from 'dayjs';

const steps: { value: number; label: string }[] = [
	{ value: 1, label: 'Q1' },
	{ value: 2, label: 'Q2' },
	{ value: 3, label: 'Q3' },
	{ value: 4, label: 'Q4' },
];

const Connector = styled(StepConnector)(({ theme }) => ({
	[`&.${stepConnectorClasses.root}`]: {
		marginLeft: '10px',
	},
	[`&.${stepConnectorClasses.alternativeLabel}`]: {
		top: 10,
		left: 'calc(-50% + 16px)',
		right: 'calc(50% + 16px)',
	},
	[`&.${stepConnectorClasses.active}`]: {
		[`& .${stepConnectorClasses.line}`]: {
			borderColor: theme.palette.secondary.light,
		},
	},
	[`&.${stepConnectorClasses.completed}`]: {
		[`& .${stepConnectorClasses.line}`]: {
			borderColor: theme.palette.secondary.light,
		},
	},
	[`& .${stepConnectorClasses.line}`]: {
		borderWidth: 2,
		height: '100%',
		borderColor: '#eaeaf0',

		...theme.applyStyles('dark', {
			borderColor: theme.palette.grey[800],
		}),
	},
}));

function IconContainer({ active, index }: { active: number; index: number }) {
	return (
		<Box
			width={20}
			height={20}
			display="flex"
			justifyContent="center"
			alignItems="center"
			sx={{
				backgroundImage: index <= active ? 'linear-gradient(rgb(50, 174, 153), rgba(50, 174, 153, 0.9))' : '',
			}}
			bgcolor={index <= active ? '' : BASE_COLOR_LIGHT}
			borderRadius={20}
		>
			{index === active ? (
				<Event sx={{ color: 'white', fontSize: 17 }} />
			) : index < active ? (
				<Check sx={{ color: 'white', fontSize: 17 }} />
			) : (
				<CalendarToday sx={{ color: 'white', fontSize: 17 }} />
			)}
		</Box>
	);
}

export default function FQStepper() {
	const [active, setActive] = useState<number>(getCurrentFiscalQuarter());

	// Fetch quarterly recovery stats
	const { data: quarterlyStats, isLoading } = useRecoveryTrpc().getQuarterlyRecoveryStats({}, { enabled: true });

	// Helper to get date range for tooltip
	const getQuarterDateRange = (quarterIndex: number) => {
		const start = config.FISCAL_YEAR_START_DATE.add(quarterIndex * 3, 'months');
		const end = start.add(3, 'months').subtract(1, 'day');
		return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
	};

	// Map quarter stats to array
	const quarterAmounts = quarterlyStats
		? [quarterlyStats.q1, quarterlyStats.q2, quarterlyStats.q3, quarterlyStats.q4]
		: ['0', '0', '0', '0'];

	return (
		<Stack
			width={150}
			minWidth={150}
			height={600}
			display="flex"
			justifyContent="flex-start"
			alignItems="center"
			bgcolor="white"
			borderRadius={4}
			margin="15px"
			padding="15px"
		>
			<Box display="flex" justifyContent="center" alignItems="center" marginBottom={2} padding="0px 10px">
				<Typography variant="subtitle1" fontSize={14} fontWeight={600}>
					Fiscal Year Recovery
				</Typography>
			</Box>

			<Stepper
				sx={{ width: '100%', height: 'calc(100% - 50px)', marginLeft: '20px' }}
				connector={<Connector />}
				orientation="vertical"
				activeStep={active}
			>
				{steps.map(({ value, label }, i) => (
					<Step key={value}>
						<StepLabel icon={<IconContainer active={active} index={i} />}>
							<Box display="flex" flexDirection="column" alignItems="flex-start">
								<Typography
									fontSize={15}
									fontWeight={i === active ? 700 : 500}
									color={i <= active ? theme.palette.secondary.main : BASE_COLOR_LIGHT}
								>
									{label}
								</Typography>
								{isLoading ? (
									<Skeleton variant="text" width={80} height={20} />
								) : (
									<Tooltip title={getQuarterDateRange(i)} placement="right">
										<Typography
											fontSize={i === active ? 15 : 13}
											fontWeight={i === active ? 600 : 400}
											color={
												i <= active ? theme.palette.text.primary : theme.palette.text.disabled
											}
											sx={{ cursor: 'help' }}
										>
											{formatCurrency(parseFloat(quarterAmounts[i]))}
										</Typography>
									</Tooltip>
								)}
							</Box>
						</StepLabel>
					</Step>
				))}
			</Stepper>
		</Stack>
	);
}
