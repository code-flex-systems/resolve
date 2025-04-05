import theme from '../../styles/theme';

export default function Separator() {
	return (
		<div
			style={{
				width: 7,
				minWidth: 7,
				height: 7,
				margin: '0px 10px',
				backgroundColor: theme.palette.primary.main,
			}}
		/>
	);
}
