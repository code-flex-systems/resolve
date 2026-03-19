'use client';

import { useState, type ReactNode } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import styles from './Accordion.module.css';

export interface AccordionProps {
	title: ReactNode;
	defaultOpen?: boolean;
	children: ReactNode;
	className?: string;
}

function Accordion({ title, defaultOpen = false, children, className }: AccordionProps) {
	const [open, setOpen] = useState(defaultOpen);

	const classNames = [styles.accordion, className].filter(Boolean).join(' ');

	return (
		<div className={classNames}>
			<div
				className={styles.header}
				role="button"
				tabIndex={0}
				onClick={() => setOpen((v) => !v)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						setOpen((v) => !v);
					}
				}}
			>
				<span className={styles.title}>{title}</span>
				<IconChevronDown
					size={18}
					className={[styles.chevron, open && styles.chevronOpen].filter(Boolean).join(' ')}
				/>
			</div>
			<div className={[styles.collapse, open && styles.collapseOpen].filter(Boolean).join(' ')}>
				<div className={styles.content}>{children}</div>
			</div>
		</div>
	);
}

Accordion.displayName = 'Accordion';
export default Accordion;
