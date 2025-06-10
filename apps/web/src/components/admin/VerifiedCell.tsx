import { Link, Tooltip } from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';

export default function VerifiedCell({
	value,
	verified,
	disabled,
}: {
	value: string;
	verified: boolean;
	disabled: boolean;
}) {
	return value ? (
		<div style={{ width: '100%' }} className="flex-row-left">
			{!disabled && (
				<Tooltip title={verified ? 'Verified' : 'Unverified'} enterDelay={500}>
					{verified ? (
						<CheckCircle sx={styles.icon} color="success" />
					) : (
						<ErrorOutline sx={styles.icon} color="warning" />
					)}
				</Tooltip>
			)}
			<Link marginLeft="5px">{value}</Link>
		</div>
	) : (
		<></>
	);
}

const styles = {
	icon: {
		fontSize: 17,
		cursor: 'pointer',
	},
};
