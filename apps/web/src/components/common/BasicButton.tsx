'use client';

import Button, { type ButtonProps as UiButtonProps } from '@/components/ui/Button';
import { Tooltip, TooltipProps } from '@mui/material';
import { JSX, PropsWithChildren, forwardRef } from 'react';
import css from './BasicButton.module.css';

/** Map MUI color names to our custom Button color names */
function mapColor(
	color: string | undefined
): UiButtonProps['color'] {
	switch (color) {
		case 'success':
			return 'success';
		case 'error':
			return 'error';
		case 'warning':
			return 'warning';
		case 'secondary':
			return 'success'; // MUI secondary = green in this theme
		default:
			return 'primary';
	}
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

/**
 * Compat layer: accepts the same `buttonProps` bag that 50+ consumers pass
 * (onClick, variant, color, disabled, startIcon, sx, size, etc.)
 * and renders through our custom <Button>.
 */
export interface BasicButtonButtonProps {
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

const BasicButton = forwardRef<
	HTMLButtonElement,
	{
		buttonProps: BasicButtonButtonProps;
		icon?: JSX.Element;
		tooltipProps?: {
			title: string;
			placement?: TooltipProps['placement'];
			arrow?: boolean;
		};
	} & PropsWithChildren
>(function BasicButton(props, ref) {
	const { buttonProps, icon, tooltipProps } = props;
	const {
		onClick,
		variant,
		color,
		disabled,
		startIcon,
		endIcon,
		size: _size,
		sx: _sx,
		className,
		type,
		...rest
	} = buttonProps;

	const btn = (
		<Button
			ref={ref}
			onClick={onClick}
			variant={icon ? 'icon' : mapVariant(variant)}
			color={mapColor(color)}
			disabled={disabled}
			startIcon={!icon ? startIcon : undefined}
			endIcon={!icon ? endIcon : undefined}
			className={[icon ? css.iconButton : css.button, className].filter(Boolean).join(' ')}
			type={type}
			{...(rest as Record<string, unknown>)}
		>
			{icon ?? props.children}
		</Button>
	);

	if (tooltipProps) {
		return (
			<Tooltip {...tooltipProps} enterDelay={500}>
				<span>{btn}</span>
			</Tooltip>
		);
	}
	return btn;
});

BasicButton.displayName = 'BasicButton';
export default BasicButton;
