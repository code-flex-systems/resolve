import PageWrapper from '@/components/common/PageWrapper';
import { PropsWithChildren } from 'react';

export default function HomeLayout(props: PropsWithChildren) {
	return <PageWrapper>{props.children}</PageWrapper>;
}
