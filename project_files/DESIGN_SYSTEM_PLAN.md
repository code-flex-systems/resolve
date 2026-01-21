# Design System Modernization Plan

## Overview

Migrate from scattered inline styles and arbitrary pixel values to a Clerk-inspired, token-based design system with CSS variables, tighter spacing, and more polished visual details.

## Goals

1. **Reduce visual bulk** - Tighter padding, smaller font sizes in forms
2. **CSS Variables** - Single source of truth for colors, spacing, radii
3. **Semantic naming** - `--color-primary` vs `#21B5FF`
4. **Consistent spacing scale** - 4px base unit system
5. **Polished details** - Subtle gradients on buttons, refined hover states
6. **Better space efficiency** - Forms use less vertical space

---

## Phase 1: CSS Variables Foundation

### 1.1 Create CSS Variables in globals.css

```css
:root {
  /* === Colors === */
  /* Primary - keep existing cyan but add shades */
  --color-primary: #21B5FF;
  --color-primary-hover: #1a9fd9;
  --color-primary-light: rgba(33, 181, 255, 0.1);

  /* Secondary */
  --color-secondary: #32AE99;
  --color-secondary-hover: #2a9482;

  /* Semantic */
  --color-success: #1BB934;
  --color-warning: #F5BF48;
  --color-error: #ED1C24;

  /* Neutrals - generated from a base */
  --color-neutral-950: #0f1115;
  --color-neutral-900: #1a1d24;
  --color-neutral-800: #282d38;
  --color-neutral-700: #353d49;  /* Current BASE_COLOR */
  --color-neutral-600: #4a5568;
  --color-neutral-500: #6b7280;
  --color-neutral-400: #9ca3af;
  --color-neutral-300: #ced4d8;  /* Current BASE_COLOR_LIGHT */
  --color-neutral-200: #e5e7eb;
  --color-neutral-100: #f3f4f6;
  --color-neutral-50: #f9fafb;

  /* Backgrounds */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f7f7f7;  /* Current OFFWHITE_COLOR */
  --color-bg-tertiary: #ebedf1;   /* Current BACKDROP_COLOR */
  --color-bg-hover: #f3f4f6;

  /* Text */
  --color-text-primary: #353d49;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-text-inverse: #ffffff;

  /* Borders */
  --color-border: #e5e7eb;
  --color-border-hover: #d1d5db;
  --color-border-focus: #21B5FF;

  /* === Spacing (4px base unit) === */
  --space-0: 0;
  --space-0-5: 2px;
  --space-1: 4px;
  --space-1-5: 6px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* === Border Radius === */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* === Typography === */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Font sizes - slightly reduced from current */
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 13px;    /* Was 14px, reduced for compactness */
  --font-size-md: 14px;
  --font-size-lg: 15px;
  --font-size-xl: 17px;
  --font-size-2xl: 20px;
  --font-size-3xl: 24px;

  /* Line heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;

  /* Font weights - bump up from current light defaults */
  --font-weight-normal: 400;   /* Was 300 */
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* === Shadows === */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* === Transitions === */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

### 1.2 Update theme.ts to Use CSS Variables

```typescript
// Reference CSS variables where possible
// Keep MUI theme for component-specific overrides

const theme = createTheme({
  palette: {
    primary: {
      main: '#21B5FF',  // Keep for MUI, but components use var(--color-primary)
    },
    // ...
  },
  typography: {
    fontFamily: 'var(--font-family)',
    fontWeightRegular: 400,  // Bump from 300
    fontWeightBold: 600,     // Bump from 500
    body1: {
      fontSize: 'var(--font-size-base)',
      color: 'var(--color-text-primary)',
    },
  },
});
```

---

## Phase 2: Component Spacing Reduction

### 2.1 Form Field Spacing (HIGH IMPACT)

**Current:** Forms use `padding: '10px 0px'` between fields, `gap={2}` (16px)
**New:** Use `gap={1.5}` (12px) or `--space-3` for tighter forms

**Current Dialog Content Padding:** `20px`
**New:** `16px` (`--space-4`)

### 2.2 Specific Component Updates

#### BasicDialog.tsx
```typescript
// Current
const styles = {
  title: {
    minHeight: 50,
    padding: '0px 10px',
  },
};

