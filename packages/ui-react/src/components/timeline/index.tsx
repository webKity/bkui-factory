'use client';

import { Children, createContext, forwardRef, useContext } from 'react';
import { joinClassNames } from '../utils';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getTimelineSizeStyle } from './size';
import type {
  TimelineActionProps,
  TimelineContentProps,
  TimelineContextValue,
  TimelineDescriptionProps,
  TimelineItemProps,
  TimelineMarkerProps,
  TimelineRootProps,
  TimelineTimeProps,
  TimelineTitleProps,
} from './type';
import './index.css';

export type * from './type';

const TimelineContext = createContext<TimelineContextValue>({
  layout: 'vertical',
  align: 'start',
});

export const TimelineRoot = forwardRef<HTMLOListElement, TimelineRootProps>(function TimelineRoot(
  { layout = 'vertical', align = 'start', size = 'base', style, className, children, ...props },
  ref,
) {
  return (
    <TimelineContext.Provider value={{ layout, align }}>
      <ol
        {...props}
        {...getResponsiveSizeAttributes(size)}
        ref={ref}
        role={props.role ?? 'list'}
        className={joinClassNames('bkreact-timeline', className)}
        data-layout={layout}
        data-align={align}
        data-size={typeof size === 'string' ? size : 'responsive'}
        style={{ ...getTimelineSizeStyle(size), ...style }}
      >
        {children}
      </ol>
    </TimelineContext.Provider>
  );
});

export const Timeline = TimelineRoot;

export const TimelineItem = forwardRef<HTMLLIElement, TimelineItemProps>(function TimelineItem(
  { layout, status, className, ...props },
  ref,
) {
  const context = useContext(TimelineContext);

  if (process.env.NODE_ENV !== 'production' && layout != null && layout !== context.layout) {
    console.warn('[TimelineItem] 不支持混合布局，请通过 TimelineRoot.layout 统一设置。');
  }

  return (
    <li
      {...props}
      ref={ref}
      className={joinClassNames('bkreact-timeline__item', className)}
      data-layout={context.layout}
      data-align={context.align}
      data-status={status}
      aria-current={status === 'current' ? 'step' : props['aria-current']}
    />
  );
});

export const TimelineMarker = forwardRef<HTMLSpanElement, TimelineMarkerProps>(function TimelineMarker(
  { icon, label, children, className, ...props },
  ref,
) {
  const { layout } = useContext(TimelineContext);

  if (process.env.NODE_ENV !== 'production' && label != null && layout === 'vertical') {
    console.warn('[TimelineMarker] label 仅横向布局可见，请使用 children 自定义标记内容。');
  }

  const content = icon ?? children;
  const hasCustomContent = icon == null && Children.toArray(children).length > 0;

  return (
    <span className="bkreact-timeline__marker-group">
      <span className="bkreact-timeline__marker-body">
        <span
          {...props}
          ref={ref}
          className={joinClassNames('bkreact-timeline__marker', className)}
          data-custom={icon != null || hasCustomContent || undefined}
          data-custom-content={hasCustomContent || undefined}
          aria-hidden={hasCustomContent ? props['aria-hidden'] : true}
        >
          {content}
        </span>
        {label != null && (
          <span className="bkreact-timeline__marker-label">{label}</span>
        )}
      </span>
    </span>
  );
});

export const TimelineContent = forwardRef<HTMLDivElement, TimelineContentProps>(function TimelineContent(
  { className, ...props },
  ref,
) {
  return (
    <div {...props} ref={ref} className={joinClassNames('bkreact-timeline__content', className)} />
  );
});

export const TimelineTime = forwardRef<HTMLTimeElement, TimelineTimeProps>(function TimelineTime(
  { className, ...props },
  ref,
) {
  return (
    <time {...props} ref={ref} className={joinClassNames('bkreact-timeline__time', className)} />
  );
});

export const TimelineTitle = forwardRef<HTMLHeadingElement, TimelineTitleProps>(function TimelineTitle(
  { headingLevel = 3, className, ...props },
  ref,
) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <Heading {...props} ref={ref} className={joinClassNames('bkreact-timeline__title', className)} />
  );
});

export const TimelineDescription = forwardRef<HTMLParagraphElement, TimelineDescriptionProps>(function TimelineDescription(
  { className, ...props },
  ref,
) {
  return (
    <p {...props} ref={ref} className={joinClassNames('bkreact-timeline__description', className)} />
  );
});

export const TimelineAction = forwardRef<HTMLDivElement, TimelineActionProps>(function TimelineAction(
  { className, ...props },
  ref,
) {
  return (
    <div {...props} ref={ref} className={joinClassNames('bkreact-timeline__action', className)} />
  );
});

export default Timeline;
