import { createTheme } from '@mui/material/styles';
import '@fontsource/inter/300.css'; // Light (regular weight)
import '@fontsource/inter/400.css'; // Normal
import '@fontsource/inter/500.css'; // Medium
import '@fontsource/inter/600.css'; // Semi-bold
import '@fontsource/inter/700.css'; // Bold
import { buttonClasses } from '@mui/material';

// Modern neutral palette
export const BASE_COLOR = '#41414a';
export const BASE_COLOR_LIGHT = '#9394a1';
export const BACKDROP_COLOR = '#f8fafc';
export const HOVERED_COLOR = '#e2e8f0';
export const OFFWHITE_COLOR = '#fafafc';
export const OUTLINE_COLOR = '#e2e8f0';
export const ORANGE = '#F27013';
export const PURPLE = '#CA8EFF';

// Modern text colors
export const TEXT_PRIMARY = '#0f172a';
export const TEXT_SECONDARY = '#64748b';
export const TEXT_MUTED = '#94a3b8';
export const BORDER_COLOR = '#cbd5e1';
export const BORDER_LIGHT = '#e2e8f0';
export const BG_TERTIARY = '#f8fafc';
export const BG_SECONDARY = '#fafafc';

// Modern shadow system
const SHADOW_XS = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
const SHADOW_SM = '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)';
const SHADOW_MD = '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)';
const SHADOW_LG = '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)';
const SHADOW_XL = '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)';

