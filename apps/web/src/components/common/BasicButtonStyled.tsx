'use client';

import Button, { type ButtonProps as UiButtonProps } from '@/components/ui/Button';
import { Tooltip, TooltipProps } from '@mui/material';
import { JSX, PropsWithChildren } from 'react';
import BasicIconButton from './BasicIconButton';
import css from './BasicButtonStyled.module.css';

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

/** Map MUI variant to our custom Button variant */
function mapVariant(variant: string | undefined): UiButtonProps['variant'] {
	switch (variant) {
		case 'contained':
			return 'contained';
		case 'text':
			return 'text';
		case 'outlined':
		default:
			return 'outlined';
	}
}

export interface BasicButtonStyledButtonProps {
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	variant?: string;
	color?: string;
	disabled?: boolean;
	startIcon?: JSX.Element;
	endIcon?: JSX.Element;
	size?: 'small' | 'medium' | 'large';
	sx?: unknown;
	className?: string;
	type?: 'button' | 'submit' | 'reset';
	[key: string]: unknown;
}

export default function BasicButtonStyled(
	props: {
		buttonProps: BasicButtonStyledButtonProps;
		icon?: JSX.Element;
		tooltipProps?: BasicTooltipProps;
		wrapText?: boolean;
		compact?: boolean;
	} & PropsWithChildren
) {
	const { buttonProps, icon, tooltipProps, compact } = props;
	const {
		onClick,
		variant,
		disabled,
		startIcon,
		endIcon,
		size: _size,
		sx: _sx,
		className,
		type,
		...rest
	} = buttonProps;

	return (
		<TooltipWrapper tooltipProps={tooltipProps}>
			{icon ? (
				<BasicIconButton onClick={onClick} disabled={disabled} compact={compact} className={className}>
					{icon}
				</BasicIconButton>
			) : (
				<Button
					onClick={onClick}
					variant={mapVariant(variant)}
					disabled={disabled}
					startIcon={startIcon}
					endIcon={endIcon}
					className={[props.wrapText ? css.wrapText : css.textButton, className].filter(Boolean).join(' ')}
					type={type}
					{...(rest as Record<string, unknown>)}
				>
					{props.children}
				</Button>
			)}
		</TooltipWrapper>
	);
}
