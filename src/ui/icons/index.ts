/**
 * UI Icons — barrel export.
 */

export { Icon, getIconNames, registerIcon } from './Icon';
export type { IconProps, IconSize } from './Icon';

// Import icons (side effect — registers all icons)
import './icons';
