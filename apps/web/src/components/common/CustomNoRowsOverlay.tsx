import { JSX } from 'react';
import css from './CustomNoRowsOverlay.module.css';

export default function CustomNoRowsOverlay({ text, icon }: { text: string; icon: JSX.Element }) {
	return (
		<div className={css.container}>
			<div className={css.inner}>
				{icon}
				<span className={css.text}>{text}</span>
			</div>
		</div>
	);
}
