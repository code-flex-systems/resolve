import ClaimStatusIcon from '@/components/checklist/ClaimStatusIcon';
import theme from '@/styles/theme';
import { Box, Typography } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';

export default function ClaimStatusCell(props: GridRenderCellParams) {
	return (
		<Box width="100%" height="100%" display="flex" justifyContent="center" alignItems="center">
			<Box
				height="fit-content"
				display="flex"
				justifyContent="center"
				alignItems="center"
				padding="2px 5px"
				border={`1px solid #85D2FF`}
				bgcolor="white"
				borderRadius={3}
				width={110}
			>
				<ClaimStatusIcon status={props.row.status} fontSize={17} />
				<Typography fontSize={14} color="primary" margin="0px 5px">
					{props.row.status}
				</Typography>
			</Box>
		</Box>
	);
}
