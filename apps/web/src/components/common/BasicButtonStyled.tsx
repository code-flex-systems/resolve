'use client';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT } from '@/styles/theme';
import { Button, ButtonProps, Tooltip, TooltipProps } from '@mui/material';
import { JSX, PropsWithChildren } from 'react';
import BasicIconButton from './BasicIconButton';

interface BasicTooltipProps {
	title: string;
	placement?: TooltipProps['placement'];
	arrow?: boolean;
}

function TooltipWrapper({ children, tooltipProps }: { tooltipProps?: BasicTooltipProps } & PropsWithChildren) {
	return tooltipProps ? (
		<Tooltip {...tooltipProps} enterDelay={500}>
			<span>{children}</span>
		</Tooltip>
	) : (
		children
	);
}

export default function BasicButtonStyled(
	props: {
		buttonProps: ButtonProps;
		icon?: JSX.Element;
		tooltipProps?: BasicTooltipProps;
	} & PropsWithChildren
) {
	const { buttonProps, icon, tooltipProps } = props;
	return (
		<TooltipWrapper tooltipProps={tooltipProps}>
			{icon ? (
				<BasicIconButton {...buttonProps}>{icon}</BasicIconButton>
			) : (
				<Button
					{...buttonProps}
					variant={buttonProps.variant ?? 'outlined'}
					sx={{
						...styles.button,
						...buttonProps.sx,
						color: buttonProps.color ?? BASE_COLOR,
					}}
					style={{ minWidth: 'fit-content', textWrap: 'nowrap' }}
				>
					{props.children}
				</Button>
			)}
		</TooltipWrapper>
	);
}

const styles = {
	button: {
		bgcolor: 'white',
		outline: `1px solid ${BASE_COLOR_LIGHT}`,
		border: 'none',
		borderRadius: 2,
		boxShadow: 'none',
		fontFamily: 'Inter',
		'&:hover': {
			backgroundColor: theme.palette.action.hover,
		},
		'&:disabled': {
			border: 'none',
			backgroundColor: theme.palette.action.disabledBackground,
		},
	},
};
