'use client';

import { useState, useEffect } from 'react';
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
	Typography,
	Stack,
} from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { TEXT_PRIMARY, TEXT_SECONDARY, BORDER_COLOR, BG_TERTIARY } from '@/styles/theme';

const ACCENT_COLOR = '#21B5FF';

export interface AdminNavItem {
	label: string;
	route: string;
	icon?: React.ReactNode;
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
	title?: string;
	categories: AdminNavCategory[];
	width?: number;
}

export default function AdminSidebar({ title, categories, width = 240 }: AdminSidebarProps) {
	const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
		const initial: Record<string, boolean> = {};
		categories.forEach((cat) => {
			initial[cat.label] = cat.defaultExpanded ?? false;
		});
		return initial;
	});
	const pathname = usePathname();

	// Check if any item in a category is selected
	const isCategoryActive = (category: AdminNavCategory) => {
		return category.items.some((item) => pathname === item.route || pathname.startsWith(item.route + '/'));
	};

	// Auto-expand categories when a child route is active
	useEffect(() => {
		const newExpanded: Record<string, boolean> = {};
		let hasChanges = false;
		categories.forEach((cat) => {
			if (!cat.hideHeader && isCategoryActive(cat) && !expandedCategories[cat.label]) {
				newExpanded[cat.label] = true;
				hasChanges = true;
			}
		});
		if (hasChanges) {
			setExpandedCategories((prev) => ({ ...prev, ...newExpanded }));
		}
	}, [pathname, categories]);

	const toggleCategory = (label: string) => {
		setExpandedCategories((prev) => ({
			...prev,
			[label]: !prev[label],
		}));
	};

	return (
		<Stack pt={2} sx={styles.container} style={{ width }}>
			{!!title && (
				<Box padding="5px 10px">
					<Typography fontWeight="bold">{title}</Typography>
				</Box>
			)}
			<List disablePadding sx={{ py: 0.5 }}>
				{categories.map((category) => {
					const isCategoryExpanded = expandedCategories[category.label];

					return (
						<Box key={category.label}>
							{/* Category Header - Clickable to expand/collapse */}
							{!category.hideHeader && (
								<ListItem disablePadding sx={{ px: 0.75 }}>
									<ListItemButton
										onClick={() => toggleCategory(category.label)}
										sx={styles.categoryHeader}
									>
										<ListItemIcon sx={styles.categoryIcon}>{category.icon}</ListItemIcon>
										<ListItemText
											primary={category.label}
											slotProps={{
												primary: {
													sx: styles.categoryLabel,
												},
											}}
										/>
										{isCategoryExpanded ? (
											<ExpandMore sx={styles.expandIcon} />
										) : (
											<ChevronRight sx={styles.expandIcon} />
										)}
									</ListItemButton>
								</ListItem>
							)}

							{/* Category Items */}
							<Collapse in={category.hideHeader || isCategoryExpanded} timeout="auto" unmountOnExit>
								<List disablePadding sx={{ position: 'relative' }}>
									{/* Vertical dotted line */}
									<Box sx={styles.verticalLine} />

									{category.items.map((item, index) => {
										const matchingRoute = category.items
											.filter((i) => pathname === i.route || pathname.startsWith(i.route + '/'))
											.sort((a, b) => b.route.length - a.route.length)[0];
										const selected = matchingRoute?.route === item.route;
										const isLast = index === category.items.length - 1;

										return (
											<ListItem key={item.route} disablePadding sx={{ px: 0.75 }}>
												<ListItemButton
													component={Link}
													href={item.route}
													sx={{
														...styles.navItem,
														...(selected && styles.navItemSelected),
													}}
												>
													{/* Accent bar for selected item */}
													{selected && <Box sx={styles.selectedAccent} />}

													<ListItemText
														primary={item.label}
														slotProps={{
															primary: {
																sx: {
																	fontSize: 13,
																	fontWeight: selected ? 500 : 400,
																	color: selected ? TEXT_PRIMARY : TEXT_SECONDARY,
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
		</Stack>
	);
}

const styles = {
	container: {
		height: '100vh',
		bgcolor: '#ffffff',
		// borderRight: `1px solid ${BORDER_COLOR}`,
		overflowY: 'auto',
		overflowX: 'hidden',
		flexShrink: 0,
	},
	categoryHeader: {
		minHeight: 36,
		px: 1.25,
		py: 0.5,
		borderRadius: 1.5,
		transition: 'all 150ms ease',
		'&:hover': {
			bgcolor: BG_TERTIARY,
		},
	},
	categoryIcon: {
		minWidth: 0,
		mr: 1.25,
		'& .MuiSvgIcon-root': {
			fontSize: 18,
			color: TEXT_SECONDARY,
		},
	},
	categoryLabel: {
		fontSize: 13,
		fontWeight: 500,
		color: TEXT_PRIMARY,
	},
	expandIcon: {
		fontSize: 18,
		color: TEXT_SECONDARY,
	},
	verticalLine: {
		position: 'absolute',
		left: 22,
		top: 0,
		bottom: 8,
		width: 0,
		borderLeft: `1px dashed ${BORDER_COLOR}`,
	},
	navItem: {
		minHeight: 32,
		ml: 4,
		pl: 1.5,
		pr: 1,
		py: 0.25,
		borderRadius: 1.5,
		position: 'relative',
		transition: 'all 150ms ease',
		'&:hover': {
			bgcolor: BG_TERTIARY,
		},
	},
	navItemSelected: {
		bgcolor: 'rgba(33, 181, 255, 0.08)',
		'&:hover': {
			bgcolor: 'rgba(33, 181, 255, 0.12)',
		},
	},
	selectedAccent: {
		position: 'absolute',
		left: 0,
		top: '50%',
		transform: 'translateY(-50%)',
		width: 3,
		height: 16,
		bgcolor: ACCENT_COLOR,
		borderRadius: 1,
	},
};
