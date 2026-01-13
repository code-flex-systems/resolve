import { PropsWithChildren } from 'react';
import ClientPartiesShell from '@/components/admin/ClientPartiesShell';

export default function PartiesLayout(props: PropsWithChildren) {
	return <ClientPartiesShell>{props.children}</ClientPartiesShell>;
}
