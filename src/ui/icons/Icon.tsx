/**
 * Icon — unified SVG icon component for WebOS.
 *
 * Usage:
 *   <Icon name="search" />
 *   <Icon name="chevron-right" size="lg" className="text-blue-500" />
 */

import type { ComponentType, SVGProps } from 'react';

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const SIZE_MAP = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

type IconSize = keyof typeof SIZE_MAP;

// ---------------------------------------------------------------------------
// Icon component
// ---------------------------------------------------------------------------

interface IconProps {
  name: string;
  size?: IconSize | number;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 'md', className, title }: IconProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size];
  const Comp = icons[name];
  if (!Comp) {
    return <span style={{ width: px, height: px }} className={className} title={title} />;
  }
  return (
    <Comp
      width={px}
      height={px}
      className={className}
      title={title}
      aria-hidden={!title}
    />
  );
}

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------

type SvgComponent = ComponentType<SVGProps<SVGSVGElement> & { width?: number; height?: number }>;

const icons: Record<string, SvgComponent> = {};

/** Register an icon by name. Used internally by the generated icon modules. */
export function registerIcon(name: string, component: SvgComponent) {
  icons[name] = component;
}

/** Get all registered icon names. */
export function getIconNames(): string[] {
  return Object.keys(icons).sort();
}

export type { IconSize, IconProps };
