'use client';

import { capitalize, formatMetric } from '@/lib/utils/utils';
import { BASE_COLOR, BASE_COLOR_LIGHT, OFFWHITE_COLOR } from '@/styles/theme';
import { Box, Collapse, Divider, IconButton, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { ArrowCircleRight } from '@mui/icons-material';
import { JSX } from 'react';
import './styles.css';

const METRIC_WIDTH = 225;
const METRIC_HEIGHT = 100;

export default function SimpleMetric({
	title,
	onClick,
	onSelect,
	icon,
	color,
	values,
	symbol,
	unit,
	isLoading = false,
	showNegative = false,
	selected = false,
	hasDetail = true,
}: {
	title: string;
	onClick?: () => void;
	onSelect?: () => void;
	icon?: JSX.Element;
	color?: string;
	values?: {
		total: number;
		[x: string]: number;
	};
	symbol?: string;
	unit?: string;
	isLoading?: boolean;
	showNegative?: boolean;
	selected?: boolean;
	hasDetail?: boolean;
}) {
	const formattedMetric = formatMetric(values?.total, { showNegative });
	const textColor = !showNegative && formattedMetric.isNegative ? 'error' : '';
	return (
		<Stack margin="10px" className="metric" style={styles.container}>
			<Paper
				elevation={2}
				onClick={hasDetail ? onSelect : onClick}
				sx={{
					...styles.paper,
					...(selected ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
					cursor: onSelect || onClick ? 'pointer' : undefined,
					transition: 'border-radius 300ms ease-out',
					transitionDelay: '100ms',
				}}
			>
				{isLoading ? (
					<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} animation="wave" sx={styles.skeleton} />
				) : (
					<Box
						width={METRIC_WIDTH}
						height={METRIC_HEIGHT}
						display="flex"
						justifyContent="space-between"
						alignItems="flex-start"
						padding="10px 20px"
					>
						<Box position="relative" top={-20} right={-140}>
							<Paper sx={{ position: 'absolute', borderRadius: 25 }}>
								<div style={{ ...styles.circle, backgroundColor: color }}>{icon}</div>
							</Paper>
						</Box>
						<Box
							width="100%"
							flex={1}
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							paddingTop="5px"
						>
							{symbol && (
								<Typography color={textColor} fontSize={45} lineHeight="50px">
									{symbol}
								</Typography>
							)}
							<Stack>
								<Box display="flex" justifyContent="flex-start" alignItems="end">
									<Typography color={textColor} fontSize={50} lineHeight="50px" fontWeight="bold">
										{formattedMetric.value}
									</Typography>
									{unit && (
										<Typography color={textColor} fontWeight="bold">
											{unit}
										</Typography>
									)}
								</Box>
								<Typography lineHeight="19px" color={BASE_COLOR_LIGHT}>
									{title}
								</Typography>
							</Stack>
						</Box>
					</Box>
				)}
			</Paper>
			{hasDetail && (
				<Collapse in={selected} unmountOnExit>
					<Paper elevation={1} sx={styles.expandedPaper}>
						<Stack width={METRIC_WIDTH} padding="5px 10px">
							{Object.keys(values ?? {})
								.filter((k) => k !== 'total')
								.map((k) => {
									const formattedKeyMetric = formatMetric(values?.[k]);
									return (
										<Box
											key={k}
											display="flex"
											justifyContent="space-between"
											alignItems="center"
											padding="0px 5px 5px"
										>
											<Typography fontStyle="italic">{capitalize(k)}</Typography>
											<Typography
												color={!showNegative && formattedMetric.isNegative ? 'error' : color}
											>
												{formattedKeyMetric.value}
											</Typography>
										</Box>
									);
								})}
							<Divider />
							{onClick && (
								<Box display="flex" justifyContent="flex-end" alignItems="center" paddingTop="5px">
									<IconButton onClick={onClick} disableRipple>
										<ArrowCircleRight sx={{ fontSize: 21, color: BASE_COLOR }} />
									</IconButton>
								</Box>
							)}
						</Stack>
					</Paper>
				</Collapse>
			)}
		</Stack>
	);
}

const styles = {
	circle: {
		width: 50,
		height: 50,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 25,
	},
	container: {
		transition: 'scale 300ms ease',
	},
	expandedPaper: {
		bgcolor: OFFWHITE_COLOR,
		borderRadius: 3,
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
		border: 1,
		borderColor: 'divider',
	},
	paper: {
		borderRadius: 3,
		border: 1,
		borderColor: 'divider',
	},
	skeleton: {
		borderRadius: 3,
	},
};
