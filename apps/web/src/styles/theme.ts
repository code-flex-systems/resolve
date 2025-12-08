import { createTheme } from '@mui/material/styles';
import '@fontsource/inter/300.css'; // Light (regular weight)
import '@fontsource/inter/400.css'; // Normal
import '@fontsource/inter/500.css'; // Medium
import '@fontsource/inter/600.css'; // Semi-bold
import '@fontsource/inter/700.css'; // Bold
import { buttonClasses } from '@mui/material';

// Clerk-inspired neutral palette
export const BASE_COLOR = '#41414a';
export const BASE_COLOR_LIGHT = '#9394a1';
export const BACKDROP_COLOR = '#f7f7f9';
export const HOVERED_COLOR = '#dfe0e4';
export const OFFWHITE_COLOR = '#fafafb';
export const OUTLINE_COLOR = '#e8e8ec';
export const ORANGE = '#F27013';
export const PURPLE = '#CA8EFF';

// Additional Clerk-inspired colors
export const TEXT_PRIMARY = '#131316';
export const TEXT_SECONDARY = '#5e5e6e';
export const TEXT_MUTED = '#747686';
export const BORDER_COLOR = '#e8e8ec';
export const BORDER_LIGHT = '#f0f0f3';
export const BG_TERTIARY = '#f7f7f9';
export const BG_SECONDARY = '#fafafb';

