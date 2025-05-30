'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	Box,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ClickAwayListener,
	Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import theme from '@/styles/theme';

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

export default function GPTSidebar({
	items,
	collapsedWidth = 60,
	expandedWidth = 240,
	backgroundColor = '#333',
	color = '#fff',
	hoverBackgroundColor = '#fff',
	hoverColor = '#333',
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
					bgcolor: backgroundColor,
					color,
					transition: 'width 0.3s',
					overflowX: 'hidden',
					zIndex: 1200,
				}}
			>
				{/* Hamburger toggle */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: open ? 'flex-end' : 'center',
						height: 60,
						px: 1,
					}}
				>
					<IconButton onClick={toggleOpen} sx={{ color, '& .MuiSvgIcon-root': { fontSize: 23 } }}>
						<MenuIcon />
					</IconButton>
				</Box>
				<Divider sx={{ borderColor: color }} />

				<List disablePadding>
					{items.map((item) => {
						const selected = pathname === item.route;
						return (
							<ListItem
								key={item.route}
								disablePadding
								sx={{ display: 'block', border: `5px solid ${theme.palette.secondary.main}` }}
							>
								<ListItemButton
									component={Link}
									href={item.route}
									sx={{
										minHeight: 48,
										justifyContent: open ? 'initial' : 'center',
										px: 2.5,
										color: selected ? hoverColor : color,
										bgcolor: selected ? hoverBackgroundColor : 'inherit',
										'&:hover': { bgcolor: hoverBackgroundColor, color: hoverColor },
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
											primaryTypographyProps={{ color: 'inherit' }}
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
