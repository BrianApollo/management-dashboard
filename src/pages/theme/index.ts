/**
 * Theme module — combined theme + UI styling system.
 */

// Theme provider & MUI theme
export { ThemeProvider, useThemeMode } from './ThemeContext';
export { createAppTheme, theme } from './theme';

// Typography tokens
export {
  textLg,
  textMd,
  textBase,
  textSm,
  textXs,
  statNumber,
  sectionHeader,
  formLabel,
  helperText,
  monoText,
} from './typography';

// Colors & pill helpers
export {
  STATUS_COLORS,
  STATUS_LABELS,
  NEUTRAL_PILL,
  getStatusColors,
  getProductColors,
  getProductDotColor,
  getEditorColors,
  type StatusKey,
  type StatusColorSet,
  type ProductColorSet,
  type EditorColorSet,
  basePillSx,
  baseChipSx,
  getStatusPillStyle,
  getStatusChipSx,
  getProductPillStyle,
  getProductChipSx,
  getEditorPillStyle,
  getEditorChipSx,
  type PillStyle,
} from './colors';

// Shared style constants
export { hiddenInputStyle, nativeDateInputStyle, nativeTimeInputStyle } from './styles';

