import { createTheme } from '@mui/material/styles';
import '@fontsource/inter';
import { buttonClasses } from '@mui/material';

export const BASE_COLOR = '#353D49';
export const BASE_COLOR_LIGHT = '#CED4D8';
export const BACKDROP_COLOR = '#ebedf1';
export const HOVERED_COLOR = '#cdced8';
export const OFFWHITE_COLOR = '#f7f7f7';
export const OUTLINE_COLOR = '#e0e0e0';
export const ORANGE = '#F27013';
export const PURPLE = '#CA8EFF';

// Create a default theme
const theme = createTheme({
	components: {
		MuiButton: {
			defaultProps: {
				size: 'small',
			},
			styleOverrides: {
				root: {
					textTransform: 'none',
					borderRadius: 10,
					boxShadow: 'none',
					fontFamily: 'Inter',
					[buttonClasses.startIcon]: {
						fontSize: '0.5rem',
					},
					[buttonClasses.endIcon]: {
						fontSize: '0.5rem',
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					backgroundColor: 'white',
					border: '1px solid #d9d9d9',
					'& .MuiChip-icon': {
						color: BASE_COLOR,
					},
					'& .MuiChip-label': {
						color: BASE_COLOR,
					},
				},
			},
		},
		MuiDataGrid: {
			styleOverrides: {
				root: {
					'& .MuiDataGrid-row': {
						transition: 'background-color 300ms ease',
					},
					'& .MuiDataGrid-row:hover': {
						backgroundColor: 'rgba(34, 180, 255, 0.05)',
					},
					'& .MuiDataGrid-row.Mui-selected': {
						transition: 'background-color 300ms ease',
						backgroundColor: 'rgba(34, 180, 255, 0.1)',
					},
					'& .MuiDataGrid-row.Mui-selected:hover': {
						backgroundColor: 'rgba(34, 180, 255, 0.2)',
					},
					'& .MuiDataGrid-cell:focus': {
						outline: 'none',
					},
					'& .MuiDataGrid-cell:focus-within': {
						outline: 'none',
					},
					'& .MuiDataGrid-columHeader:focus': {
						outline: 'none',
					},
					'& .MuiDataGrid-columHeader:focus-within': {
						outline: 'none',
					},
				},
			},
		},
		MuiIconButton: {
			defaultProps: {
				size: 'small',
			},
			styleOverrides: {
				root: {},
			},
		},
		MuiLink: {
			styleOverrides: {
				root: {
					fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
					cursor: 'pointer',
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					// borderRadius: 0,
				},
			},
		},
		MuiSelect: {
			defaultProps: {
				MenuProps: {
					PaperProps: {
						sx: {
							maxHeight: 300,
							maxWidth: 600,
						},
					},
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
					// borderRadius: 0,
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
					// color: BASE_COLOR,
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
					// borderRadius: 0,
				},
			},
		},
		MuiToggleButton: {
			styleOverrides: {
				root: {
					// borderRadius: 0,
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
		action: {
			active: BASE_COLOR,
			//   hover: string;
			//   hoverOpacity: number;
			//   selected: string;
			//   selectedOpacity: number;
			disabled: BASE_COLOR_LIGHT,
			//   disabledOpacity: number;
			disabledBackground: '#F0F3F7',
			//   focus: string;
			//   focusOpacity: number;
			//   activatedOpacity: number;
		},
		primary: {
			main: '#21B5FF',
			contrastText: '#fff',
		},
		secondary: {
			main: '#32AE99',
			dark: BASE_COLOR,
			contrastText: '#fff',
		},
		success: {
			main: '#1BB934',
			contrastText: '#fff',
		},
		error: {
			main: '#ED1C24',
			contrastText: '#fff',
		},
		warning: {
			main: '#F5BF48',
			contrastText: '#fff',
		},
		divider: BASE_COLOR_LIGHT,
	},
	typography: {
		fontFamily: [
			'Inter',
			'-apple-system',
			'BlinkMacSystemFont',
			'"Segoe UI"',
			'Roboto',
			'"Helvetica Neue"',
			'Arial',
			'sans-serif',
		].join(','),
		fontWeightRegular: 300,
		fontWeightBold: 550,
		body1: {
			color: BASE_COLOR,
		},
	},
});

// Export the theme for use in your application
export default theme;
