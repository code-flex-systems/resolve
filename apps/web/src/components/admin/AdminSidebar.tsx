'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Collapse, Typography } from '@mui/material';

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
	width?: number;
}

export default function AdminSidebar({ categories, width = 240 }: AdminSidebarProps) {
	const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
		const initial: Record<string, boolean> = {};
		categories.forEach((cat) => {
			initial[cat.label] = cat.defaultExpanded ?? true;
		});
		return initial;
	});
	const pathname = usePathname();

	return (
		<Box sx={styles.container} style={{ width }}>
			{/* Categories */}
			<List disablePadding sx={{ pt: 1.5 }}>
				{categories.map((category, categoryIndex) => {
					const isCategoryExpanded = expandedCategories[category.label];

					return (
						<Box key={category.label} sx={{ mb: 2 }}>
							{/* Category Header */}
							{!category.hideHeader && (
								<Box sx={styles.categoryHeader}>
									<Typography sx={styles.categoryLabel}>{category.label}</Typography>
								</Box>
							)}

							{/* Category Items */}
							<Collapse in={category.hideHeader || isCategoryExpanded} timeout="auto" unmountOnExit>
								<List disablePadding>
									{category.items.map((item) => {
										const matchingRoute = category.items
											.filter((i) => pathname === i.route || pathname.startsWith(i.route + '/'))
											.sort((a, b) => b.route.length - a.route.length)[0];
										const selected = matchingRoute?.route === item.route;
										return (
											<ListItem key={item.route} disablePadding sx={{ px: 1.5, py: 0.25 }}>
												<ListItemButton
													component={Link}
													href={item.route}
													sx={{
														...styles.navItem,
														...(selected && styles.navItemSelected),
													}}
												>
													<ListItemIcon
														sx={{
															...styles.navIcon,
															color: selected
																? 'var(--color-primary)'
																: 'var(--color-text-secondary)',
														}}
													>
														{item.icon}
													</ListItemIcon>
													<ListItemText
														primary={item.label}
														slotProps={{
															primary: {
																sx: {
																	fontSize: 13,
																	fontWeight: selected ? 500 : 400,
																	color: selected
																		? 'var(--color-text-primary)'
																		: 'var(--color-text-secondary)',
																	whiteSpace: 'nowrap',
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
						</Box>
					);
				})}
			</List>
		</Box>
	);
}

const styles = {
	container: {
		height: '100vh',
		bgcolor: 'var(--color-bg-primary)',
		borderRight: '1px solid var(--color-border)',
		overflowY: 'auto',
		overflowX: 'hidden',
		flexShrink: 0,
	},
	categoryHeader: {
		px: 2,
		py: 0.75,
		mb: 0.5,
	},
	categoryLabel: {
		fontSize: 11,
		fontWeight: 600,
		textTransform: 'uppercase',
		color: 'var(--color-text-muted)',
		letterSpacing: '0.5px',
	},
	navItem: {
		minHeight: 32,
		px: 1.5,
		py: 0.5,
		borderRadius: 'var(--radius-md)',
		transition: 'all 150ms ease',
		'&:hover': {
			bgcolor: 'var(--color-bg-hover)',
		},
	},
	navItemSelected: {
		bgcolor: 'var(--color-primary-light)',
		'&:hover': {
			bgcolor: 'var(--color-primary-light)',
		},
	},
	navIcon: {
		minWidth: 0,
		mr: 1.5,
		'& .MuiSvgIcon-root': {
			fontSize: 18,
		},
	},
};
