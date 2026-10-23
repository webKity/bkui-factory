
import type { Config } from 'tailwindcss';

export const yourPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        primary: 'oklch(var(--primary) / <alpha-value>)',
        // ...
      },
      borderRadius: {
        lg: 'var(--radius)',
      },
    },
  },
};