'use client';

import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

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

	const isCategoryActive = (category: AdminNavCategory) => {
		return category.items.some((item) => pathname === item.route || pathname.startsWith(item.route + '/'));
	};

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
		<div className={styles.container} style={{ width }}>
			{!!title && (
				<div className={styles.title}>{title}</div>
			)}
			<ul className={styles.list}>
				{categories.map((category) => {
					const isCategoryExpanded = expandedCategories[category.label];

					return (
						<div key={category.label}>
							{!category.hideHeader && (
								<li>
									<div
										role="button"
										tabIndex={0}
										className={styles.categoryHeader}
										onClick={() => toggleCategory(category.label)}
										onKeyDown={(e) => e.key === 'Enter' && toggleCategory(category.label)}
									>
										<span className={styles.categoryIcon}>{category.icon}</span>
										<span className={styles.categoryLabel}>{category.label}</span>
										{isCategoryExpanded ? (
											<IconChevronDown size={16} stroke={1.5} className={styles.expandIcon} />
										) : (
											<IconChevronRight size={16} stroke={1.5} className={styles.expandIcon} />
										)}
									</div>
								</li>
							)}

							<Collapse open={category.hideHeader || isCategoryExpanded}>
								<ul className={styles.list}>
									<div className={styles.verticalLine} />
									{category.items.map((item) => {
										const matchingRoute = category.items
											.filter((i) => pathname === i.route || pathname.startsWith(i.route + '/'))
											.sort((a, b) => b.route.length - a.route.length)[0];
										const selected = matchingRoute?.route === item.route;

										return (
											<li key={item.route}>
												<a
													href={item.route}
													className={`${styles.navItem} ${selected ? styles.navItemSelected : ''}`}
												>
													{selected && <div className={styles.selectedAccent} />}
													<span className={styles.navItemLabel}>{item.label}</span>
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
