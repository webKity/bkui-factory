import type { Config } from 'tailwindcss';

export const yourPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: { primary: 'var(--color-action-primary)' },
      borderRadius: { lg: 'var(--radius-scale-lg)' },
    },
  },
};
