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
} from '@mui/material';
import { useState } from 'react';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Check from '@mui/icons-material/Check';
import Event from '@mui/icons-material/Event';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import { getCurrentFiscalQuarter } from '@/lib/utils/utils';

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

	return (
		<Stack
			width={140}
			minWidth={140}
			height={350}
			display="flex"
			justifyContent="flex-start"
			alignItems="center"
			bgcolor="white"
			borderRadius={4}
			margin="15px"
		>
			<Box
				display="flex"
				justifyContent="center"
				alignItems="center"
				height={40}
				margin="10px 0px"
				padding="5px 20px"
			>
				<Typography variant="subtitle1" fontSize={14} fontWeight={600} minWidth={100}>
					Fiscal Year Progress
				</Typography>
			</Box>

			<Stepper
				sx={{ height: 'calc(100% - 80px)' }}
				connector={<Connector />}
				orientation="vertical"
				activeStep={active}
			>
				{steps.map(({ value, label }, i) => (
					<Step key={value}>
						<StepLabel icon={<IconContainer active={active} index={i} />}>
							<Typography
								fontSize={15}
								color={i <= active ? theme.palette.secondary.main : BASE_COLOR_LIGHT}
							>
								{label}
							</Typography>
						</StepLabel>
					</Step>
				))}
			</Stepper>
		</Stack>
	);
}
