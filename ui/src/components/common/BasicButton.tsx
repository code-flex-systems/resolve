import { Button, ButtonProps, Tooltip, TooltipProps } from '@mui/material';
import { JSX, PropsWithChildren } from 'react';

export default function BasicButton(
	props: {
		buttonProps: ButtonProps;
		icon?: JSX.Element;
		tooltipProps?: {
			title: string;
			placement?: TooltipProps['placement'];
			arrow?: boolean;
		};
	} & PropsWithChildren
) {
	const { buttonProps, icon, tooltipProps } = props;
	return tooltipProps ? (
		<Tooltip {...tooltipProps} enterDelay={500}>
			<span>
				<Button {...buttonProps} color={buttonProps.color ?? 'primary'} style={styles.button(!!icon)}>
					{icon ?? props.children}
				</Button>
			</span>
		</Tooltip>
	) : (
		<Button {...buttonProps} color={buttonProps.color ?? 'primary'} style={styles.button(!!icon)}>
			{icon ?? props.children}
		</Button>
	);
}

const styles = {
	button: (icon: boolean) => ({
		minWidth: icon ? 25 : undefined,
		padding: icon ? 3 : undefined,
	}),
};
