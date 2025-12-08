'use client';
import { Box, ClickAwayListener, Fade, Popper, PopperProps } from '@mui/material';
import { PropsWithChildren } from 'react';

export default function BasicPopper(
	props: {
		anchorEl: PopperProps['anchorEl'];
		setAnchorEl: (newEl: PopperProps['anchorEl']) => void;
		placement?: PopperProps['placement'];
		className?: string;
		zIndex?: number;
	} & PropsWithChildren
) {
	const { anchorEl, setAnchorEl, placement, className, zIndex = 1000 } = props;
	return (
		<ClickAwayListener onClickAway={() => setAnchorEl(null)} mouseEvent="onMouseUp">
			<Popper
				open={!!anchorEl}
				anchorEl={anchorEl}
				placement={placement}
				className={className}
				sx={{ zIndex }}
				transition
			>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<Box sx={{ borderRadius: '12px', overflow: 'hidden' }}>{props.children}</Box>
					</Fade>
				)}
			</Popper>
		</ClickAwayListener>
	);
}
