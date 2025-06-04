'use client';

import UsersTab from '@/components/admin/UsersTab';
import AdminTabs from '@/components/pages/AdminTabs';

export default function AdminPageUsersTab() {
	return (
		<>
			<AdminTabs />
			<UsersTab />
		</>
	);
}
