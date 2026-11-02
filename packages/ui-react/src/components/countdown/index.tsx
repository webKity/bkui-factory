'use client';

import { Fragment, forwardRef, useEffect, useRef, useState } from 'react';
import { joinClassNames, withoutStyle } from '../utils/styles';
import { countdownUnits, getCountdownItems } from './time';
import { useCountdown } from './use-countdown';
import { CountdownDigit } from './digit';
import type { CountdownItem, CountdownProps } from './type';
import './index.css';

export type * from './type';
export { useCountdown } from './use-countdown';

function CompletionAnnouncement({ running, finished, completionCount }: {
  running: boolean;
  finished: boolean;
  completionCount: number;
}) {
  const lastCompletion = useRef(completionCount);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (completionCount !== lastCompletion.current) {
      lastCompletion.current = completionCount;
      setMessage('倒计时已结束');
    } else if (running || !finished) setMessage('');
  }, [running, finished, completionCount]);
  return <span className="bkreact-countdown__sr" role="status" aria-live="polite" aria-atomic="true">
    <span key={completionCount}>{message}</span>
  </span>;
}

export const Countdown = forwardRef<HTMLDivElement, CountdownProps>(function Countdown({
  targetTime, duration, value, autoStart, interval, onChange, onFinish,
  scene = 'alarm', animation = 'none', units = 'auto', labels,
  showLabels = scene === 'day' || scene === 'date', showZeroUnits = true, padDays = false,
  separator, className, itemClassName, digitClassName, labelClassName, separatorClassName,
  expiredText, render, children, ...rest
}, ref) {
  const { parts, finished, ready, running, completionCount } = useCountdown({ targetTime, duration, value, autoStart, interval, onChange, onFinish });
  const selected = units === 'auto'
    ? scene === 'otp' ? ['seconds'] as const
      : scene === 'alarm' ? countdownUnits.slice(1)
      : countdownUnits
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
  const renderSeparator = (index: number) => {
    if (index === 0) return null;
    const content = typeof separator === 'function'
      ? separator(items[index - 1].unit, index - 1, items)
      : separator !== undefined ? separator : showLabels ? null : ':';
    if (content == null || typeof content === 'boolean' || content === '') return null;
    return <span className={joinClassNames('bkreact-countdown__separator', separatorClassName)} aria-hidden="true">{content}</span>;
  };

  return (
    <div
      {...withoutStyle(rest)}
      ref={ref}
      className={joinClassNames('bkreact-countdown', className)}
      role={rest.role ?? 'timer'}
      aria-live={rest['aria-live'] ?? 'off'}
      aria-busy={!ready || rest['aria-busy'] || undefined}
      data-pending={!ready || undefined}
      data-scene={scene}
      data-animation={animation}
      data-finished={finished || undefined}
    >
      {!ready ? null : finished && expiredText != null ? expiredText : customRender
        ? customRender(parts, items, { animation, finished, renderDigit })
        : items.map((item, index) => (
          <Fragment key={item.unit}>
            {renderSeparator(index)}
            <span className={joinClassNames('bkreact-countdown__item', itemClassName)} data-unit={item.unit}>
              {renderDigit(item)}
              <span className={joinClassNames(showLabels ? 'bkreact-countdown__label' : 'bkreact-countdown__sr', labelClassName)}>
                {item.label}
              </span>
            </span>
          </Fragment>
        ))}
      {rest['aria-live'] === undefined && (
        <CompletionAnnouncement running={running} finished={finished} completionCount={completionCount} />
      )}
    </div>
  );
});

export default Countdown;
