import { Link, Skeleton, Stack } from '@mui/material';
import { Logout } from '@mui/icons-material';

export default function MetricAction({
	action,
	actionText,
	actionValue,
	color,
	loading = false,
}: {
	action: () => void;
	actionText: string;
	actionValue: string;
	color: string;
	loading?: boolean;
}) {
	return (
		<Stack width={150} display="flex" justifyContent="flex-start" alignItems="flex-start" margin="0px 20px">
			{loading ? (
				<>
					<Skeleton width={130} height={5} variant="rounded" />
					<Skeleton width={100} height={5} variant="rounded" sx={{ marginTop: '5px ' }} />
					<Skeleton width={50} height={5} variant="rounded" sx={{ marginTop: '5px ' }} />
				</>
			) : (
				<>
					<Link onClick={action} fontSize={15} underline="hover" color={color}>
						{actionText}
						<br />({actionValue})
					</Link>
					<Logout sx={{ color, marginTop: '5px' }} />
				</>
			)}
		</Stack>
	);
}
