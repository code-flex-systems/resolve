'use client';
import CameraAlt from '@mui/icons-material/CameraAlt';
import { Collapse } from '@mui/material';
import { useRef, useState } from 'react';
import { BACKDROP_COLOR, HOVERED_COLOR } from '@/styles/theme';

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
		let file = e.target.files?.[0];
		if (file) {
			let imgUrl = URL.createObjectURL(file);
			updateImage(imgUrl);
		}
	};

	return (
		<>
			<div
				onMouseEnter={disabled ? undefined : () => setHovered(true)}
				onMouseLeave={disabled ? undefined : () => setHovered(false)}
				onClick={
					disabled
						? undefined
						: () => {
								if (ref.current) ref.current.click();
						  }
				}
				style={{ ...styles.container(hovered, disabled), width, height }}
			>
				{image ? <img width={width} height={height} src={image} /> : <CameraAlt sx={styles.icon} />}
			</div>
			<Collapse in={!disabled}>
				<input ref={ref} type="file" accept="image/*" src={image} onChange={onChange} />
			</Collapse>
		</>
	);
}

const styles = {
	container: (hovered: boolean, disabled?: boolean) => ({
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: hovered ? HOVERED_COLOR : BACKDROP_COLOR,
		transition: 'background-color 300ms ease',
		cursor: disabled ? undefined : 'pointer',
		marginBottom: 10,
	}),
	icon: {
		fontSize: 50,
	},
};
