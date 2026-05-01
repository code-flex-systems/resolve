import css from './StackedRow.module.css';

export function StackedRow({
	primary,
	secondary,
	fontSize = 15,
}: {
	primary: any;
	secondary: any;
	fontSize?: number;
}) {
	return (
		<div className={css.container}>
			<span className={css.primary} style={{ fontSize }}>
				{primary}
			</span>
			<span className={css.secondary} style={{ fontSize: fontSize - 2 }}>
				{secondary}
			</span>
		</div>
	);
}
