'use client';
import { IconButton } from '@mui/material';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import { JSX, useState } from 'react';
import PageDot from './PageDot';

export interface SlideshowProps {
	slides: {
		order: number;
		title?: string;
		content: JSX.Element;
		revisitable?: boolean;
	}[];
	width?: number | string;
	height?: number | string;
	showNavigation?: boolean;
}

export default function Slideshow(props: SlideshowProps) {
	const { slides, width = 500, height = 500, showNavigation } = props;
	const [page, setPage] = useState(0);
	let leftDisabled = page === 0 || !slides[page - 1].revisitable;
	let rightDisabled = page === slides.length - 1;

	const getPages = () => {
		let pages: JSX.Element[] = [];
		for (let i = 0; i < slides.length; i++) {
			pages.push(
				<PageDot
					key={i}
					id={i}
					onClick={() => setPage(i)}
					filled={page === i}
					disabled={page > i && slides[i].revisitable === false}
				/>
			);
		}
		return pages;
	};

	if (!slides.length) return <></>;

	return (
		<div style={{ ...styles.container, width, height }}>
			{showNavigation && (
				<IconButton
					onClick={() => setPage((prev) => prev - 1)}
					disabled={leftDisabled}
					style={styles.navButton(leftDisabled)}
				>
					<KeyboardArrowLeft />
				</IconButton>
			)}

			<div style={{ ...styles.containerInner, width, height }}>
				<div key={slides[page].order} style={styles.slideshow}>
					{slides[page].content}
				</div>
				{slides.length > 1 && <div style={styles.paging}>{getPages()}</div>}
			</div>

			{showNavigation && (
				<IconButton
					onClick={() => setPage((prev) => prev + 1)}
					disabled={rightDisabled}
					style={styles.navButton(rightDisabled)}
				>
					<KeyboardArrowRight />
				</IconButton>
			)}
		</div>
	);
}

const styles = {
	container: {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
	},
	containerInner: {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'column' as const,
	},
	navButton: (disabled: boolean) => ({
		width: 20,
		height: 50,
		outline: disabled ? '1px solid #bdbdbd' : '1px solid #757575',
		margin: 10,
		borderRadius: 10,
	}),
	paging: {
		width: '100%',
		height: 30,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
	},
	slideshow: {
		width: '100%',
		height: '100%',
		outline: '1px solid #e8e8f3',
		padding: 5,
	},
};
