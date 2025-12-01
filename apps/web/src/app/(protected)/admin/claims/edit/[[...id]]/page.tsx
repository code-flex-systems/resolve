import ClaimChanges from '@/components/admin/ClaimChanges';

interface PageProps {
	params: Promise<{
		id?: string[];
	}>;
}

export default async function ClaimChangesPage({ params }: PageProps) {
	const resolvedParams = await params;
	const claimId = resolvedParams.id?.[0] ? parseInt(resolvedParams.id[0], 10) : undefined;

	return <ClaimChanges claimId={claimId} />;
}
