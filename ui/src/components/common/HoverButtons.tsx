import { JSX } from 'react';
import HoverButton from './HoverButton';

export default function HoverButtons(props: {
	buttons: {
		action: () => void;
		icon: JSX.Element;
		tooltip?: string;
	}[];
}) {
	const { buttons } = props;
	return (
		<div style={styles.container}>
			{buttons.map((b, i) => (
				<HoverButton key={i} action={b.action} icon={b.icon} index={i} tooltip={b.tooltip} />
			))}
		</div>
	);
}

const styles = {
	container: {
		position: 'relative' as const,
	},
};
