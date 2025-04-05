import { useState } from "react";
import theme from '../../styles/theme';

export default function PageDot(props: {
	id: number,
	onClick: () => void,
	filled?: boolean,
	disabled?: boolean
}) {
	const [hovered, setHovered] = useState(false);
	return (
		<div
			style={{
				width: props.disabled ? 5 : 10,
				height: props.disabled ? 5 : 10,
				margin: 5,
				borderRadius: 25,
				outline: `1px solid ${theme.palette.primary.main}`,
				backgroundColor: (props.filled || props.disabled || hovered) ? theme.palette.primary.main : 'white',
				transition: 'background-color 300ms ease, width 300ms ease, height 100ms ease',
				cursor: props.disabled ? undefined : 'pointer'
			}}
			onClick={props.disabled ? undefined : props.onClick}
			onMouseEnter={props.disabled ? undefined : () => setHovered(true)}
			onMouseLeave={props.disabled ? undefined : () => setHovered(false)}
		/>
	);
}