import { createTheme } from '@mui/material/styles';

export const BASE_COLOR = '#3f4a56';
export const BASE_COLOR_LIGHT = '#91979e';
export const BACKDROP_COLOR = '#ebedf1';
export const HOVERED_COLOR = '#cdced8';
export const OFFWHITE_COLOR = '#f7f7f7';
export const OUTLINE_COLOR = '#e0e0e0';

// Create a default theme
const theme = createTheme({
	components: {
		MuiButton: {
			defaultProps: {
				size: 'small',
			},
			styleOverrides: {
				root: {
					borderRadius: 0,
				},
			},
		},
		MuiIconButton: {
			defaultProps: {
				size: 'small',
			},
			styleOverrides: {
				root: {
					borderRadius: 0,
				},
			},
		},
		MuiLink: {
			styleOverrides: {
				root: {
					fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
					cursor: 'pointer',
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					borderRadius: 0,
				},
			},
		},
		MuiSkeleton: {
			defaultProps: {
				animation: 'wave',
				variant: 'rectangular',
			},
			styleOverrides: {
				root: {
					borderRadius: 0,
				},
			},
		},
		MuiSpeedDial: {
			styleOverrides: {
				root: {
					width: 30,
					height: 30,
				},
				fab: {
					width: 30,
					height: 30,
					minHeight: 30,
				},
			},
		},
		MuiSpeedDialIcon: {
			styleOverrides: {
				root: {
					width: 30,
					height: 30,
				},
			},
		},
		MuiSvgIcon: {
			styleOverrides: {
				root: {
					color: BASE_COLOR,
					fontSize: 19,
				},
			},
		},
		MuiTabs: {
			styleOverrides: {
				root: {
					minHeight: 35,
					height: 35,
				},
			},
		},
		MuiTab: {
			defaultProps: {
				iconPosition: 'start',
			},
			styleOverrides: {
				root: {
					minHeight: 35,
					height: 35,
					color: BASE_COLOR,
				},
				icon: {
					color: BASE_COLOR,
				},
			},
		},
		MuiTextField: {
			defaultProps: {
				variant: 'standard',
				slotProps: {
					inputLabel: {
						shrink: true,
					},
				},
			},
		},
		MuiToggleButtonGroup: {
			styleOverrides: {
				root: {
					borderRadius: 0,
				},
			},
		},
		MuiToggleButton: {
			styleOverrides: {
				root: {
					borderRadius: 0,
				},
			},
		},
		MuiTooltip: {
			styleOverrides: {
				tooltip: {
					fontSize: 15,
				},
			},
		},
	},
	palette: {
		mode: 'light',
		primary: {
			main: '#354A7A',
		},
		secondary: {
			main: '#5D82D8',
		},
	},
	typography: {
		fontWeightRegular: 300,
		fontWeightBold: 550,
		body1: {
			color: BASE_COLOR,
		},
	},
});

// Export the theme for use in your application
export default theme;
