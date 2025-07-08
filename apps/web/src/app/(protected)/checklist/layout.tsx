import PageWrapper from '@/components/common/PageWrapper';
import { PropsWithChildren } from 'react';

export default function ChecklistLayout(props: PropsWithChildren) {
	return <PageWrapper route="checklist">{props.children}</PageWrapper>;
}
