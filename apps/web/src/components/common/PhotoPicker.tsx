'use client';
import CameraAlt from '@mui/icons-material/CameraAlt';
import { Box, Collapse } from '@mui/material';
import { useRef, useState } from 'react';

export default function PhotoPicker(props: {
	image?: string;
	updateImage: (newImage?: string) => void;
	width: number | string;
	height: number | string;
	disabled?: boolean;
}) {
	const { image, updateImage, width, height, disabled } = props;
	const ref = useRef<HTMLInputElement | null>(null);
	const [hovered, setHovered] = useState(false);

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const imgUrl = URL.createObjectURL(file);
			updateImage(imgUrl);
		}
	};

	return (
		<>
			<Box
				onMouseEnter={disabled ? undefined : () => setHovered(true)}
				onMouseLeave={disabled ? undefined : () => setHovered(false)}
				onClick={
					disabled
						? undefined
						: () => {
								if (ref.current) ref.current.click();
						  }
				}
				sx={{
					width,
					height,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					bgcolor: hovered ? 'var(--color-bg-hover)' : 'var(--color-bg-tertiary)',
					transition: 'background-color 300ms ease',
					cursor: disabled ? undefined : 'pointer',
					mb: 1,
				}}
			>
				{image ? <img width={width} height={height} src={image} /> : <CameraAlt sx={{ fontSize: 50 }} />}
			</Box>
			<Collapse in={!disabled}>
				<input ref={ref} type="file" accept="image/*" src={image} onChange={onChange} />
			</Collapse>
		</>
	);
}
