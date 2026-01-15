import { PropsWithChildren } from 'react';
import { redirect } from 'next/navigation';
import ClientAdminShell from '@/components/admin/ClientAdminShell';
import { getProtectedSession } from '../get-session';

export default async function AdminLayout(props: PropsWithChildren) {
	const { isAdmin, isSuperAdmin } = await getProtectedSession();

	if (!isAdmin && !isSuperAdmin) {
		redirect('/home');
	}

	return <ClientAdminShell>{props.children}</ClientAdminShell>;
}
