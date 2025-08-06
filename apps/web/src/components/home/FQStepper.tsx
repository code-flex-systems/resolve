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
import { CalendarToday, Check, Event } from '@mui/icons-material';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';

const steps: { value: number; label: string }[] = [
	{ value: 1, label: 'Q1' },
	{ value: 2, label: 'Q2' },
	{ value: 3, label: 'Q3' },
	{ value: 4, label: 'Q4' },
];

const Connector = styled(StepConnector)(({ theme }) => ({
	[`&.${stepConnectorClasses.root}`]: {
		marginLeft: '13px',
	},
	[`&.${stepConnectorClasses.alternativeLabel}`]: {
		top: 10,
		left: 'calc(-50% + 16px)',
		right: 'calc(50% + 16px)',
	},
	[`&.${stepConnectorClasses.active}`]: {
		[`& .${stepConnectorClasses.line}`]: {
			borderColor: theme.palette.success.light,
		},
	},
	[`&.${stepConnectorClasses.completed}`]: {
		[`& .${stepConnectorClasses.line}`]: {
			borderColor: theme.palette.success.light,
		},
	},
	[`& .${stepConnectorClasses.line}`]: {
		borderWidth: 3,
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
			width={30}
			height={30}
			display="flex"
			justifyContent="center"
			alignItems="center"
			sx={{
				backgroundImage: index <= active ? 'linear-gradient(rgb(76, 175, 79), rgba(76, 175, 79, 0.9))' : '',
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
	const [active, setActive] = useState<number>(1);

	return (
		<Stack
			width={140}
			minWidth={140}
			height={375}
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
				<Typography lineHeight="21px" minWidth={100}>
					Fiscal Year Progress
				</Typography>
			</Box>

			<Stepper
				sx={{ height: 'calc(100% - 70px)' }}
				connector={<Connector />}
				orientation="vertical"
				activeStep={1}
			>
				{steps.map(({ value, label }, i) => (
					<Step key={value}>
						<StepLabel icon={<IconContainer active={active} index={i} />}>
							<Typography
								fontSize={17}
								color={i <= active ? theme.palette.success.light : BASE_COLOR_LIGHT}
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