// Container styles - gradient header and beveled cards
export const containerStyles = {
	// Primary/header container with gradient
	gradientCard: {
		background: 'linear-gradient(135deg, rgba(33, 181, 255, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
		border: `1px solid ${BORDER_LIGHT}`,
		borderRadius: '12px',
		padding: '20px',
	},
	// Standard card with subtle bevel effect
	beveledCard: {
		backgroundColor: '#ffffff',
		border: `1px solid ${BORDER_LIGHT}`,
		borderRadius: '12px',
		boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
	},
	// Section container (like in forms) with header
	section: {
		backgroundColor: '#ffffff',
		border: `1px solid ${BORDER_LIGHT}`,
		borderRadius: '12px',
		overflow: 'hidden',
		boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: 600,
		color: TEXT_PRIMARY,
		px: 2,
		py: 1.5,
		bgcolor: BG_TERTIARY,
		borderBottom: `1px solid ${BORDER_LIGHT}`,
	},
	sectionContent: {
		p: 2,
		bgcolor: '#ffffff',
	},
};

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
					borderRadius: 10,
					boxShadow: 'none',
					fontFamily: 'Inter',
					fontWeight: 600,
					fontSize: 13,
					letterSpacing: '-0.01em',
					transition: 'all 0.2s ease',
					[buttonClasses.startIcon]: {
						fontSize: '0.5rem',
					},
					[buttonClasses.endIcon]: {
						fontSize: '0.5rem',
					},
				},
				sizeSmall: {
					padding: '6px 14px',
					minHeight: 32,
					height: 32,
				},
				sizeMedium: {
					padding: '8px 18px',
					minHeight: 38,
					height: 38,
				},
				sizeLarge: {
					padding: '10px 24px',
					minHeight: 44,
					height: 44,
					fontSize: 14,
				},
				contained: {
					background: 'linear-gradient(180deg, #21B5FF 0%, #1a9fd9 100%)',
					color: '#ffffff',
					boxShadow: '0 1px 2px 0 rgba(33, 181, 255, 0.3)',
					'& .MuiSvgIcon-root': {
						color: '#ffffff',
					},
					'&:hover': {
						background: 'linear-gradient(180deg, #1a9fd9 0%, #158abf 100%)',
						boxShadow: '0 4px 12px 0 rgba(33, 181, 255, 0.35)',
						transform: 'translateY(-1px)',
					},
					'&:active': {
						transform: 'translateY(0)',
					},
					'&.Mui-disabled': {
						background: BG_TERTIARY,
						color: TEXT_MUTED,
						boxShadow: 'none',
						'& .MuiSvgIcon-root': {
							color: TEXT_MUTED,
						},
					},
				},
				containedSecondary: {
					background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
					color: '#ffffff',
					boxShadow: '0 1px 2px 0 rgba(16, 185, 129, 0.3)',
					'& .MuiSvgIcon-root': {
						color: '#ffffff',
					},
					'&:hover': {
						background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
						boxShadow: '0 4px 12px 0 rgba(16, 185, 129, 0.35)',
						transform: 'translateY(-1px)',
					},
					'&:active': {
						transform: 'translateY(0)',
					},
					'&.Mui-disabled': {
						background: BG_TERTIARY,
						color: TEXT_MUTED,
						boxShadow: 'none',
						'& .MuiSvgIcon-root': {
							color: TEXT_MUTED,
						},
					},
				},
				containedError: {
					background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
					color: '#ffffff',
					boxShadow: '0 1px 2px 0 rgba(239, 68, 68, 0.3)',
					'& .MuiSvgIcon-root': {
						color: '#ffffff',
					},
					'&:hover': {
						background: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)',
						boxShadow: '0 4px 12px 0 rgba(239, 68, 68, 0.35)',
						transform: 'translateY(-1px)',
					},
					'&:active': {
						transform: 'translateY(0)',
					},
					'&.Mui-disabled': {
						background: BG_TERTIARY,
						color: TEXT_MUTED,
						boxShadow: 'none',
						'& .MuiSvgIcon-root': {
							color: TEXT_MUTED,
						},
					},
				},
				outlined: {
					borderColor: BORDER_COLOR,
					backgroundColor: '#ffffff',
					'& .MuiSvgIcon-root': {
						color: 'inherit',
					},
					'&:hover': {
						borderColor: '#21B5FF',
						backgroundColor: 'rgba(33, 181, 255, 0.04)',
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
					'&:hover': {
						backgroundColor: 'rgba(33, 181, 255, 0.08)',
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					borderRadius: 9999, // Pill shape
					backgroundColor: '#ffffff',
					border: `1px solid ${BORDER_COLOR}`,
					fontWeight: 500,
					transition: 'all 0.2s ease',
					'& .MuiChip-icon': {
						color: TEXT_SECONDARY,
					},
					'& .MuiChip-label': {
						color: TEXT_PRIMARY,
						fontSize: 12,
						fontWeight: 500,
					},
					'&:hover': {
						backgroundColor: BG_TERTIARY,
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
				colorPrimary: {
					backgroundColor: 'rgba(33, 181, 255, 0.1)',
					borderColor: 'rgba(33, 181, 255, 0.2)',
					'& .MuiChip-label': {
						color: '#0891b2',
					},
				},
				colorSecondary: {
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
					borderColor: 'rgba(16, 185, 129, 0.2)',
					'& .MuiChip-label': {
						color: '#059669',
					},
				},
				colorSuccess: {
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					borderColor: 'rgba(34, 197, 94, 0.2)',
					'& .MuiChip-label': {
						color: '#16a34a',
					},
				},
				colorError: {
					backgroundColor: 'rgba(239, 68, 68, 0.1)',
					borderColor: 'rgba(239, 68, 68, 0.2)',
					'& .MuiChip-label': {
						color: '#dc2626',
					},
				},
				colorWarning: {
					backgroundColor: 'rgba(245, 158, 11, 0.1)',
					borderColor: 'rgba(245, 158, 11, 0.2)',
					'& .MuiChip-label': {
						color: '#d97706',
					},
				},
				colorInfo: {
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					borderColor: 'rgba(59, 130, 246, 0.2)',
					'& .MuiChip-label': {
						color: '#2563eb',
					},
				},
				sizeSmall: {
					height: 26,
					'& .MuiChip-label': {
						fontSize: 11,
						padding: '0 12px',
					},
				},
				sizeMedium: {
					height: 32,
					'& .MuiChip-label': {
						padding: '0 14px',
					},
				},
			},
		},
		MuiBadge: {
			styleOverrides: {
				badge: {
					fontWeight: 600,
					fontSize: 11,
				},
			},
		},
		MuiIconButton: {
			defaultProps: {
				size: 'small',
			},
			styleOverrides: {
				root: {
					borderRadius: 10,
					transition: 'all 0.2s ease',
					'&:hover': {
						backgroundColor: 'rgba(33, 181, 255, 0.08)',
					},
				},
				sizeSmall: {
					padding: 6,
				},
				sizeMedium: {
					padding: 8,
				},
			},
		},
		MuiCheckbox: {
			defaultProps: {
				color: 'primary',
			},
			styleOverrides: {
				root: {
					'&.Mui-checked': {
						color: '#21B5FF',
					},
				},
			},
		},
		MuiRadio: {
			defaultProps: {
				color: 'primary',
			},
			styleOverrides: {
				root: {
					'&.Mui-checked': {
						color: '#21B5FF',
					},
				},
			},
		},
		MuiLink: {
			styleOverrides: {
				root: {
					fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
					cursor: 'pointer',
					fontWeight: 500,
					textDecoration: 'none',
					'&:hover': {
						textDecoration: 'underline',
					},
				},
			},
		},
		MuiPaper: {
			defaultProps: {
				elevation: 0,
			},
			styleOverrides: {
				root: {
					borderRadius: 12,
					border: `1px solid ${BORDER_LIGHT}`,
					boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
					backgroundImage: 'none',
				},
				elevation0: {
					boxShadow: 'none',
				},
				elevation1: {
					boxShadow: SHADOW_SM,
				},
				elevation2: {
					boxShadow: SHADOW_MD,
				},
				elevation3: {
					boxShadow: SHADOW_LG,
				},
				elevation4: {
					boxShadow: SHADOW_XL,
				},
			},
		},
		MuiSelect: {
			defaultProps: {
				variant: 'outlined',
				size: 'small',
				MenuProps: {
					PaperProps: {
						sx: {
							maxHeight: 300,
							maxWidth: 600,
							borderRadius: 2,
							marginTop: 1,
							boxShadow: SHADOW_LG,
						},
					},
				},
			},
		},
		MuiFormControl: {
			defaultProps: {
				variant: 'outlined',
				size: 'small',
			},
		},
		MuiMenu: {
			styleOverrides: {
				paper: {
					borderRadius: 8,
					boxShadow: SHADOW_LG,
					border: `1px solid ${BORDER_COLOR}`,
					marginTop: 4,
				},
				list: {
					padding: 6,
				},
			},
		},
		MuiMenuItem: {
			styleOverrides: {
				root: {
					borderRadius: 6,
					margin: '2px 0',
					padding: '8px 12px',
					fontSize: 13,
					'&:hover': {
						backgroundColor: 'rgba(33, 181, 255, 0.08)',
					},
					'&.Mui-selected': {
						backgroundColor: 'rgba(33, 181, 255, 0.12)',
						'&:hover': {
							backgroundColor: 'rgba(33, 181, 255, 0.16)',
						},
					},
				},
			},
		},
		MuiPopover: {
			styleOverrides: {
				paper: {
					borderRadius: 8,
					boxShadow: SHADOW_LG,
					border: `1px solid ${BORDER_COLOR}`,
				},
			},
		},
		MuiPopper: {
			styleOverrides: {
				root: {
					'& .MuiPaper-root': {
						boxShadow: SHADOW_LG,
					},
				},
			},
		},
		MuiAutocomplete: {
			styleOverrides: {
				paper: {
					borderRadius: 8,
					boxShadow: SHADOW_LG,
					border: `1px solid ${BORDER_COLOR}`,
					marginTop: 4,
				},
				listbox: {
					padding: 6,
				},
				option: {
					borderRadius: 6,
					margin: '2px 6px',
					padding: '8px 12px',
					fontSize: 13,
					'&:hover': {
						backgroundColor: 'rgba(33, 181, 255, 0.08)',
					},
					'&[aria-selected="true"]': {
						backgroundColor: 'rgba(33, 181, 255, 0.12)',
						'&:hover': {
							backgroundColor: 'rgba(33, 181, 255, 0.16)',
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
					borderRadius: 8,
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
					fontSize: 20,
					// Don't override colors for checkbox/radio icons
					'.MuiCheckbox-root &, .MuiRadio-root &': {
						color: 'inherit',
					},
					// White color for selected tree node icons
					'&.node-selected-inner': {
						color: '#ffffff',
					},
				},
			},
		},
		MuiTabs: {
			styleOverrides: {
				root: {
					minHeight: 40,
					height: 40,
				},
				indicator: {
					height: 3,
					borderRadius: '3px 3px 0 0',
				},
			},
		},
		MuiTab: {
			defaultProps: {
				iconPosition: 'start',
			},
			styleOverrides: {
				root: {
					minHeight: 40,
					height: 40,
					color: TEXT_SECONDARY,
					fontWeight: 500,
					fontSize: 13,
					textTransform: 'none',
					padding: '8px 16px',
					'&.Mui-selected': {
						color: '#21B5FF',
						fontWeight: 600,
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
					borderRadius: 10,
					fontSize: 13,
					background: 'linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%)',
					minHeight: 36,
					boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.95), 0 1px 3px 0 rgba(0, 0, 0, 0.05)',
					transition: 'all 0.2s ease',
					'&:not(.MuiInputBase-multiline)': {
						height: 36,
					},
					'&:hover .MuiOutlinedInput-notchedOutline': {
						borderColor: '#94a3b8',
					},
					'&.Mui-focused': {
						boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 0 0 3px rgba(33, 181, 255, 0.1)',
						'& .MuiOutlinedInput-notchedOutline': {
							borderColor: '#21B5FF',
							borderWidth: 2,
						},
					},
					'&.Mui-disabled': {
						background: BG_TERTIARY,
						boxShadow: 'none',
						'& .MuiOutlinedInput-notchedOutline': {
							borderColor: BORDER_LIGHT,
						},
					},
				},
				input: {
					padding: '8px 14px',
					height: 'auto',
					'&.Mui-disabled': {
						color: TEXT_MUTED,
						WebkitTextFillColor: TEXT_MUTED,
					},
				},
				notchedOutline: {
					borderColor: BORDER_COLOR,
					transition: 'all 0.2s ease',
					'& legend': {
						paddingRight: 8,
					},
				},
			},
		},
		MuiCard: {
			defaultProps: {
				elevation: 0,
			},
			styleOverrides: {
				root: {
					borderRadius: 16,
					border: `1px solid ${BORDER_COLOR}`,
					boxShadow: SHADOW_SM,
					transition: 'all 0.2s ease',
					'&:hover': {
						boxShadow: SHADOW_MD,
					},
				},
			},
		},
		MuiCardContent: {
			styleOverrides: {
				root: {
					padding: 24,
					'&:last-child': {
						paddingBottom: 24,
					},
				},
			},
		},
		MuiCardHeader: {
			styleOverrides: {
				root: {
					padding: '20px 24px',
				},
				title: {
					fontSize: 15,
					fontWeight: 600,
				},
				subheader: {
					fontSize: 13,
					color: TEXT_SECONDARY,
				},
			},
		},
		MuiInputLabel: {
			styleOverrides: {
				root: {
					fontSize: 14,
					fontWeight: 500,
					color: TEXT_PRIMARY,
					'&.Mui-focused': {
						color: '#21B5FF',
					},
				},
			},
		},
		MuiFormHelperText: {
			styleOverrides: {
				root: {
					fontSize: 12,
					marginTop: 6,
					marginLeft: 2,
				},
			},
		},
		MuiDialog: {
			styleOverrides: {
				paper: {
					borderRadius: 20,
					border: `1px solid ${BORDER_COLOR}`,
					boxShadow: SHADOW_XL,
				},
			},
		},
		MuiDialogTitle: {
			styleOverrides: {
				root: {
					padding: '20px 24px 16px',
					fontSize: 18,
					fontWeight: 600,
				},
			},
		},
		MuiDialogContent: {
			styleOverrides: {
				root: {
					padding: '16px 24px',
				},
			},
		},
		MuiDialogActions: {
			styleOverrides: {
				root: {
					padding: '16px 24px 20px',
					gap: 2,
				},
			},
		},
		MuiToggleButtonGroup: {
			styleOverrides: {
				root: {
					backgroundColor: BG_TERTIARY,
					padding: 4,
					borderRadius: 12,
					border: 'none',
					gap: 4,
				},
			},
		},
		MuiToggleButton: {
			styleOverrides: {
				root: {
					borderRadius: '8px !important',
					border: 'none !important',
					textTransform: 'none',
					fontWeight: 500,
					fontSize: 13,
					padding: '6px 14px',
					color: TEXT_SECONDARY,
					'&:hover': {
						backgroundColor: 'rgba(33, 181, 255, 0.08)',
					},
					'&.Mui-selected': {
						backgroundColor: '#ffffff',
						color: TEXT_PRIMARY,
						boxShadow: SHADOW_SM,
						'&:hover': {
							backgroundColor: '#ffffff',
						},
					},
				},
			},
		},
		MuiTooltip: {
			styleOverrides: {
				tooltip: {
					fontSize: 12,
					fontWeight: 500,
					backgroundColor: TEXT_PRIMARY,
					borderRadius: 8,
					padding: '8px 12px',
					boxShadow: SHADOW_MD,
				},
				arrow: {
					color: TEXT_PRIMARY,
				},
			},
		},
		MuiAlert: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					fontSize: 13,
					fontWeight: 500,
				},
				standardSuccess: {
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					color: '#15803d',
					'& .MuiAlert-icon': {
						color: '#22c55e',
					},
				},
				standardError: {
					backgroundColor: 'rgba(239, 68, 68, 0.1)',
					color: '#b91c1c',
					'& .MuiAlert-icon': {
						color: '#ef4444',
					},
				},
				standardWarning: {
					backgroundColor: 'rgba(245, 158, 11, 0.1)',
					color: '#b45309',
					'& .MuiAlert-icon': {
						color: '#f59e0b',
					},
				},
				standardInfo: {
					backgroundColor: 'rgba(33, 181, 255, 0.1)',
					color: '#0369a1',
					'& .MuiAlert-icon': {
						color: '#21B5FF',
					},
				},
			},
		},
		MuiAvatar: {
			styleOverrides: {
				root: {
					fontSize: 14,
					fontWeight: 600,
				},
			},
		},
		MuiDivider: {
			styleOverrides: {
				root: {
					borderColor: BORDER_LIGHT,
				},
			},
		},
		MuiSwitch: {
			styleOverrides: {
				root: {
					width: 44,
					height: 24,
					padding: 0,
				},
				switchBase: {
					padding: 2,
					'&.Mui-checked': {
						transform: 'translateX(20px)',
						'& + .MuiSwitch-track': {
							backgroundColor: '#21B5FF',
							opacity: 1,
						},
					},
				},
				thumb: {
					width: 20,
					height: 20,
					boxShadow: SHADOW_SM,
				},
				track: {
					borderRadius: 12,
					backgroundColor: BORDER_COLOR,
					opacity: 1,
				},
			},
		},
		MuiLinearProgress: {
			styleOverrides: {
				root: {
					borderRadius: 4,
					height: 6,
					backgroundColor: BORDER_LIGHT,
				},
				bar: {
					borderRadius: 4,
				},
			},
		},
		MuiCircularProgress: {
			styleOverrides: {
				root: {
					strokeLinecap: 'round',
				},
			},
		},
		MuiAccordion: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					border: `1px solid ${BORDER_COLOR}`,
					boxShadow: 'none',
					'&:before': {
						display: 'none',
					},
					'&.Mui-expanded': {
						margin: 0,
					},
				},
			},
		},
		MuiAccordionSummary: {
			styleOverrides: {
				root: {
					padding: '0 16px',
					minHeight: 52,
					'&.Mui-expanded': {
						minHeight: 52,
					},
				},
				content: {
					margin: '12px 0',
					'&.Mui-expanded': {
						margin: '12px 0',
					},
				},
			},
		},
		MuiAccordionDetails: {
			styleOverrides: {
				root: {
					padding: '0 16px 16px',
				},
			},
		},
	},
	palette: {
		mode: 'light',
		action: {
			active: TEXT_PRIMARY,
			hover: 'rgba(33, 181, 255, 0.04)',
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
			main: '#10b981',
			light: '#34d399',
			dark: '#059669',
			contrastText: '#fff',
		},
		success: {
			main: '#22c55e',
			light: '#4ade80',
			dark: '#16a34a',
			contrastText: '#fff',
		},
		error: {
			main: '#ef4444',
			light: '#f87171',
			dark: '#dc2626',
			contrastText: '#fff',
		},
		warning: {
			main: '#f59e0b',
			light: '#fbbf24',
			dark: '#d97706',
			contrastText: '#fff',
		},
		info: {
			main: '#3b82f6',
			light: '#60a5fa',
			dark: '#2563eb',
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
		h1: {
			fontSize: 32,
			fontWeight: 700,
			letterSpacing: '-0.02em',
			lineHeight: 1.2,
			color: TEXT_PRIMARY,
		},
		h2: {
			fontSize: 28,
			fontWeight: 700,
			letterSpacing: '-0.02em',
			lineHeight: 1.25,
			color: TEXT_PRIMARY,
		},
		h3: {
			fontSize: 24,
			fontWeight: 600,
			letterSpacing: '-0.01em',
			lineHeight: 1.3,
			color: TEXT_PRIMARY,
		},
		h4: {
			fontSize: 20,
			fontWeight: 600,
			letterSpacing: '-0.01em',
			lineHeight: 1.35,
			color: TEXT_PRIMARY,
		},
		h5: {
			fontSize: 18,
			fontWeight: 600,
			letterSpacing: '-0.01em',
			lineHeight: 1.4,
			color: TEXT_PRIMARY,
		},
		h6: {
			fontSize: 16,
			fontWeight: 600,
			letterSpacing: '-0.01em',
			lineHeight: 1.45,
			color: TEXT_PRIMARY,
		},
		body1: {
			color: TEXT_PRIMARY,
			fontSize: 14,
			lineHeight: 1.6,
		},
		body2: {
			color: TEXT_SECONDARY,
			fontSize: 13,
			lineHeight: 1.5,
		},
		subtitle1: {
			color: TEXT_PRIMARY,
			fontSize: 15,
			fontWeight: 500,
			lineHeight: 1.5,
		},
		subtitle2: {
			color: TEXT_SECONDARY,
			fontSize: 14,
			fontWeight: 500,
			lineHeight: 1.5,
		},
		caption: {
			fontSize: 12,
			color: TEXT_MUTED,
			lineHeight: 1.4,
		},
		overline: {
			fontSize: 11,
			fontWeight: 600,
			letterSpacing: '0.08em',
			textTransform: 'uppercase',
			color: TEXT_MUTED,
		},
		button: {
			textTransform: 'none',
			fontWeight: 600,
		},
	},
	shape: {
		borderRadius: 12,
	},
	shadows: [
		'none',
		SHADOW_XS,
		SHADOW_SM,
		SHADOW_SM,
		SHADOW_MD,
		SHADOW_MD,
		SHADOW_MD,
		SHADOW_LG,
		SHADOW_LG,
		SHADOW_LG,
		SHADOW_LG,
		SHADOW_LG,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
		SHADOW_XL,
	],
});

