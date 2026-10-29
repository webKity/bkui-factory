'use client';

import { withoutStyle } from '../utils/styles';

import { forwardRef, useMemo } from 'react';
import { InputGroupContext, isInputInvalid } from './context';
import { getInputSizeProps } from './size';
import { Input } from './input';
import { Textarea } from './textarea';
import type { InputGroupProps, InputGroupAddonProps, InputGroupTextProps, InputGroupInputProps, InputGroupTextareaProps } from './type';
import './index.css';

const controlSelector = 'input:not(:disabled), textarea:not(:disabled), [role="combobox"]:not([aria-disabled="true"]):not(:disabled)';
const interactiveSelector = 'input, textarea, button, a, select, label, [role="button"], [role="combobox"], [contenteditable="true"], [tabindex]';

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(function InputGroup({ intent = 'normal', size = 'base', variant = 'outline', disabled, readOnly, className, onClick, ...props }, ref) {
  const context = useMemo(() => ({ intent, size, variant, disabled, readOnly }), [intent, size, variant, disabled, readOnly]);
  const sizeProps = getInputSizeProps(size);
  return <InputGroupContext.Provider value={context}>
    <div
      role="group" data-slot="input-group"
      {...withoutStyle(props)} {...sizeProps} ref={ref}
      className={['bkreact-input', 'bkreact-input-group', className].filter(Boolean).join(' ')}
      style={sizeProps.style}
      data-intent={intent} data-variant={variant}
      data-invalid={isInputInvalid(props['aria-invalid']) || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      onClick={event => {
        onClick?.(event);
        if (event.defaultPrevented || (event.target as Element).closest(interactiveSelector)) return;
        // Only focus controls owned by this group when groups are nested.
        const control = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(controlSelector))
          .find(element => element.closest('[data-slot="input-group"]') === event.currentTarget);
        control?.focus();
      }}
    />
  </InputGroupContext.Provider>;
});

export const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(function InputGroupAddon({ align = 'inline-start', className, ...props }, ref) {
  return <div {...withoutStyle(props)} ref={ref} data-slot="input-group-addon" data-align={align}
    className={['bkreact-input-group__addon', className].filter(Boolean).join(' ')} />;
});

export const InputGroupText = forwardRef<HTMLSpanElement, InputGroupTextProps>(function InputGroupText({ className, ...props }, ref) {
  return <span {...withoutStyle(props)} ref={ref} data-slot="input-group-text"
    className={['bkreact-input-group__text', className].filter(Boolean).join(' ')} />;
});

export const InputGroupInput = forwardRef<HTMLInputElement, InputGroupInputProps>(function InputGroupInput(props, ref) {
  return <Input {...withoutStyle(props)} ref={ref} />;
});
export const InputGroupTextarea = forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(function InputGroupTextarea(props, ref) {
  return <Textarea {...withoutStyle(props)} ref={ref} />;
});
