export default function CheckGradient(props: React.SVGProps<SVGSVGElement>) {
	const pathD = `
    M13,2.03V2.05L13,4.05
    C17.39,4.59 20.5,8.58 19.96,12.97
    C19.5,16.61 16.64,19.5 13,19.93
    V21.93
    C18.5,21.38 22.5,16.5 21.95,11
    C21.5,6.25 17.73,2.5 13,2.03
    M11,2.06C9.05,2.25 7.19,3 5.67,4.26
    L7.1,5.74C8.22,4.84 9.57,4.26 11,4.06V2.06
    M4.26,5.67C3,7.19 2.25,9.04 2.05,11
    H4.05C4.24,9.58 4.8,8.23 5.69,7.1L4.26,5.67
    M15.5,8.5L10.62,13.38L8.5,11.26
    L7.44,12.32L10.62,15.5L16.56,9.56L15.5,8.5
    M2.06,13C2.26,14.96 3.03,16.81 4.27,18.33
    L5.69,16.9C4.81,15.77 4.24,14.42 4.06,13H2.06
    M7.1,18.37L5.67,19.74
    C7.18,21 9.04,21.79 11,22V20
    C9.58,19.82 8.23,19.25 7.1,18.37Z
  `;

	return (
		<svg {...props} viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style={{ fontSize: 'inherit', ...props.style }}>
			<defs>
				<clipPath id="halfLeft">
					<rect x="0" y="0" width="12" height="24" />
				</clipPath>
				<clipPath id="halfRight">
					<rect x="12" y="0" width="12" height="24" />
				</clipPath>
			</defs>

			{/* Left half in red */}
			<path clipPath="url(#halfLeft)" fill="var(--color-error)" d={pathD} />

			{/* Right half in green */}
			<path clipPath="url(#halfRight)" fill="var(--color-success)" d={pathD} />
		</svg>
	);
}
