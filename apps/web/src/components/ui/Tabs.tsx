'use client';

import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import styles from './Tabs.module.css';

/* =========================================================================
   TABS
   ========================================================================= */

export interface TabItem {
	label: string;
	icon?: ReactNode;
}

export interface TabsProps {
	tabs: TabItem[];
	value: number;
	onChange: (index: number) => void;
	className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
	const classNames = [styles.tabs, className].filter(Boolean).join(' ');
	const tabsRef = useRef<HTMLDivElement>(null);
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });

	const updateIndicator = useCallback(() => {
		if (!tabsRef.current) return;
		const buttons = tabsRef.current.querySelectorAll('[role="tab"]');
		const activeButton = buttons[value] as HTMLElement | undefined;
		if (activeButton) {
			const containerRect = tabsRef.current.getBoundingClientRect();
			const buttonRect = activeButton.getBoundingClientRect();
			setIndicator({
				left: buttonRect.left - containerRect.left,
				width: buttonRect.width,
			});
		}
	}, [value]);

	useEffect(() => {
		updateIndicator();
	}, [updateIndicator]);

	// Also update on resize
	useEffect(() => {
		window.addEventListener('resize', updateIndicator);
		return () => window.removeEventListener('resize', updateIndicator);
	}, [updateIndicator]);

	return (
		<div className={classNames} role="tablist" ref={tabsRef}>
			{tabs.map((tab, index) => (
				<button
					key={index}
					role="tab"
					aria-selected={index === value}
					className={`${styles.tab} ${index === value ? styles.active : ''}`}
					onClick={() => onChange(index)}
				>
					{tab.icon && <span className={styles.tabIcon}>{tab.icon}</span>}
					<span>{tab.label}</span>
				</button>
			))}
			<div
				className={styles.indicator}
				style={{
					width: indicator.width,
					transform: `translateX(${indicator.left}px)`,
				}}
			/>
		</div>
	);
}

/* =========================================================================
   TAB PANEL
   ========================================================================= */

export interface TabPanelProps {
	value: number;
	index: number;
	children: ReactNode;
}

export function TabPanel({ value, index, children }: TabPanelProps) {
	if (value !== index) return null;
	return (
		<div role="tabpanel" className={styles.panel}>
			{children}
		</div>
	);
}
