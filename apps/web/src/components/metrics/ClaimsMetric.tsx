import { ClaimStatus } from '@/config/enums';
import theme, { BASE_COLOR } from '@/styles/theme';
import { Box, Divider, MenuItem, Paper, Select, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { Info } from '@mui/icons-material';
import { PieChart } from '@mui/x-charts';
import { useEffect, useMemo, useState } from 'react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';

const METRIC_WIDTH = 400;
const METRIC_HEIGHT = 300;

function getProgressPercentage(completed: number, total: number) {
	if (completed === 0 || total === 0) return '0%';
	return `${Math.floor((completed / total) * 100)}%`;
}

function getStatusColor(status: ClaimStatus) {
	switch (status) {
		case ClaimStatus.SUBMITTED:
			return theme.palette.success.light;
		case ClaimStatus.IN_PROGRESS:
			return theme.palette.warning.light;
		case ClaimStatus.UNWORKED:
			return theme.palette.error.light;
	}
}

export default function ClaimsMetric() {
	const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
	const { data = {}, isFetching } = useChecklistTrpc().stats();

	const checklistOptions = useMemo(() => {
		return Object.keys(data).map((key) => {
			const parts = key.split(':');
			return { value: parts[0], label: parts[1] };
		});
	}, [data]);

	const selectedChecklistOption = useMemo(() => {
		const option = checklistOptions.find((o) => o.value === selectedChecklist);
		return option ? { ...option, key: `${option.value}:${option.label}` } : null;
	}, [checklistOptions, selectedChecklist]);

	useEffect(() => {
		setSelectedChecklist(checklistOptions[0]?.value ?? null);
	}, [checklistOptions]);

	return (
		<Paper sx={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} animation="wave" sx={styles.skeleton} />
			) : (
				<Box display="flex" width={METRIC_WIDTH} height={METRIC_HEIGHT} borderRadius={3} padding="10px">
					<Stack flex={1} display="flex" justifyContent="flex-start" alignItems="flex-start">
						<Box display="flex" justifyContent="center" alignItems="center" padding="0px 5px">
							<Tooltip
								arrow
								title="A claim is considered complete if all necessary questions have been answered for the related checklist."
							>
								<Info sx={{ color: BASE_COLOR, fontSize: 20, paddingTop: '3px' }} />
							</Tooltip>
							<Typography marginLeft="5px" fontSize={17} paddingTop="3px">
								Viewing claims for
							</Typography>
							<Select
								variant="filled"
								displayEmpty
								value={selectedChecklist}
								onChange={(e) => setSelectedChecklist(e.target.value)}
								renderValue={(value) => {
									return checklistOptions.find((o) => o.value === value)?.label ?? 'Select';
								}}
								sx={{
									width: 175,
									marginTop: '5px',
									marginLeft: '10px',
									padding: '2px 10px',
									'& .MuiInputBase-root': {
										padding: '2px 5px',
									},
									'& .MuiFilledInput-input': {
										padding: '2px 5px',
									},
								}}
								disabled={!checklistOptions.length}
							>
								{checklistOptions.map((o) => (
									<MenuItem key={o.value} value={o.value}>
										<Typography>{o.label}</Typography>
									</MenuItem>
								))}
							</Select>
						</Box>
						<div style={styles.divider}>
							<Divider />
						</div>
						{selectedChecklistOption && (
							<Stack flex={1} display="flex" justifyContent="center" alignItems="center">
								<PieChart
									series={[
										{
											data: Object.keys(data[selectedChecklistOption.key]).map((status) => {
												const parsedStatus = status as ClaimStatus;
												return {
													id: parsedStatus,
													label: parsedStatus,
													value: data[selectedChecklistOption.key][parsedStatus],
													color: getStatusColor(parsedStatus),
												};
											}),
											valueFormatter: (v) => `${v.value} claim(s)`,
											innerRadius: 75,
											outerRadius: 125,
											paddingAngle: 2,
											cornerRadius: 5,
											startAngle: -110,
											endAngle: 110,
											cy: 125,
										},
									]}
									height={175}
								/>
								<Box position="relative">
									<Stack
										display="flex"
										justifyContent="center"
										alignItems="center"
										position="absolute"
										width={80}
										left={-90}
										top={-120}
									>
										<Typography fontWeight="bold" fontSize={40} lineHeight="40px">
											{getProgressPercentage(
												data[selectedChecklistOption.key][ClaimStatus.SUBMITTED],
												data[selectedChecklistOption.key][ClaimStatus.SUBMITTED] +
													data[selectedChecklistOption.key][ClaimStatus.IN_PROGRESS] +
													data[selectedChecklistOption.key][ClaimStatus.UNWORKED]
											)}
										</Typography>
										<Typography paddingTop="5px" fontSize={17} lineHeight="17px" fontWeight="bold">
											Submitted
										</Typography>
									</Stack>
								</Box>
							</Stack>
						)}
					</Stack>
				</Box>
			)}
		</Paper>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		marginTop: 15,
	},
	paper: {
		borderRadius: 3,
		margin: '10px',
	},
	skeleton: {
		borderRadius: 3,
	},
};
