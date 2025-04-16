import { JSX } from 'react';

export default function Toolbar(props: {
	height?: string | number;
	padding?: string | number;
	left?: JSX.Element;
	leftWidth?: string;
	right?: JSX.Element;
	rightWidth?: string;
	backgroundColor?: string;
}) {
	const { height = 40, padding = '0px 10px', left, leftWidth, right, rightWidth, backgroundColor } = props;
	return (
		<div style={{ ...styles.toolbar, height, minHeight: height, padding, backgroundColor }}>
			<div style={{ ...styles.toolbar, width: leftWidth ?? '50%', justifyContent: 'flex-start' }}>{left}</div>
			<div style={{ ...styles.toolbar, width: rightWidth ?? '50%', justifyContent: 'flex-end' }}>{right}</div>
		</div>
	);
}

const styles = {
	toolbar: {
		width: '100%',
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
};
