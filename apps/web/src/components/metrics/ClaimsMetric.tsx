import { ClaimStatus } from '@/config/enums';
import theme, { BASE_COLOR } from '@/styles/theme';
import { Box, Divider, IconButton, MenuItem, Paper, Select, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { CheckCircle, Info, Troubleshoot } from '@mui/icons-material';
import { PieChart } from '@mui/x-charts';
import { useEffect, useMemo, useState } from 'react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import ExpandableTitle from '../common/ExpandableTitle';
import { useRouter } from 'next/navigation';

const METRIC_WIDTH = 400;
const METRIC_HEIGHT = 350;

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
	const router = useRouter();

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
						<Box
							width="100%"
							display="flex"
							justifyContent="space-between"
							alignItems="center"
							padding="0px 5px"
						>
							<ExpandableTitle
								title="Claim Submission"
								icon={<CheckCircle sx={{ color: 'white' }} />}
								color={theme.palette.warning.main}
								bgcolor="rgba(226, 232, 242, 0.5)"
								padding="5px 0px 10px"
							/>
							<Tooltip
								arrow
								title="A claim is considered complete if all necessary questions have been answered for the related checklist."
							>
								<Info sx={{ color: BASE_COLOR, fontSize: 20, marginLeft: '5px' }} />
							</Tooltip>
							<Tooltip title="Open Inspector">
								<span>
									<IconButton
										sx={{ marginLeft: '5px' }}
										onClick={() => router.push('/metrics/user-activity')}
									>
										<Troubleshoot
											sx={{
												transform: 'scaleX(-1)',
												fontSize: 25,
												color: theme.palette.primary.main,
											}}
										/>
									</IconButton>
								</span>
							</Tooltip>
						</Box>
						<Box display="flex" justifyContent="center" alignItems="center" padding="0px 5px 5px">
							<Typography fontSize={15} paddingTop="3px">
								Viewing claims for
							</Typography>
							<Select
								variant="standard"
								displayEmpty
								value={selectedChecklist ?? ''}
								onChange={(e) => setSelectedChecklist(e.target.value)}
								renderValue={(value) => {
									return checklistOptions.find((o) => o.value === value)?.label ?? 'Select';
								}}
								sx={{
									marginTop: '5px',
									marginLeft: '2px',
									padding: '0px 5px',
									fontSize: 15,
									color: BASE_COLOR,
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
											cy: 150,
										},
									]}
									height={225}
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
		marginTop: 5,
	},
	paper: {
		borderRadius: 3,
		margin: '10px',
		border: 1,
		borderColor: 'divider',
	},
	skeleton: {
		borderRadius: 3,
	},
};
