/**
 * theme.ts — DEPRECATED
 *
 * This file is being phased out. Use CSS custom properties from tokens.css instead.
 *
 * What remains:
 * 1. Minimal MUI theme (font + colors only, for remaining MUI components)
 * 2. Deprecated color constants (still imported during migration)
 * 3. containerStyles (still imported by ~31 files, being replaced with CSS Modules)
 * 4. DataGrid styles (kept until TanStack Table migration)
 */

import { createTheme } from '@mui/material/styles';
import { gridClasses } from '@mui/x-data-grid-pro';

// =============================================================================
// @deprecated — Color constants. Use var(--token-name) in CSS Modules instead.
// =============================================================================

export const BASE_COLOR = '#41414a';
export const BASE_COLOR_LIGHT = '#9394a1';
export const BACKDROP_COLOR = '#f8fafc';
export const HOVERED_COLOR = '#e2e8f0';
export const OFFWHITE_COLOR = '#fafafc';
export const OUTLINE_COLOR = '#e2e8f0';
export const ORANGE = '#F27013';
export const PURPLE = '#CA8EFF';

export const TEXT_PRIMARY = '#0f172a';
export const TEXT_SECONDARY = '#64748b';
export const TEXT_MUTED = '#94a3b8';
export const BORDER_COLOR = '#cbd5e1';
export const BORDER_LIGHT = '#e2e8f0';
export const BG_TERTIARY = '#f8fafc';
export const BG_SECONDARY = '#fafafc';

// =============================================================================
// @deprecated — Container styles. Replace with CSS Modules or Card variants.
// =============================================================================

export const containerStyles = {
	gradientCard: {
		background:
			'linear-gradient(135deg, rgba(33, 181, 255, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
		border: `1px solid ${BORDER_LIGHT}`,
		borderRadius: '12px',
		padding: '20px',
	},
	beveledCard: {
		backgroundColor: '#ffffff',
		border: `1px solid ${BORDER_LIGHT}`,
		borderRadius: '12px',
		boxShadow:
			'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
	},
	section: {
		backgroundColor: '#ffffff',
		border: `1px solid ${BORDER_LIGHT}`,
		borderRadius: '12px',
		overflow: 'hidden' as const,
		boxShadow:
			'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
	},
	sectionTitle: {
		width: '100%',
		display: 'flex',
		alignItems: 'center',
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

// =============================================================================
// DataGrid styles — kept until TanStack Table migration
// =============================================================================

export const dataGridFocusStyles = {
	[`& .${gridClasses.cell}:focus`]: { outline: 'none' },
	[`& .${gridClasses.cell}:focus-within`]: { outline: 'none' },
	[`& .${gridClasses.columnHeader}:focus`]: { outline: 'none' },
	[`& .${gridClasses.columnHeader}:focus-within`]: { outline: 'none' },
	[`& .${gridClasses.columnHeader}`]: { display: 'flex', alignItems: 'center' },
	[`& .${gridClasses.pinnedColumns}`]: {
		backgroundColor: '#ffffff',
		boxShadow: '2px 0 4px -2px rgba(0, 0, 0, 0.15)',
	},
	[`& .${gridClasses['cell--pinnedLeft']}`]: {
		backgroundColor: '#ffffff',
		borderRight: '1px solid #e2e8f0',
	},
	[`& .${gridClasses['columnHeader--pinnedLeft']}`]: {
		borderRight: '1px solid #cbd5e1',
		display: 'flex',
		alignItems: 'center',
	},
	[`& .${gridClasses['cell--pinnedRight']}`]: {
		backgroundColor: '#ffffff',
		borderLeft: '1px solid #e2e8f0',
		overflow: 'visible',
	},
	[`& .${gridClasses['columnHeader--pinnedRight']}`]: {
		borderLeft: '1px solid #cbd5e1',
		display: 'flex',
		alignItems: 'center',
	},
	'& .striped': {
		[`& .${gridClasses['cell--pinnedLeft']}, & .${gridClasses['cell--pinnedRight']}`]:
			{ backgroundColor: '#f8fafc' },
	},
};

export const dataGridStyles = {
	fontSize: 13,
	border: 'none',
	...dataGridFocusStyles,
	'& .MuiDataGrid-row': {
		transition: 'background-color 0.15s ease',
		minHeight: '48px !important',
		borderRadius: 2,
		margin: '2px 0',
	},
	'& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(33, 181, 255, 0.04)' },
	'& .MuiDataGrid-row.Mui-selected': {
		transition: 'background-color 0.15s ease',
		backgroundColor: 'rgba(33, 181, 255, 0.08)',
	},
	'& .MuiDataGrid-row.Mui-selected:hover': {
		backgroundColor: 'rgba(33, 181, 255, 0.12)',
	},
	'& .MuiDataGrid-columnHeader': {
		fontSize: 12,
		fontWeight: 600,
		color: TEXT_SECONDARY,
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
	},
	'& .MuiDataGrid-columnHeaders': { borderBottom: `1px solid ${BORDER_COLOR}` },
	'& .MuiDataGrid-footerContainer': { borderTop: `1px solid ${BORDER_COLOR}` },
};
