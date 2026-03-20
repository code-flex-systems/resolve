'use client';

import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
		<div style={{ ...styles.container, paddingTop: 16, width }}>
			{!!title && (
				<div style={{ padding: '5px 10px' }}>
					<span style={{ fontWeight: 'bold' }}>{title}</span>
				</div>
			)}
			<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
				{categories.map((category) => {
					const isCategoryExpanded = expandedCategories[category.label];

					return (
						<div key={category.label}>
							{/* Category Header - Clickable to expand/collapse */}
							{!category.hideHeader && (
								<li>
									<div role="button" tabIndex={0}
										onClick={() => toggleCategory(category.label)}
										style={styles.categoryHeader}
									>
										<span>{category.icon}</span>
										<span />
										{isCategoryExpanded ? (
											<IconChevronDown style={styles.expandIcon} />
										) : (
											<IconChevronRight style={styles.expandIcon} />
										)}
									</div>
								</li>
							)}

							{/* Category Items */}
							<Collapse open={category.hideHeader || isCategoryExpanded}>
								<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
									{/* Vertical dotted line */}
									<div style={styles.verticalLine} />

									{category.items.map((item, index) => {
										const matchingRoute = category.items
											.filter((i) => pathname === i.route || pathname.startsWith(i.route + '/'))
											.sort((a, b) => b.route.length - a.route.length)[0];
										const selected = matchingRoute?.route === item.route;
										const isLast = index === category.items.length - 1;

										return (
											<li>
												<a
													href={item.route}
													role="button" tabIndex={0}
													style={{
														textDecoration: 'none', color: 'inherit',
														...styles.navItem,
														...(selected && styles.navItemSelected),
													}}
												>
													{/* Accent bar for selected item */}
													{selected && <div style={styles.selectedAccent} />}

													<span />
												</a>
											</li>
										);
									})}
								</ul>
							</Collapse>
						</div>
					);
				})}
			</ul>
		</div>
	);
}

const styles = {
	container: {
		height: '100vh',
		backgroundColor: '#ffffff',
		// borderRight: `1px solid ${'var(--border)'}`,
		overflowY: 'auto' as const,
		overflowX: 'hidden' as const,
		flexShrink: 0,
	},
	categoryHeader: {
		minHeight: 36,
		paddingInline: 10,
		paddingBlock: 4,
		borderRadius: 6,
		transition: 'all 150ms ease',
		},
	categoryIcon: {
		minWidth: 0,
		marginRight: 10,
		},
	categoryLabel: {
		fontSize: 13,
		fontWeight: 500,
		color: 'var(--text-primary)',
	},
	expandIcon: {
		fontSize: 18,
		color: 'var(--text-secondary)',
	},
	verticalLine: {
		position: 'absolute' as const,
		left: 22,
		top: 0,
		bottom: 8,
		width: 0,
		borderLeft: `1px dashed ${'var(--border)'}`,
	},
	navItem: {
		minHeight: 32,
		marginLeft: 32,
		paddingLeft: 12,
		paddingRight: 8,
		paddingBlock: 2,
		borderRadius: 6,
		position: 'relative' as const,
		transition: 'all 150ms ease',
		},
	navItemSelected: {
		backgroundColor: 'rgba(33, 181, 255, 0.08)',
		},
	selectedAccent: {
		position: 'absolute' as const,
		left: 0,
		top: '50%',
		transform: 'translateY(-50%)',
		width: 3,
		height: 16,
		backgroundColor: ACCENT_COLOR,
		borderRadius: 4,
	},
};
