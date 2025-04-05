import { JSX } from 'react';
import BasicButton from './BasicButton';

export default function HoverButton(props: { action: () => void; icon: JSX.Element; index: number; tooltip?: string }) {
	const { action, icon, index, tooltip } = props;
	return (
		<BasicButton
			buttonProps={{
				onClick: action,
				variant: 'contained',
				sx: {
					position: 'fixed',
					zIndex: 100,
					top: 10,
					right: index * 40 + 10,
					transition: `scale 100ms ease`,
					transitionDelay: `${(index + 1) * 40}ms`,
					borderRadius: 25,
					width: 30,
					height: 30,
				},
				className: 'hover-button',
			}}
			tooltipProps={tooltip ? { title: tooltip } : undefined}
			icon={icon}
		/>
	);
}
