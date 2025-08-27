import { createTheme } from '@mui/material/styles';
import '@fontsource/inter';
import { buttonClasses } from '@mui/material';

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
					'& .MuiDataGrid-row:hover': {
						backgroundColor: 'rgba(90,126,209,0.2)',
					},
					'& .MuiDataGrid-row.Mui-selected': {
						backgroundColor: 'rgba(90,126,209,0.4)',
					},
					'& .MuiDataGrid-row.Mui-selected:hover': {
						backgroundColor: 'rgba(90,126,209,0.5)',
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
			//   disabledBackground: string;
			//   focus: string;
			//   focusOpacity: number;
			//   activatedOpacity: number;
		},
		primary: {
			main: '#216BC4',
		},
		secondary: {
			main: '#1A549A',
			dark: BASE_COLOR,
		},
		warning: {
			main: '#FCB237',
			contrastText: '#fff',
		},
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
