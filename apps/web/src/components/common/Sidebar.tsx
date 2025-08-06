'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	Box,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ClickAwayListener,
	Divider,
	Typography,
} from '@mui/material';
import theme from '@/styles/theme';
import Image from 'next/image';
import logo from '@/lib/resources/images/logo.png';
import config from '@/config/config';

export interface NavItem {
	label: string;
	route: string;
	icon: React.ReactNode;
}

export interface SidebarProps {
	items: NavItem[];
	/** Width when collapsed */
	collapsedWidth?: number;
	/** Width when expanded */
	expandedWidth?: number;
	/** Background color of the sidebar */
	backgroundColor?: string;
	/** Text/icon color */
	color?: string;
	/** Background on hover/selected */
	hoverBackgroundColor?: string;
	/** Color on hover/selected */
	hoverColor?: string;
}

export default function Sidebar({
	items,
	collapsedWidth = 60,
	expandedWidth = 240,
	color = '#fff',
	hoverBackgroundColor = '#fff',
}: SidebarProps) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	const toggleOpen = () => setOpen((o) => !o);
	const handleClickAway = () => {
		if (open) setOpen(false);
	};

	return (
		<ClickAwayListener onClickAway={handleClickAway}>
			<Box
				sx={{
					position: 'fixed',
					top: 0,
					left: 0,
					bottom: 0,
					width: open ? expandedWidth : collapsedWidth,
					background: 'linear-gradient(180deg, rgb(33, 106, 196), rgba(33, 106, 196, 0.9))',
					color,
					transition: 'width 0.3s',
					overflowX: 'hidden',
					zIndex: 1200,
				}}
			>
				<Box
					onClick={toggleOpen}
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'flex-start',
						height: 60,
						cursor: 'pointer',
						width: expandedWidth,
						overflow: 'hidden',
					}}
				>
					<Box width={collapsedWidth} display="flex" justifyContent="center" alignItems="center">
						<Image src={logo} alt="logo" height={35} />
					</Box>
					<Typography color="white" fontSize={30} paddingTop="5px" marginRight="5px">
						{config.APP_NAME}
					</Typography>
				</Box>
				<Divider sx={{ borderColor: color }} />

				<List disablePadding>
					{items.map((item) => {
						const selected = pathname.startsWith(item.route);
						return (
							<ListItem
								key={item.route}
								disablePadding
								sx={{
									display: 'block',
									padding: '5px',
									borderRadius: 20,
								}}
							>
								<ListItemButton
									component={Link}
									href={item.route}
									sx={{
										minHeight: 48,
										justifyContent: open ? 'initial' : 'center',
										px: 2.5,
										color: selected ? theme.palette.primary.main : color,
										bgcolor: selected ? hoverBackgroundColor : 'inherit',
										'&:hover': {
											bgcolor: hoverBackgroundColor,
											color: theme.palette.primary.main,
										},
										borderRadius: 1,
									}}
								>
									<ListItemIcon
										sx={{
											minWidth: 0,
											mr: open ? 3 : 'auto',
											justifyContent: 'center',
											color: 'inherit',
											'& .MuiSvgIcon-root': { fontSize: 23 },
										}}
									>
										{item.icon}
									</ListItemIcon>
									{open && (
										<ListItemText
											primary={item.label}
											slotProps={{
												primary: {
													typography: {
														color: 'inherit',
													},
													noWrap: true,
												},
											}}
										/>
									)}
								</ListItemButton>
							</ListItem>
						);
					})}
				</List>
			</Box>
		</ClickAwayListener>
	);
}
