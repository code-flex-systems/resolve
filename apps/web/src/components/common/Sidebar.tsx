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
	Typography,
	Paper,
	Fade,
} from '@mui/material';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT } from '@/styles/theme';
import Image from 'next/image';
import logo from '@/lib/resources/images/Full Logo.png';
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
	color = BASE_COLOR_LIGHT,
	hoverBackgroundColor = 'rgba(33, 181, 255, 0.08)',
}: SidebarProps) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	const toggleOpen = () => setOpen((o) => !o);
	const handleClickAway = () => {
		if (open) setOpen(false);
	};

	// Fixed icon width for consistent centering
	const iconWidth = collapsedWidth - 10; // Account for padding

	return (
		<ClickAwayListener onClickAway={handleClickAway}>
			<Paper
				sx={{
					position: 'fixed',
					top: 0,
					left: 0,
					bottom: 0,
					width: open ? expandedWidth : collapsedWidth,
					backgroundColor: 'white',
					color,
					transition: 'width 0.3s ease',
					overflowX: 'hidden',
					zIndex: 500,
					borderRadius: 0,
					borderTop: 'none',
					borderBottom: 'none',
					borderLeft: 'none',
				}}
			>
				<Box
					onClick={toggleOpen}
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'flex-start',
						height: 50,
						cursor: 'pointer',
						overflow: 'hidden',
						// background: 'linear-gradient(180deg, #21B5FF 0%, #1a9fd9 100%)',
						// borderRadius: '8px',
						margin: '8px',
					}}
				>
					<Box
						sx={{
							width: iconWidth,
							minWidth: iconWidth,
							display: 'flex',
							justifyContent: 'flex-start',
							alignItems: 'center',
						}}
					>
						<Image src={logo} alt="logo" height={45} />
					</Box>
				</Box>

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
									borderRight: selected ? `3px solid ${theme.palette.primary.main}` : undefined,
								}}
							>
								<ListItemButton
									component={Link}
									href={item.route}
									sx={{
										minHeight: 40,
										justifyContent: 'flex-start',
										px: 0,
										color: selected ? theme.palette.primary.main : color,
										bgcolor: selected ? hoverBackgroundColor : 'transparent',
										transition: 'background-color 0.2s ease, color 0.2s ease',
										'&:hover': {
											bgcolor: hoverBackgroundColor,
											color: theme.palette.primary.main,
											'& .MuiListItemIcon-root': {
												color: theme.palette.primary.main,
											},
										},
										borderRadius: '8px',
									}}
								>
									<ListItemIcon
										sx={{
											width: iconWidth,
											minWidth: iconWidth,
											justifyContent: 'center',
											color: selected ? theme.palette.primary.main : BASE_COLOR_LIGHT,
											transition: 'color 0.2s ease',
											'& .MuiSvgIcon-root': { fontSize: 23 },
										}}
									>
										{item.icon}
									</ListItemIcon>
									<Fade in={open} timeout={200}>
										<ListItemText
											primary={item.label}
											sx={{
												opacity: open ? 1 : 0,
												whiteSpace: 'nowrap',
											}}
											slotProps={{
												primary: {
													typography: {
														color: 'inherit',
														fontSize: 14,
														fontWeight: 500,
													},
													noWrap: true,
												},
											}}
										/>
									</Fade>
								</ListItemButton>
							</ListItem>
						);
					})}
				</List>
			</Paper>
		</ClickAwayListener>
	);
}
