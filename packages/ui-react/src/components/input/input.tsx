'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BKIcon } from '../icon';
import { useInputAppearance, isInputInvalid } from './context';
import { getInputSizeProps } from './size';
import { computeSteppedNumberValue, finalizeNumberValue, getSelectedValue, isNumericDraft, normalizeExternalNumberValue, normalizeNumericInput, safeStepValidator, setNativeInputValue } from './number';
import type { InputProps, StepDirection } from './type';
import './index.css';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  intent, size, variant, disabled, readOnly, className, style, type = 'text', clearable = false,
  decimal, showNumberStepper = false, stepValidator, value, defaultValue,
  onChange, onBlur, onKeyDown, onCompositionStart, onCompositionEnd, onPaste, onDrop,
  ...props
}, ref) {
  const appearance = useInputAppearance({ intent, size, variant, disabled, readOnly });
  const sizeProps = getInputSizeProps(appearance.size);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current!, []);
  const numeric = type === 'number';
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => numeric
    ? normalizeExternalNumberValue(defaultValue, decimal) : String(defaultValue ?? ''));
  const [composition, setComposition] = useState<string | null>(null);
  const composing = useRef(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const rawValue = controlled ? value : internalValue;
  const currentValue = numeric ? normalizeExternalNumberValue(rawValue, decimal) : String(rawValue ?? '');
  const lastValid = useRef(currentValue);
  useEffect(() => { if (!composing.current) lastValid.current = currentValue; }, [currentValue]);

  // Match native form reset behavior for the internally managed value.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form || controlled) return;
    const reset = (event: Event) => {
      queueMicrotask(() => {
        if (event.defaultPrevented) return;
        const next = numeric ? normalizeExternalNumberValue(defaultValue, decimal) : String(defaultValue ?? '');
        composing.current = false;
        setComposition(null);
        lastValid.current = next;
        setInternalValue(next);
      });
    };
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [controlled, defaultValue, decimal, numeric, props.form]);

  const editable = !appearance.disabled && !appearance.readOnly;
  const showClear = clearable && type !== 'password' && editable && currentValue.length > 0;
  const showStepper = numeric && showNumberStepper && editable;
  const stepResult = (direction: StepDirection) => computeSteppedNumberValue({
    value: currentValue, direction, step: props.step, min: props.min, max: props.max, decimal,
  });
  const canStep = (direction: StepDirection) => {
    const result = stepResult(direction);
    return result.reason === 'ok' && safeStepValidator(stepValidator, { direction, currentValue, ...result });
  };
  // Dispatch through React's normal change path so consumers receive a real input event.
  const commit = (next: string) => {
    const input = inputRef.current;
    if (!input || !editable) return;
    setNativeInputValue(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const step = (direction: StepDirection) => {
    if (canStep(direction)) commit(stepResult(direction).nextValue);
  };
  const accept = (input: HTMLInputElement, raw: string) => {
    const next = normalizeNumericInput(raw);
    if (!isNumericDraft(next, decimal)) {
      const position = input.selectionStart;
      input.value = lastValid.current;
      if (position !== null) input.setSelectionRange(Math.min(position, input.value.length), Math.min(position, input.value.length));
      return false;
    }
    input.value = next;
    lastValid.current = next;
    if (!controlled) setInternalValue(next);
    return true;
  };

  return <div
    {...sizeProps}
    className={['bkreact-input', className].filter(Boolean).join(' ')}
    style={{ ...sizeProps.style, ...style }}
    data-slot={appearance.grouped ? "input-group-control" : "input-root"}
    data-intent={appearance.intent}
    data-variant={appearance.variant}
    data-grouped={appearance.grouped || undefined}
    data-disabled={appearance.disabled || undefined}
    data-readonly={appearance.readOnly || undefined}
    data-invalid={isInputInvalid(props['aria-invalid']) || undefined}
  >
    <input
      data-slot="input"
      {...props}
      ref={inputRef}
      disabled={appearance.disabled}
      readOnly={appearance.readOnly}
      className="bkreact-input__control"
      type={numeric ? 'text' : type === 'password' && passwordVisible ? 'text' : type}
      inputMode={props.inputMode ?? (numeric ? decimal !== undefined && decimal <= 0 ? 'numeric' : 'decimal' : undefined)}
      value={composition ?? currentValue}
      onChange={event => {
        if (numeric) {
          if (composing.current || (event.nativeEvent as InputEvent).isComposing) {
            setComposition(event.currentTarget.value);
            return;
          }
          if (!accept(event.currentTarget, event.currentTarget.value)) return;
        } else if (!controlled) setInternalValue(event.currentTarget.value);
        onChange?.(event);
      }}
      onCompositionStart={event => {
        if (numeric) { composing.current = true; setComposition(event.currentTarget.value); }
        onCompositionStart?.(event);
      }}
      onCompositionEnd={event => {
        if (numeric) {
          composing.current = false;
          const raw = event.currentTarget.value;
          // Restore the last React-tracked value before emitting the normalized edit.
          event.currentTarget.value = currentValue;
          setComposition(null);
          const next = normalizeNumericInput(raw);
          if (isNumericDraft(next, decimal)) commit(next);
          else event.currentTarget.value = lastValid.current;
        }
        onCompositionEnd?.(event);
      }}
      onPaste={event => {
        onPaste?.(event);
        if (!event.defaultPrevented && numeric && !composing.current) {
          const pasted = normalizeNumericInput(event.clipboardData.getData('text'));
          const input = event.currentTarget;
          const position = (input.selectionStart ?? input.value.length) + pasted.length;
          const next = getSelectedValue(input, pasted);
          event.preventDefault();
          if (isNumericDraft(next, decimal)) {
            commit(next);
            input.setSelectionRange(position, position);
          }
        }
      }}
      onDrop={event => {
        onDrop?.(event);
        if (!event.defaultPrevented && numeric && !composing.current) {
          const next = getSelectedValue(event.currentTarget, normalizeNumericInput(event.dataTransfer.getData('text')));
          event.preventDefault();
          if (isNumericDraft(next, decimal)) commit(next);
        }
      }}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (event.defaultPrevented || !numeric || !editable || composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          step(event.key === 'ArrowUp' ? 'up' : 'down');
        } else if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
          if (!isNumericDraft(getSelectedValue(event.currentTarget, normalizeNumericInput(event.key)), decimal)) event.preventDefault();
        }
      }}
      onBlur={event => {
        if (numeric) {
          composing.current = false;
          setComposition(null);
          const next = finalizeNumberValue(normalizeNumericInput(event.currentTarget.value), decimal);
          if (isNumericDraft(next, decimal)) commit(next);
          else event.currentTarget.value = currentValue;
        }
        onBlur?.(event);
      }}
    />
    {(showClear || type === 'password') && <button
      className="bkreact-input__action" type="button" disabled={appearance.disabled}
      aria-label={type === 'password' ? passwordVisible ? 'Hide password' : 'Show password' : 'Clear input'}
      aria-pressed={type === 'password' ? passwordVisible : undefined}
      onMouseDown={event => event.preventDefault()}
      onClick={() => { if (type === 'password') setPasswordVisible(previous => !previous); else commit(''); }}
    ><BKIcon name={type === 'password' ? passwordVisible ? 'eye_close' : 'eye_open' : 'close_round_fill'} size="100%" renderInServer /></button>}
    {showStepper && <div className="bkreact-input__stepper">
      {(['down', 'up'] as const).map(direction => <button
        key={direction} type="button" className="bkreact-input__step" disabled={!canStep(direction)}
        aria-label={direction === 'up' ? 'Increase value' : 'Decrease value'}
        onMouseDown={event => event.preventDefault()} onClick={() => step(direction)}
      ><BKIcon name={direction === 'up' ? 'plus' : 'sub'} size="100%" renderInServer /></button>)}
    </div>}
  </div>;
});
