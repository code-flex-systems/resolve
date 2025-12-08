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
						bgcolor: 'white',
						outline: '1px solid var(--color-border)',
						border: 'none',
						borderRadius: '8px',
						boxShadow: 'none',
						fontFamily: 'Inter',
						fontWeight: 500,
						minWidth: props.wrapText ? undefined : 'fit-content',
						whiteSpace: props.wrapText === true ? undefined : 'nowrap',
						'&:hover': {
							bgcolor: 'var(--color-bg-hover)',
							outline: '1px solid var(--color-border-hover)',
						},
						'&:disabled': {
							border: 'none',
							outline: '1px solid var(--color-border-light)',
							bgcolor: 'var(--color-bg-tertiary)',
							color: 'var(--color-text-muted)',
						},
						...buttonProps.sx,
						color: buttonProps.color ?? 'var(--color-text-primary)',
					}}
				>
					{props.children}
				</Button>
			)}
		</TooltipWrapper>
	);
}
