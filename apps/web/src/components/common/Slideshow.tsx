'use client';
import { Box, IconButton } from '@mui/material';
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
	const leftDisabled = page === 0 || !slides[page - 1].revisitable;
	const rightDisabled = page === slides.length - 1;

	const getPages = () => {
		const pages: JSX.Element[] = [];
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
		<Box sx={{ width, height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
			{showNavigation && (
				<IconButton
					onClick={() => setPage((prev) => prev - 1)}
					disabled={leftDisabled}
					sx={{
						width: 20,
						height: 50,
						outline: leftDisabled ? '1px solid var(--color-neutral-300)' : '1px solid var(--color-neutral-500)',
						m: 1,
						borderRadius: '10px',
					}}
				>
					<KeyboardArrowLeft />
				</IconButton>
			)}

			<Box
				sx={{
					width,
					height,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					flexDirection: 'column',
				}}
			>
				<Box
					key={slides[page].order}
					sx={{
						width: '100%',
						height: '100%',
						outline: '1px solid var(--color-bg-tertiary)',
						p: 0.5,
					}}
				>
					{slides[page].content}
				</Box>
				{slides.length > 1 && (
					<Box sx={{ width: '100%', height: 30, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
						{getPages()}
					</Box>
				)}
			</Box>

			{showNavigation && (
				<IconButton
					onClick={() => setPage((prev) => prev + 1)}
					disabled={rightDisabled}
					sx={{
						width: 20,
						height: 50,
						outline: rightDisabled ? '1px solid var(--color-neutral-300)' : '1px solid var(--color-neutral-500)',
						m: 1,
						borderRadius: '10px',
					}}
				>
					<KeyboardArrowRight />
				</IconButton>
			)}
		</Box>
	);
}
