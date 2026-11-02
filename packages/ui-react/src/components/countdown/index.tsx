'use client';

import { Fragment, forwardRef } from 'react';
import { joinClassNames, withoutStyle } from '../utils/styles';
import { countdownUnits, getCountdownItems } from './time';
import { useCountdown } from './use-countdown';
import { CountdownDigit } from './digit';
import type { CountdownItem, CountdownProps } from './type';
import './index.css';

export type * from './type';
export { useCountdown } from './use-countdown';

export const Countdown = forwardRef<HTMLDivElement, CountdownProps>(function Countdown({
  targetTime, duration, value, autoStart, interval, onChange, onFinish,
  scene = 'alarm', animation = 'none', units = 'auto', labels,
  showLabels = scene === 'day' || scene === 'date', showZeroUnits = true, padDays = false,
  separator, className, itemClassName, digitClassName, labelClassName, separatorClassName,
  expiredText, render, children, ...rest
}, ref) {
  const { parts, finished } = useCountdown({ targetTime, duration, value, autoStart, interval, onChange, onFinish });
  const selected = units === 'auto'
    ? scene === 'otp' ? ['seconds'] as const
      : scene === 'alarm' ? countdownUnits.slice(1)
      : parts.days > 0 ? countdownUnits : countdownUnits.slice(1)
    : units;
  const items = getCountdownItems(parts, [...selected], labels, showZeroUnits, padDays);
  const renderDigit = (item: CountdownItem, extraClassName?: string) => (
    <CountdownDigit
      text={item.text}
      animation={animation}
      className={joinClassNames(digitClassName, extraClassName)}
    />
  );
  const customRender = render ?? children;

  return (
    <div
      {...withoutStyle(rest)}
      ref={ref}
      className={joinClassNames('bkreact-countdown', className)}
      role={rest.role ?? 'timer'}
      aria-live={rest['aria-live'] ?? 'off'}
      data-scene={scene}
      data-animation={animation}
      data-finished={finished || undefined}
    >
      {finished && expiredText !== undefined ? expiredText : customRender
        ? customRender(parts, items, { animation, finished, renderDigit })
        : items.map((item, index) => (
          <Fragment key={item.unit}>
            {index > 0 && (
              <span className={joinClassNames('bkreact-countdown__separator', separatorClassName)} aria-hidden="true">
                {typeof separator === 'function' ? separator(items[index - 1].unit, index - 1, items)
                  : separator !== undefined ? separator : showLabels ? null : ':'}
              </span>
            )}
            <span className={joinClassNames('bkreact-countdown__item', itemClassName)} data-unit={item.unit}>
              {renderDigit(item)}
              <span className={joinClassNames(showLabels ? 'bkreact-countdown__label' : 'bkreact-countdown__sr', labelClassName)}>
                {item.label}
              </span>
            </span>
          </Fragment>
        ))}
    </div>
  );
});

export default Countdown;
