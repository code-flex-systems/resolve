'use client';
import { useRef, useEffect, type PropsWithChildren } from 'react';

export default function BasicPopper(
	props: {
		anchorEl: HTMLElement | null;
		setAnchorEl: (newEl: HTMLElement | null) => void;
		placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end' | 'left' | 'right';
		className?: string;
		zIndex?: number;
	} & PropsWithChildren
) {
	const { anchorEl, setAnchorEl, placement = 'bottom', className, zIndex = 1000 } = props;
	const popperRef = useRef<HTMLDivElement>(null);

	// Click-away listener
	useEffect(() => {
		if (!anchorEl) return;
		const handler = (e: MouseEvent) => {
			if (
				popperRef.current &&
				!popperRef.current.contains(e.target as Node) &&
				anchorEl &&
				!anchorEl.contains(e.target as Node)
			) {
				setAnchorEl(null);
			}
		};
		document.addEventListener('mouseup', handler);
		return () => document.removeEventListener('mouseup', handler);
	}, [anchorEl, setAnchorEl]);

	if (!anchorEl) return null;

	const rect = anchorEl.getBoundingClientRect();
	const style: React.CSSProperties = {
		position: 'fixed',
		zIndex,
		opacity: 1,
		transition: 'opacity 350ms ease',
	};

	switch (placement) {
		case 'bottom':
			style.top = rect.bottom;
			style.left = rect.left + rect.width / 2;
			style.transform = 'translateX(-50%)';
			break;
		case 'bottom-start':
			style.top = rect.bottom;
			style.left = rect.left;
			break;
		case 'bottom-end':
			style.top = rect.bottom;
			style.right = window.innerWidth - rect.right;
			break;
		case 'top':
			style.bottom = window.innerHeight - rect.top;
			style.left = rect.left + rect.width / 2;
			style.transform = 'translateX(-50%)';
			break;
		case 'top-start':
			style.bottom = window.innerHeight - rect.top;
			style.left = rect.left;
			break;
		case 'top-end':
			style.bottom = window.innerHeight - rect.top;
			style.right = window.innerWidth - rect.right;
			break;
		case 'left':
			style.top = rect.top + rect.height / 2;
			style.right = window.innerWidth - rect.left;
			style.transform = 'translateY(-50%)';
			break;
		case 'right':
			style.top = rect.top + rect.height / 2;
			style.left = rect.right;
			style.transform = 'translateY(-50%)';
			break;
	}

	return (
		<div ref={popperRef} style={style} className={className}>
			{props.children}
		</div>
	);
}
