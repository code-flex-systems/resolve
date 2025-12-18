'use client';
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
		wrapText?: boolean;
		compact?: boolean;
	} & PropsWithChildren
) {
	const { buttonProps, icon, tooltipProps, compact } = props;
	return (
		<TooltipWrapper tooltipProps={tooltipProps}>
			{icon ? (
				<BasicIconButton {...buttonProps} compact={compact}>{icon}</BasicIconButton>
			) : (
				<Button
					{...buttonProps}
					variant={buttonProps.variant ?? 'outlined'}
					sx={{
						minWidth: props.wrapText ? undefined : 'fit-content',
						whiteSpace: props.wrapText === true ? undefined : 'nowrap',
						...buttonProps.sx,
					}}
				>
					{props.children}
				</Button>
			)}
		</TooltipWrapper>
	);
}
