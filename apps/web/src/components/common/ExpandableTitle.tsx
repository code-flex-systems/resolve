'use client';

import theme from '@/styles/theme';
import { Box, Collapse, Typography } from '@mui/material';
import { JSX, useEffect, useState } from 'react';

export default function ExpandableTitle({
	title,
	icon,
	color = theme.palette.primary.main,
	bgcolor = '#F0F3F7',
	padding,
	size = 30,
}: {
	title: string;
	icon: JSX.Element;
	color?: string;
	bgcolor?: string;
	padding?: string;
	size?: number;
}) {
	const [showTitle, setShowTitle] = useState(false);
	useEffect(() => {
		setShowTitle(true);
		return () => setShowTitle(false);
	}, []);
	return (
		<Box
			width="fit-content"
			display="flex"
			justifyContent="flex-start"
			alignItems="center"
			padding={padding}
			position="relative"
		>
			<Box
				bgcolor={color}
				width={size}
				height={size}
				display="flex"
				justifyContent="center"
				alignItems="center"
				borderRadius={30}
				position="absolute"
				left={0}
			>
				{icon}
			</Box>
			<Collapse in={showTitle} timeout={500} orientation="horizontal">
				<Box
					width="fit-content"
					display="flex"
					justifyContent="center"
					alignItems="center"
					borderRadius={30}
					paddingRight="15px"
					sx={{ backgroundColor: bgcolor }}
					paddingLeft={`${size}px`}
					overflow="hidden"
				>
					<Typography fontSize={17} marginLeft="5px" noWrap>
						{title}
					</Typography>
				</Box>
			</Collapse>
		</Box>
	);
}
