'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import logo from '@/lib/resources/images/Full Logo.png';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useTheme } from '@/hooks/useTheme';
import css from './Sidebar.module.css';

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
}: SidebarProps) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const sidebarRef = useRef<HTMLDivElement>(null);
	const { theme: currentTheme, toggleTheme } = useTheme();

	const toggleOpen = () => setOpen((o) => !o);

	// Close on click outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (open && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [open]);

	const iconWidth = collapsedWidth - 10;

	return (
		<div
			ref={sidebarRef}
			className={css.sidebar}
			style={{ width: open ? expandedWidth : collapsedWidth }}
		>
			<div className={css.logoArea} onClick={toggleOpen}>
				<div className={css.logoIconContainer} style={{ width: iconWidth, minWidth: iconWidth }}>
					<Image src={logo} alt="logo" height={45} />
				</div>
			</div>

			<ul className={css.nav}>
				{items.map((item) => {
					const selected = pathname.startsWith(item.route);
					return (
						<li
							key={item.route}
							className={[css.navItem, selected ? css.navItemSelected : ''].filter(Boolean).join(' ')}
						>
							<Link
								href={item.route}
								className={[css.navLink, selected ? css.navLinkSelected : ''].filter(Boolean).join(' ')}
								style={{ color: selected ? 'var(--text-accent)' : undefined }}
							>
								<span
									className={[css.navIcon, selected ? css.navIconSelected : ''].filter(Boolean).join(' ')}
									style={{ width: iconWidth, minWidth: iconWidth }}
								>
									{item.icon}
								</span>
								<span
									className={[css.navLabel, !open ? css.navLabelHidden : ''].filter(Boolean).join(' ')}
								>
									{item.label}
								</span>
							</Link>
						</li>
					);
				})}
			</ul>

			<div className={css.themeToggle} style={{ width: open ? expandedWidth : collapsedWidth }}>
				<button className={css.themeButton} onClick={toggleTheme} type="button">
					{currentTheme === 'light' ? (
						<IconMoon size={18} stroke={1.5} />
					) : (
						<IconSun size={18} stroke={1.5} />
					)}
				</button>
			</div>
		</div>
	);
}
