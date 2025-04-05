import { Collapse, Typography, TypographyProps } from '@mui/material';
import { PropsWithChildren } from 'react';

export default function LinearTextCollapse(props: {
	show: boolean,
	timeout?: number,
	fontSize?: string | number,
	fontWeight?: TypographyProps['fontWeight'],
	fontStyle?: TypographyProps['fontStyle'],
} & PropsWithChildren) {
	const { show, timeout = 1000, fontSize = 15, fontWeight, fontStyle } = props;
	return (
		<Collapse
			in={show}
			timeout={timeout}
			orientation='horizontal'
			sx={{ transition: `width ${timeout}ms linear, opacity ${timeout}ms linear` }}
		>
			<Typography fontSize={fontSize} fontWeight={fontWeight} fontStyle={fontStyle} noWrap>
				{props.children}
			</Typography>
		</Collapse>
	);
}