import { Box, Typography } from '@mui/material';

export default function MetricValue({ value, fontSize = 15 }: { value: string | number; fontSize?: number }) {
	return (
		<Box display="flex" justifyContent="center" alignItems="center" style={styles.dot} bgcolor="#F0F3F7">
			<Typography fontSize={fontSize} noWrap>
				{value}
			</Typography>
		</Box>
	);
}

const styles = {
	dot: {
		padding: '0px 5px',
		height: 21,
		borderRadius: 5,
		cursor: 'pointer',
	},
};
