'use client';
import { ClickAwayListener, Fade, Popper, PopperProps } from '@mui/material';
import { PropsWithChildren } from 'react';

export default function BasicPopper(
	props: {
		anchorEl: PopperProps['anchorEl'];
		setAnchorEl: (newEl: PopperProps['anchorEl']) => void;
		placement?: PopperProps['placement'];
		className?: string;
	} & PropsWithChildren
) {
	const { anchorEl, setAnchorEl, placement, className } = props;
	return (
		<ClickAwayListener onClickAway={() => setAnchorEl(null)}>
			<Popper
				open={!!anchorEl}
				anchorEl={anchorEl}
				placement={placement}
				className={className}
				style={{ zIndex: 10000 }}
				transition
			>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<span>{props.children}</span>
					</Fade>
				)}
			</Popper>
		</ClickAwayListener>
	);
}
