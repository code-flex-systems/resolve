import PageWrapper from '@/components/common/PageWrapper';
import { PropsWithChildren } from 'react';

export default function ChecklistLayout(props: PropsWithChildren) {
	return <PageWrapper bgcolor="var(--bg-white)">{props.children}</PageWrapper>;
}