// DataGrid styles - apply via sx prop on DataGrid components
export const dataGridStyles = {
	fontSize: 13,
	border: 'none',
	'& .MuiDataGrid-row': {
		transition: 'background-color 0.15s ease',
		minHeight: '48px !important',
		borderRadius: 2,
		margin: '2px 0',
	},
	'& .MuiDataGrid-row:hover': {
		backgroundColor: 'rgba(33, 181, 255, 0.04)',
	},
	'& .MuiDataGrid-row.Mui-selected': {
		transition: 'background-color 0.15s ease',
		backgroundColor: 'rgba(33, 181, 255, 0.08)',
	},
	'& .MuiDataGrid-row.Mui-selected:hover': {
		backgroundColor: 'rgba(33, 181, 255, 0.12)',
	},
	'& .MuiDataGrid-cell': {
		padding: '12px 16px',
		display: 'flex',
		alignItems: 'center',
		borderBottom: `1px solid ${BORDER_LIGHT}`,
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
		color: TEXT_SECONDARY,
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		backgroundColor: BG_TERTIARY,
	},
	'& .MuiDataGrid-columnHeader:focus': {
		outline: 'none',
	},
	'& .MuiDataGrid-columnHeader:focus-within': {
		outline: 'none',
	},
	'& .MuiDataGrid-columnHeaders': {
		borderBottom: `1px solid ${BORDER_COLOR}`,
	},
	'& .MuiDataGrid-footerContainer': {
		borderTop: `1px solid ${BORDER_COLOR}`,
	},
};

// Export the theme for use in your application
export default theme;
