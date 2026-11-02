'use client';

import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Children, forwardRef, useCallback, useId, useRef } from 'react';
import type { RefCallback } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { withoutStyle } from '../utils/styles';
import { getRadioSizeStyle } from './size';
import { useRadioIndicator } from './use-indicator';
import type { IRadiosProps, RadiosComponent } from './type';
import './index.css';

export type { IRadiosProps, IRadioItemProps, RadiosProps, RadioOption, RadioChangeEventDetails } from './type';

const RadiosImpl = forwardRef<HTMLDivElement, IRadiosProps>(function Radios(
  {
    options,
    value,
    defaultValue,
    variant = 'ghost',
    round = true,
    intent = 'brand',
    size = 'base',
    disabled = false,
    className,
    itemClassName,
    indicatorClassName,
    labelClassName,
    onChange,
    ...restProps
  },
  ref,
) {
  const id = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const setGroupRef = useCallback((node: HTMLDivElement | null) => {
    groupRef.current = node;
    if (typeof ref === 'function') {
      const cleanup = (ref as RefCallback<HTMLDivElement>)(node);
      if (typeof cleanup === 'function') {
        return () => {
          groupRef.current = null;
          cleanup();
        };
      }
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);
  const indicator = useRadioIndicator(groupRef, variant === 'fill');

  return (
    <RadioGroup
      {...withoutStyle(restProps)}
      {...getResponsiveSizeAttributes(size)}
      ref={setGroupRef}
      className={['bkreact-radio', className].filter(Boolean).join(' ')}
      style={getRadioSizeStyle(size)}
      data-variant={variant}
      data-round={variant === 'fill' && round ? true : undefined}
      data-intent={intent}
      data-size={typeof size === 'string' ? size : 'responsive'}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={onChange}
    >
      {variant === 'fill' && indicator && (
        <span
          className={['bkreact-radio__slider', indicatorClassName].filter(Boolean).join(' ')}
          aria-hidden="true"
          style={indicator}
        />
      )}
      {options.map((option, index) => {
        const labelId = `${id}-${index}-label`;
        const descriptionId = `${id}-${index}-description`;
        const hasDescription = Children.toArray(option.other).some(
          child => typeof child !== 'string' || child.trim().length > 0,
        );
        return (
          <Radio.Root
            key={option.key ?? `${typeof option.value}:${option.value}`}
            value={option.value}
            disabled={disabled || option.disabled}
            className={state => [
              'bkreact-radio__item', itemClassName, option.className,
              state.checked && option.activeClassName,
            ].filter(Boolean).join(' ')}
            aria-labelledby={labelId}
            aria-describedby={hasDescription ? descriptionId : undefined}
          >
            {variant === 'ghost' && (
              <span className="bkreact-radio__circle" aria-hidden="true">
                <Radio.Indicator
                  keepMounted
                  className={['bkreact-radio__indicator', indicatorClassName].filter(Boolean).join(' ')}
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                    <path d="m3 8 3.25 3.25L13 4.5" />
                  </svg>
                </Radio.Indicator>
              </span>
            )}
            <span className="bkreact-radio__content">
              <span id={labelId} className={['bkreact-radio__label', labelClassName, option.labelClassName].filter(Boolean).join(' ')}>
                {option.label}
              </span>
              {hasDescription && <span id={descriptionId} className="bkreact-radio__description">{option.other}</span>}
            </span>
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
});

RadiosImpl.displayName = 'Radios';

export const Radios = RadiosImpl as RadiosComponent;
export default Radios;