// New - more compact
const styles = {
  title: {
    minHeight: 40,  // Reduced from 50
    padding: '0 var(--space-3)',  // 12px
  },
};
```

#### Form Row Spacing
```typescript
// Current
<div style={{ padding: '10px 0px' }}>

// New
<div style={{ padding: 'var(--space-2) 0' }}>  // 8px vertical
```

#### TextField Sizing
```typescript
// Add to theme - more compact inputs
MuiTextField: {
  defaultProps: {
    size: 'small',  // Add this
    variant: 'outlined',  // Change from 'standard' for cleaner look
  },
},
MuiOutlinedInput: {
  styleOverrides: {
    root: {
      fontSize: 'var(--font-size-base)',  // 13px
    },
    input: {
      padding: 'var(--space-2) var(--space-3)',  // 8px 12px (tighter than default)
    },
  },
},
```

### 2.3 Spacing Reduction Summary

| Element | Current | New | Savings |
|---------|---------|-----|---------|
| Dialog title height | 50px | 40px | 10px |
| Dialog content padding | 20px | 16px | 8px total |
| Form field gap | 16px | 12px | 4px per field |
| Form row padding | 10px | 8px | 4px per row |
| Input internal padding | 8px 14px | 8px 12px | 4px horizontal |

**Net effect:** A form with 5 fields saves ~50px vertical space.

---

## Phase 3: Typography Refinement

### 3.1 Font Size Adjustments

| Use Case | Current | New |
|----------|---------|-----|
| Body text | 14px | 13px |
| Form labels | 14px | 12px |
| Helper text | 13px | 11px |
| Dialog titles | 17px | 15px |
| Section headers | 17px | 14px (medium weight) |
| Page titles | 20px+ | 17px |

### 3.2 Font Weight Adjustments

```typescript
// Current theme
fontWeightRegular: 300,  // Too light
fontWeightBold: 500,

