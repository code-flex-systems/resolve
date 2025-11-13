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
	Collapse,
	IconButton,
	Tooltip,
	Divider,
	Paper,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import theme from '@/styles/theme';

export interface AdminNavItem {
	label: string;
	route: string;
	icon: React.ReactNode;
}

export interface AdminNavCategory {
	label: string;
	icon: React.ReactNode;
	items: AdminNavItem[];
	defaultExpanded?: boolean;
	/** If true, items are shown directly without a collapsible category header */
	hideHeader?: boolean;
}

export interface AdminSidebarProps {
	categories: AdminNavCategory[];
	collapsedWidth?: number;
	expandedWidth?: number;
}

export default function AdminSidebar({ categories, collapsedWidth = 60, expandedWidth = 250 }: AdminSidebarProps) {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
		// Initialize with default expanded states
		const initial: Record<string, boolean> = {};
		categories.forEach((cat) => {
			initial[cat.label] = cat.defaultExpanded ?? true;
		});
		return initial;
	});
	const pathname = usePathname();

	const toggleSidebar = () => setSidebarOpen((o) => !o);

	const toggleCategory = (categoryLabel: string) => {
		setExpandedCategories((prev) => ({
			...prev,
			[categoryLabel]: !prev[categoryLabel],
		}));
	};

	return (
		<Box
			sx={{
				width: sidebarOpen ? expandedWidth : collapsedWidth,
				height: '100vh',
				backgroundColor: '#fafafa',
				borderRight: '1px solid #e0e0e0',
				transition: 'width 0.3s',
				overflowY: 'auto',
				overflowX: 'hidden',
				flexShrink: 0,
			}}
		>
			{/* Toggle button */}
			<Box
				sx={{
					display: 'flex',
					justifyContent: sidebarOpen ? 'flex-end' : 'center',
					alignItems: 'center',
					height: 50,
					px: 1,
					borderBottom: '1px solid #e0e0e0',
				}}
			>
				<IconButton onClick={toggleSidebar} size="small">
					{sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
				</IconButton>
			</Box>

			{/* Categories */}
			<List disablePadding sx={{ py: 1 }}>
				{categories.map((category, categoryIndex) => {
					const isCategoryExpanded = expandedCategories[category.label];

					return (
						<Box key={category.label}>
							{/* Category Header (optional) */}
							{!category.hideHeader &&
								(sidebarOpen ? (
									<ListItemButton
										onClick={() => toggleCategory(category.label)}
										sx={{
											px: 2,
											py: 1,
											minHeight: 40,
										}}
									>
										<ListItemIcon
											sx={{
												minWidth: 0,
												mr: 1,
												color: theme.palette.text.secondary,
												'& .MuiSvgIcon-root': { fontSize: 20 },
											}}
										>
											{category.icon}
										</ListItemIcon>

										<ListItemText
											primary={category.label}
											slotProps={{
												primary: {
													style: {
														fontSize: 12,
														fontWeight: 600,
														textTransform: 'uppercase',
														color: theme.palette.text.secondary,
														textWrap: 'nowrap',
													},
												},
											}}
										/>
										{/* {isCategoryExpanded ? (
											<ExpandLess fontSize="small" />
										) : (
											<ExpandMore fontSize="small" />
										)} */}
									</ListItemButton>
								) : (
									<Tooltip title={category.label} placement="right">
										<Box
											sx={{
												display: 'flex',
												justifyContent: 'center',
												py: 1,
												color: theme.palette.text.secondary,
											}}
										>
											{category.icon}
										</Box>
									</Tooltip>
								))}

							{/* Category Items */}
							{sidebarOpen ? (
								<Collapse in={category.hideHeader || isCategoryExpanded} timeout="auto" unmountOnExit>
									<List disablePadding>
										{category.items.map((item) => {
											const selected =
												pathname === item.route || pathname.startsWith(item.route + '/');
											return (
												<ListItem key={item.route} disablePadding sx={{ pl: 1 }}>
													<ListItemButton
														component={Link}
														href={item.route}
														sx={{
															minHeight: 36,
															pl: 4,
															pr: 2,
															borderRadius: 1,
															mx: 1,
															color: selected
																? theme.palette.primary.main
																: theme.palette.text.primary,
															bgcolor: selected
																? `${theme.palette.primary.main}15`
																: 'transparent',
															'&:hover': {
																bgcolor: selected
																	? `${theme.palette.primary.main}25`
																	: theme.palette.action.hover,
															},
														}}
													>
														<ListItemIcon
															sx={{
																minWidth: 0,
																mr: 1,
																color: selected
																	? theme.palette.primary.main
																	: theme.palette.text.secondary,
																'& .MuiSvgIcon-root': { fontSize: 18 },
															}}
														>
															{item.icon}
														</ListItemIcon>
														<ListItemText
															primary={item.label}
															slotProps={{
																primary: {
																	style: {
																		fontSize: 13,
																		fontWeight: selected ? 500 : 400,
																		textWrap: 'nowrap',
																	},
																},
															}}
														/>
													</ListItemButton>
												</ListItem>
											);
										})}
									</List>
								</Collapse>
							) : (
								// Collapsed state - show icons only
								<List disablePadding>
									{category.items.map((item) => {
										const selected =
											pathname === item.route || pathname.startsWith(item.route + '/');
										return (
											<ListItem key={item.route} disablePadding>
												<Tooltip title={item.label} placement="right">
													<ListItemButton
														component={Link}
														href={item.route}
														sx={{
															minHeight: 36,
															justifyContent: 'center',
															color: selected
																? theme.palette.primary.main
																: theme.palette.text.secondary,
															bgcolor: selected
																? `${theme.palette.primary.main}15`
																: 'transparent',
															'&:hover': {
																bgcolor: selected
																	? `${theme.palette.primary.main}25`
																	: theme.palette.action.hover,
															},
														}}
													>
														<ListItemIcon
															sx={{
																minWidth: 0,
																justifyContent: 'center',
																color: 'inherit',
																'& .MuiSvgIcon-root': { fontSize: 20 },
															}}
														>
															{item.icon}
														</ListItemIcon>
													</ListItemButton>
												</Tooltip>
											</ListItem>
										);
									})}
								</List>
							)}

							{/* Divider between categories */}
							{categoryIndex < categories.length - 1 && <Divider sx={{ my: 1, mx: 2 }} />}
						</Box>
					);
				})}
			</List>
		</Box>
	);
}
