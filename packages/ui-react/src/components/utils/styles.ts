import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    },
  },
});

export const joinClassNames = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Ignore unsupported inline styles, including props supplied by JavaScript callers. */
export function withoutStyle<T extends object>(props: T): Omit<T, 'style'> {
  const { style: _style, ...rest } = props as T & { style?: unknown };
  return rest;
}
