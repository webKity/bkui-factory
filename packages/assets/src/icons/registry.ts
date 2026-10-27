import { figmaIcons, figmaIconNames } from './figma';
import { paths } from './path';

import type { FigmaIconName, IconVariant } from './figma';
import type { IconName as LegacyIconName } from './path';

export type IconName = FigmaIconName | LegacyIconName;
export type { FigmaIconName, IconVariant } from './figma';
export { figmaIconNames, figmaIcons } from './figma';

export const iconNames = [...new Set<IconName>([...figmaIconNames, ...Object.keys(paths) as LegacyIconName[]])];

export interface IconDefinition {
  viewBox: string;
  paths: readonly {
    d: string;
    fill?: string;
    fillRule?: 'nonzero' | 'evenodd';
    clipRule?: 'nonzero' | 'evenodd';
  }[];
}

/** An explicit variant selects Figma; omitted variants preserve existing legacy names. */
export function getIconDefinition(name: IconName, variant?: IconVariant): IconDefinition | undefined {
  const legacy = Object.hasOwn(paths, name) ? paths[name as LegacyIconName] : undefined;
  const figma = Object.hasOwn(figmaIcons, name) ? figmaIcons[name as FigmaIconName] : undefined;
  if (figma && (variant !== undefined || legacy === undefined)) return figma[variant ?? 'regular'];
  if (legacy !== undefined) {
    return {
      viewBox: '0 0 1024 1024',
      paths: (typeof legacy === 'string' ? [legacy] : legacy).map(d => ({ d, fill: 'currentColor' })),
    };
  }
  return undefined;
}
