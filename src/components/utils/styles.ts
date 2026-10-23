import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    },
  },
})

export const joinClassNames = (...inputs: ClassValue[]) => twMerge(clsx(inputs))