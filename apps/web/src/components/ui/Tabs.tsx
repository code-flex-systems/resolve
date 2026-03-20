'use client';

import { type ReactNode } from 'react';
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

	return (
		<div className={classNames} role="tablist">
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
					width: `${100 / tabs.length}%`,
					transform: `translateX(${value * 100}%)`,
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
