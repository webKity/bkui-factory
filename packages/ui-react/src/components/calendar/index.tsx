'use client';

import { forwardRef } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import type { ClassNames } from 'react-day-picker';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getCalendarSizeStyle } from './size';
import type { CalendarProps } from './type';
import './index.css';

export type { CalendarProps, DateRange, Matcher } from './type';

const slots = Object.keys(getDefaultClassNames()) as (keyof ClassNames)[];

/** ref、className 和 style 指向外层容器；其余 DayPicker 属性原样传入。 */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  {
    size = 'base',
    className,
    style,
    classNames,
    showOutsideDays = true,
    navLayout = 'around',
    ...props
  },
  ref,
) {
  const mergedClassNames = Object.fromEntries(
    slots.map(slot => [
      slot,
      [`bkreact-calendar__${slot}`, classNames?.[slot]].filter(Boolean).join(' '),
    ]),
  ) as ClassNames;

  return (
    <div
      ref={ref}
      className={['bkreact-calendar', className].filter(Boolean).join(' ')}
      style={{ ...getCalendarSizeStyle(size), ...style }}
      data-size={typeof size === 'string' ? size : 'responsive'}
      {...getResponsiveSizeAttributes(size)}
    >
      <DayPicker
        {...props}
        classNames={mergedClassNames}
        showOutsideDays={showOutsideDays}
        navLayout={navLayout}
      />
    </div>
  );
});

Calendar.displayName = 'Calendar';

export default Calendar;
