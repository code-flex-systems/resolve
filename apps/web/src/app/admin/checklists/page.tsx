'use client';

import ChecklistsTab from '@/components/admin/ChecklistsTab';
import AdminTabs from '@/components/pages/AdminTabs';

export default function AdminPageChecklistsTab() {
	return (
		<>
			<AdminTabs />
			<ChecklistsTab />
		</>
	);
}