// New theme
fontWeightRegular: 400,  // Normal weight
fontWeightBold: 600,     // Proper bold
```

### 3.3 Typography Variants

Add custom variants for common patterns:

```typescript
typography: {
  // Compact label for forms
  label: {
    fontSize: 'var(--font-size-sm)',  // 12px
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.25,
  },
  // Compact body for dense UI
  bodyCompact: {
    fontSize: 'var(--font-size-base)',  // 13px
    lineHeight: 1.4,
  },
}
```

---

## Phase 4: Button Polish

### 4.1 Gradient Buttons (Contained Variant)

```typescript
MuiButton: {
  styleOverrides: {
    contained: {
      background: 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '&:hover': {
        background: 'linear-gradient(180deg, var(--color-primary-hover) 0%, #158abf 100%)',
        boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      },
    },
    containedSecondary: {
      background: 'linear-gradient(180deg, var(--color-secondary) 0%, var(--color-secondary-hover) 100%)',
    },
  },
},
```

### 4.2 Button Sizing

```typescript
MuiButton: {
  defaultProps: {
    size: 'small',
    disableElevation: true,  // Cleaner look
  },
  styleOverrides: {
    root: {
      textTransform: 'none',
      borderRadius: 'var(--radius-md)',  // 6px - slightly less rounded
      fontWeight: 500,
      fontSize: 'var(--font-size-sm)',  // 12px
    },
    sizeSmall: {
      padding: 'var(--space-1-5) var(--space-3)',  // 6px 12px
      minHeight: 32,
    },
    sizeMedium: {
      padding: 'var(--space-2) var(--space-4)',  // 8px 16px
      minHeight: 36,
    },
  },
},
```

---

## Phase 5: Input Field Styling

### 5.1 Outlined Inputs (Clerk-style)

```typescript
MuiOutlinedInput: {
  styleOverrides: {
    root: {
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--color-bg-primary)',
      fontSize: 'var(--font-size-base)',
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--color-border-hover)',
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--color-border-focus)',
        borderWidth: 1,  // Keep thin border
      },
    },
    input: {
      padding: 'var(--space-2) var(--space-3)',  // 8px 12px
    },
    notchedOutline: {
      borderColor: 'var(--color-border)',
    },
  },
},
MuiInputLabel: {
  styleOverrides: {
    root: {
      fontSize: 'var(--font-size-sm)',
      fontWeight: 500,
      color: 'var(--color-text-secondary)',
    },
  },
},
```

### 5.2 Switch from Standard to Outlined Variant

```typescript
MuiTextField: {
  defaultProps: {
    variant: 'outlined',  // Change from 'standard'
    size: 'small',
  },
},
```

---

## Phase 6: Dialog Refinement

### 6.1 Dialog Styling

```typescript
MuiDialog: {
  styleOverrides: {
    paper: {
      borderRadius: 'var(--radius-xl)',  // 12px
      boxShadow: 'var(--shadow-lg)',
    },
  },
},
MuiDialogTitle: {
  styleOverrides: {
    root: {
      padding: 'var(--space-4)',  // 16px
      fontSize: 'var(--font-size-lg)',  // 15px
      fontWeight: 600,
    },
  },
},
MuiDialogContent: {
  styleOverrides: {
    root: {
      padding: 'var(--space-4)',  // 16px (reduced from 20px)
    },
  },
},
MuiDialogActions: {
  styleOverrides: {
    root: {
      padding: 'var(--space-3) var(--space-4)',  // 12px 16px
      gap: 'var(--space-2)',  // 8px between buttons
    },
  },
},
```

---

## Phase 7: DataGrid Refinement

### 7.1 More Compact Rows

```typescript
MuiDataGrid: {
  styleOverrides: {
    root: {
      fontSize: 'var(--font-size-base)',  // 13px
      '& .MuiDataGrid-row': {
        minHeight: '40px !important',  // Reduced from default ~52px
      },
      '& .MuiDataGrid-cell': {
        padding: 'var(--space-2) var(--space-3)',  // 8px 12px
      },
      '& .MuiDataGrid-columnHeader': {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
      },
    },
  },
},
```

---

## Implementation Order

### Batch 1: Foundation (Low Risk)
1. Add CSS variables to globals.css
2. Update theme.ts to reference variables where possible
3. Bump font weights (300→400, 500→600)

### Batch 2: Inputs & Buttons (Medium Risk)
4. Switch TextField to outlined variant
5. Add button gradients
6. Reduce input padding

### Batch 3: Spacing Reduction (Higher Risk - Visual Changes)
7. Reduce dialog padding/title heights
8. Tighten form field gaps
9. Reduce typography sizes

### Batch 4: Polish
10. DataGrid row compaction
11. Refine shadows and borders
12. Clean up inline styles to use variables

---

## Migration Strategy

### Approach 1: Gradual (Recommended)
- Update theme.ts first
- Components inherit new defaults automatically
- Update inline styles file-by-file as touched

### Approach 2: Component Wrapper
- Create new compact variants of common components
- `<CompactDialog>`, `<CompactTextField>`
- Migrate screens one at a time

### Approach 3: Feature Flag
- Add `compactMode` to theme context
- Toggle between current and new styles
- Allows A/B testing

---

## Files to Modify

### Core Theme Files
- `src/styles/theme.ts` - Main theme updates
- `src/app/globals.css` - CSS variables

### High-Impact Components
- `src/components/common/BasicDialog.tsx`
- `src/components/common/BasicButton.tsx`
- `src/components/common/Toolbar.tsx`

### Form Components (Many)
- All `*Dialog.tsx` files (~40 files)
- All form-related components

---

## Metrics for Success

1. **Space savings**: Forms should use ~20% less vertical space
2. **Visual consistency**: All colors from CSS variables
3. **No hardcoded colors**: Grep for `#` should only find variable definitions
4. **Font weight balance**: Body text should feel "normal" not "light"
5. **Button polish**: Contained buttons have subtle gradients