// Create a default theme
const theme = createTheme({
	components: {
		MuiButton: {
			defaultProps: {
				size: 'small',
				disableElevation: true,
			},
			styleOverrides: {
				root: {
					textTransform: 'none',
					borderRadius: 8,
					boxShadow: 'none',
					fontFamily: 'Inter',
					fontWeight: 500,
					fontSize: 12,
					[buttonClasses.startIcon]: {
						fontSize: '0.5rem',
					},
					[buttonClasses.endIcon]: {
						fontSize: '0.5rem',
					},
				},
				sizeSmall: {
					padding: '4px 10px',
					minHeight: 28,
					height: 28,
				},
				sizeMedium: {
					padding: '6px 14px',
					minHeight: 32,
					height: 32,
				},
				contained: {
					background: 'linear-gradient(180deg, #21B5FF 0%, #1a9fd9 100%)',
					color: '#ffffff',
					'& .MuiSvgIcon-root': {
						color: '#ffffff',
					},
					'&:hover': {
						background: 'linear-gradient(180deg, #1a9fd9 0%, #158abf 100%)',
					},
					'&.Mui-disabled': {
						background: BG_TERTIARY,
						color: TEXT_MUTED,
						'& .MuiSvgIcon-root': {
							color: TEXT_MUTED,
						},
					},
				},
				containedSecondary: {
					background: 'linear-gradient(180deg, #32AE99 0%, #2a9482 100%)',
					color: '#ffffff',
					'& .MuiSvgIcon-root': {
						color: '#ffffff',
					},
					'&:hover': {
						background: 'linear-gradient(180deg, #2a9482 0%, #238070 100%)',
					},
					'&.Mui-disabled': {
						background: BG_TERTIARY,
						color: TEXT_MUTED,
						'& .MuiSvgIcon-root': {
							color: TEXT_MUTED,
						},
					},
				},
				containedError: {
					background: 'linear-gradient(180deg, #ED1C24 0%, #d4191f 100%)',
					color: '#ffffff',
					'& .MuiSvgIcon-root': {
						color: '#ffffff',
					},
					'&:hover': {
						background: 'linear-gradient(180deg, #d4191f 0%, #bb161b 100%)',
					},
					'&.Mui-disabled': {
						background: BG_TERTIARY,
						color: TEXT_MUTED,
						'& .MuiSvgIcon-root': {
							color: TEXT_MUTED,
						},
					},
				},
				outlined: {
					'& .MuiSvgIcon-root': {
						color: 'inherit',
					},
					'&.Mui-disabled': {
						backgroundColor: BG_TERTIARY,
						borderColor: BORDER_LIGHT,
						color: TEXT_MUTED,
						'& .MuiSvgIcon-root': {
							color: TEXT_MUTED,
						},
					},
				},
				text: {
					'& .MuiSvgIcon-root': {
						color: 'inherit',
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					backgroundColor: '#ffffff',
					border: `1px solid ${BORDER_COLOR}`,
					'& .MuiChip-icon': {
						color: TEXT_SECONDARY,
					},
					'& .MuiChip-label': {
						color: TEXT_PRIMARY,
						fontSize: 12,
					},
					'&.Mui-disabled': {
						backgroundColor: BG_TERTIARY,
						borderColor: BORDER_LIGHT,
						opacity: 1,
						'& .MuiChip-icon': {
							color: TEXT_MUTED,
						},
						'& .MuiChip-label': {
							color: TEXT_MUTED,
						},
					},
				},
			},
		},
		MuiDataGrid: {
			styleOverrides: {
				root: {
					fontSize: 13,
					'& .MuiDataGrid-row': {
						transition: 'background-color 300ms ease',
						minHeight: '40px !important',
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
					'& .MuiDataGrid-cell': {
						padding: '8px 12px',
						display: 'flex',
						alignItems: 'center',
					},
					'& .MuiDataGrid-cell:focus': {
						outline: 'none',
					},
					'& .MuiDataGrid-cell:focus-within': {
						outline: 'none',
					},
					'& .MuiDataGrid-columnHeader': {
						fontSize: 12,
						fontWeight: 600,
					},
					'& .MuiDataGrid-columnHeader:focus': {
						outline: 'none',
					},
					'& .MuiDataGrid-columnHeader:focus-within': {
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
				root: {
					'&:hover': {
						backgroundColor: 'rgba(0, 0, 0, 0.04)',
					},
				},
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
					borderRadius: 12,
					border: `1px solid ${BORDER_COLOR}`,
					boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
				},
				elevation0: {
					boxShadow: 'none',
				},
				elevation1: {
					boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
				},
				elevation2: {
					boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				},
				elevation3: {
					boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
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
					color: TEXT_SECONDARY,
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
					color: TEXT_SECONDARY,
					'&.Mui-selected': {
						color: TEXT_PRIMARY,
					},
				},
				icon: {
					color: 'inherit',
				},
			},
		},
		MuiTextField: {
			defaultProps: {
				variant: 'outlined',
				size: 'small',
				slotProps: {
					inputLabel: {
						shrink: true,
					},
				},
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					fontSize: 13,
					'&:hover .MuiOutlinedInput-notchedOutline': {
						borderColor: HOVERED_COLOR,
					},
					'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
						borderColor: '#21B5FF',
						borderWidth: 1,
					},
					'&.Mui-disabled': {
						backgroundColor: BG_TERTIARY,
						'& .MuiOutlinedInput-notchedOutline': {
							borderColor: BORDER_LIGHT,
						},
					},
				},
				input: {
					padding: '8px 12px',
					'&.Mui-disabled': {
						color: TEXT_MUTED,
						WebkitTextFillColor: TEXT_MUTED,
					},
				},
				notchedOutline: {
					borderColor: BORDER_COLOR,
					'& legend': {
						paddingRight: 8,
					},
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					border: `1px solid ${BORDER_COLOR}`,
					boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
				},
			},
		},
		MuiInputLabel: {
			styleOverrides: {
				root: {
					fontSize: 14,
					fontWeight: 500,
					color: TEXT_SECONDARY,
				},
			},
		},
		MuiFormHelperText: {
			styleOverrides: {
				root: {
					fontSize: 11,
					marginTop: 4,
				},
			},
		},
		MuiDialog: {
			styleOverrides: {
				paper: {
					borderRadius: 16,
					border: `1px solid ${BORDER_COLOR}`,
					boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
				},
			},
		},
		MuiDialogTitle: {
			styleOverrides: {
				root: {
					padding: '16px',
					fontSize: 15,
					fontWeight: 600,
				},
			},
		},
		MuiDialogContent: {
			styleOverrides: {
				root: {
					padding: '16px',
				},
			},
		},
		MuiDialogActions: {
			styleOverrides: {
				root: {
					padding: '12px 16px',
					gap: 8,
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
			active: TEXT_PRIMARY,
			hover: 'rgba(0, 0, 0, 0.04)',
			hoverOpacity: 0.04,
			selected: 'rgba(33, 181, 255, 0.08)',
			selectedOpacity: 0.08,
			disabled: TEXT_MUTED,
			disabledOpacity: 0.38,
			disabledBackground: BG_TERTIARY,
			focus: 'rgba(33, 181, 255, 0.12)',
			focusOpacity: 0.12,
		},
		primary: {
			main: '#21B5FF',
			light: '#5fc9ff',
			dark: '#158abf',
			contrastText: '#fff',
		},
		secondary: {
			main: '#32AE99',
			light: '#5cc4b3',
			dark: '#238070',
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
		text: {
			primary: TEXT_PRIMARY,
			secondary: TEXT_SECONDARY,
			disabled: TEXT_MUTED,
		},
		background: {
			default: BG_TERTIARY,
			paper: '#ffffff',
		},
		divider: BORDER_COLOR,
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
		fontWeightRegular: 400,
		fontWeightMedium: 500,
		fontWeightBold: 600,
		body1: {
			color: TEXT_PRIMARY,
			fontSize: 13,
		},
		body2: {
			color: TEXT_SECONDARY,
			fontSize: 12,
		},
		h6: {
			color: TEXT_PRIMARY,
			fontSize: 15,
			fontWeight: 600,
		},
		subtitle1: {
			color: TEXT_PRIMARY,
			fontSize: 14,
			fontWeight: 500,
		},
		subtitle2: {
			color: TEXT_SECONDARY,
			fontSize: 13,
			fontWeight: 500,
		},
		caption: {
			fontSize: 11,
			color: TEXT_MUTED,
		},
	},
});

// Export the theme for use in your application
export default theme;
