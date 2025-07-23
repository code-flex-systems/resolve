import theme from '@/styles/theme';
import { Box, Collapse, Typography } from '@mui/material';
import { JSX, useEffect, useState } from 'react';

export default function ExpandableTitle({
	title,
	icon,
	color,
	bgcolor,
	padding,
}: {
	title: string;
	icon: JSX.Element;
	color?: string;
	bgcolor?: string;
	padding?: string;
}) {
	const [showTitle, setShowTitle] = useState(false);
	useEffect(() => {
		setShowTitle(true);
		return () => setShowTitle(false);
	});
	return (
		<Box
			width="100%"
			display="flex"
			justifyContent="flex-start"
			alignItems="center"
			padding={padding}
			position="relative"
		>
			<Box
				bgcolor={color ?? theme.palette.primary.main}
				width={30}
				height={30}
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
					sx={{ backgroundColor: bgcolor ?? '#d7d7d7' }}
					paddingLeft="30px"
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
