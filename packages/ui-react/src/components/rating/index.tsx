'use client';

import { forwardRef, useId, useState } from 'react';
import { BKIcon } from '../icon';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getRatingSizeStyle } from './size';
import type { RatingProps } from './type';
import './index.css';

export type { RatingProps, RatingTrigger } from './type';

function normalizeValue(value: number, count: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(count, Math.round(value))) : 0;
}

function defaultItemAriaLabel(value: number) {
  return `${value} 分`;
}

export const Rating = forwardRef<HTMLDivElement, RatingProps>(function Rating(
  {
    value,
    defaultValue = 0,
    count = 5,
    trigger = 'click',
    disabled = false,
    readOnly = false,
    size = 'base',
    name,
    onChange,
    getItemAriaLabel = defaultItemAriaLabel,
    className,
    style,
    onMouseLeave,
    'aria-label': ariaLabel,
    ...restProps
  },
  ref,
) {
  const id = useId();
  const total = Number.isSafeInteger(count) && count > 0 ? count : 5;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [preview, setPreview] = useState<number | null>(null);
  const selectedValue = normalizeValue(value ?? internalValue, total);
  const interactive = !disabled && !readOnly;
  const displayedValue = interactive && preview !== null ? Math.min(preview, total) : selectedValue;

  function selectValue(nextValue: number) {
    if (!interactive || nextValue === selectedValue) return;
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  return (
    <div
      {...restProps}
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={ariaLabel ?? (readOnly ? `评分：${selectedValue} / ${total}` : '评分')}
      aria-disabled={disabled || undefined}
      className={['bk-rating', className].filter(Boolean).join(' ')}
      style={{ ...getRatingSizeStyle(size), ...style }}
      data-size={typeof size === 'string' ? size : 'responsive'}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      onMouseLeave={event => {
        setPreview(null);
        onMouseLeave?.(event);
      }}
    >
      {Array.from({ length: total }, (_, index) => {
        const itemValue = index + 1;
        const icon = (
          <span className="bk-rating__icon" data-filled={itemValue <= displayedValue || undefined} aria-hidden="true">
            <BKIcon name="star_fill" size="100%" renderInServer />
          </span>
        );

        // 只读展示不创建表单字段，也不暴露可操作控件。
        if (readOnly) return <span className="bk-rating__item" key={itemValue}>{icon}</span>;

        return (
          <label
            key={itemValue}
            className="bk-rating__item"
            onMouseEnter={() => {
              if (!interactive) return;
              if (trigger === 'hover') selectValue(itemValue);
              else setPreview(itemValue);
            }}
          >
            <input
              className="bk-rating__input"
              type="radio"
              name={name ?? id}
              value={itemValue}
              checked={itemValue === selectedValue}
              disabled={disabled}
              aria-label={getItemAriaLabel(itemValue)}
              onChange={() => {
                setPreview(null);
                selectValue(itemValue);
              }}
            />
            {icon}
          </label>
        );
      })}
    </div>
  );
});

export default Rating;
