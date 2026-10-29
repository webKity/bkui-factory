'use client';

import { withoutStyle } from '../utils/styles';

import { forwardRef } from 'react';
import { useInputAppearance, isInputInvalid } from './context';
import { getInputSizeProps } from './size';
import type { TextareaProps } from './type';
import './index.css';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { intent, size, variant, disabled, readOnly, className, ...props },
  ref,
) {
  const appearance = useInputAppearance({ intent, size, variant, disabled, readOnly });
  const sizeProps = getInputSizeProps(appearance.size);

  return (
    <textarea
      data-slot="textarea"
      {...withoutStyle(props)}
      {...sizeProps}
      ref={ref}
      disabled={appearance.disabled}
      readOnly={appearance.readOnly}
      className={['bkreact-input', 'bkreact-input--textarea', className].filter(Boolean).join(' ')}
      style={sizeProps.style}
      data-intent={appearance.intent}
      data-variant={appearance.variant}
      data-grouped={appearance.grouped || undefined}
      data-disabled={appearance.disabled || undefined}
      data-readonly={appearance.readOnly || undefined}
      data-invalid={isInputInvalid(props['aria-invalid']) || undefined}
    />
  );
});
