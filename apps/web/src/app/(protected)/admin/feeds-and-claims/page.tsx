'use client';

import FeedsAndClaimsTab from '@/components/admin/FeedsAndClaimsTab';
import AdminTabs from '@/components/pages/AdminTabs';

export default function AdminPageFeedsAndClaimsTab() {
	return (
		<>
			<AdminTabs />
			<FeedsAndClaimsTab />
		</>
	);
}
