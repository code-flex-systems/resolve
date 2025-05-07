import theme from '../../styles/theme';

export default function Separator(props: { color?: string }) {
	return (
		<div
			style={{
				width: 7,
				minWidth: 7,
				height: 7,
				margin: '0px 10px',
				backgroundColor: props.color ?? theme.palette.primary.main,
			}}
		/>
	);
}
