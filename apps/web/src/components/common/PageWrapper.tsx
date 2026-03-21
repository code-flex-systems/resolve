'use client';

import { PropsWithChildren, useMemo } from 'react';
import Sidebar, { NavItem } from './Sidebar';
import {
	IconFileSearch,
	IconLayoutDashboard,
	IconSearch,
	IconShield,
	IconFolder,
	IconBuilding,
} from '@tabler/icons-react';
import ClaimsStackIcon from './ClaimsStackIcon';
import useIsAdmin from '@/hooks/useIsAdmin';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import AppHeader from './AppHeader';
import css from './PageWrapper.module.css';

export default function PageWrapper({ bgcolor, children }: { bgcolor?: string } & PropsWithChildren) {
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { data: claim } = useClaimTrpc().get(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);

	const navItems = useMemo(() => {
		const items: NavItem[] = [
			{ label: 'Home', route: '/home', icon: <IconSearch size={23} /> },
			{ label: 'Dashboard', route: '/dashboard', icon: <IconLayoutDashboard size={23} /> },
			{ label: 'My Claims', route: '/my-claims', icon: <ClaimsStackIcon /> },
			{ label: 'Documents', route: '/documents', icon: <IconFolder size={23} /> },
			{ label: 'Parties', route: '/parties', icon: <IconBuilding size={23} /> },
		];
		if (claim) {
			items.push({
				label: claim.claim_number ?? '',
				route: '/checklist',
				icon: <IconFileSearch size={23} />,
			});
		}
		if (isAdmin || isSuperAdmin) {
			items.push({ label: 'Admin', route: '/admin', icon: <IconShield size={23} /> });
		}
		return items;
	}, [isAdmin, isSuperAdmin, claim]);

	return (
		<div
			className={css.wrapper}
			style={bgcolor ? { backgroundColor: bgcolor } : undefined}
		>
			<Sidebar items={navItems} />
			<div className={css.main}>
				<AppHeader />
				<div className={css.content}>
					{children}
				</div>
			</div>
		</div>
	);
}
