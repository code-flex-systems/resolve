import CardioLoadingIndicator from '@/components/common/CardioLoadingIndicator';

export default function LoadingPage() {
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			<CardioLoadingIndicator message="Loading..." />
		</div>
	);
}
