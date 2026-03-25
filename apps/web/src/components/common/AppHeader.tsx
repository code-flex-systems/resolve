'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconChevronRight } from '@tabler/icons-react';
import { useBreadcrumbs } from './BreadcrumbContext';
import ProfileAvatar from '../home/ProfileAvatar';
import CommandPalette from './CommandPalette';
import styles from './AppHeader.module.css';

export default function AppHeader() {
	const { segments } = useBreadcrumbs();
	const router = useRouter();

	// Show back button when we're deeper than 2 segments (e.g., Admin / Claims / CLM-001)
	const showBack = segments.length > 2;

	return (
		<header className={styles.header}>
			<nav className={styles.breadcrumbs}>
				{segments.map((segment, index) => {
					const isLast = index === segments.length - 1;
					const isFirst = index === 0;

					return (
						<span key={`${segment.label}-${index}`} className={styles.breadcrumbItem}>
							{index > 0 && (
								<IconChevronRight size={14} stroke={1.5} className={styles.separator} />
							)}
							{isLast ? (
								<span className={styles.currentPage}>{segment.label}</span>
							) : segment.href ? (
								<Link href={segment.href} className={styles.breadcrumbLink}>
									{segment.label}
								</Link>
							) : segment.onClick ? (
								<button
									onClick={segment.onClick}
									className={styles.breadcrumbLink}
									style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
								>
									{segment.label}
								</button>
							) : (
								<span className={styles.breadcrumbText}>{segment.label}</span>
							)}
						</span>
					);
				})}
			</nav>

			<div className={styles.actions}>
				<CommandPalette />
				<ProfileAvatar />
			</div>
		</header>
	);
}
