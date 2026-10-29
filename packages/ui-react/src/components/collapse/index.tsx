'use client';

import { Accordion } from '@base-ui/react/accordion';
import { createContext, createElement, forwardRef, useContext } from 'react';
import { BKIcon } from '../icon';
import { getResponsiveSizeAttributes } from '../utils/size';
import { joinClassNames, withoutStyle } from '../utils/styles';
import { getCollapseSizeStyle } from './size';
import type { CollapseIcons, CollapseItemProps, CollapseProps } from './type';
import './index.css';

export type * from './type';

const defaultIcons: CollapseIcons = { open: 'small_up_arrow', close: 'small_down_arrow' };
const CollapseContext = createContext<CollapseIcons>(defaultIcons);

export const CollapseItem = forwardRef<HTMLDivElement, CollapseItemProps>(function CollapseItem(
  { value, title, headerLevel = 3, children, disabled = false, keepMounted = false, className, ...props }, ref,
) {
  const icons = useContext(CollapseContext);
  return (
    <Accordion.Item {...withoutStyle(props)} ref={ref} value={value} disabled={disabled}
      className={joinClassNames('bkreact-collapse__item', className)}>
      <Accordion.Header render={createElement(`h${headerLevel}`)} className="bkreact-collapse__header">
        <Accordion.Trigger className="bkreact-collapse__trigger">
          <span className="bkreact-collapse__title">{title}</span>
          <span className="bkreact-collapse__icon" aria-hidden="true">
            <span className="bkreact-collapse__icon-open"><BKIcon name={icons.open} size="100%" renderInServer /></span>
            <span className="bkreact-collapse__icon-close"><BKIcon name={icons.close} size="100%" renderInServer /></span>
          </span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className="bkreact-collapse__panel" keepMounted={keepMounted}>
        <div className="bkreact-collapse__content">{children}</div>
      </Accordion.Panel>
    </Accordion.Item>
  );
});

const CollapseRoot = forwardRef<HTMLDivElement, CollapseProps>(function Collapse(
  { children, value, defaultValue, onChange, accordion = false, disabled = false,
    size = 'base', variant = 'outline', icons, className, ...props }, ref,
) {
  const resolvedIcons: CollapseIcons = {
    open: icons?.open ?? defaultIcons.open,
    close: icons?.close ?? defaultIcons.close,
  };
  return (
    <CollapseContext.Provider value={resolvedIcons}>
      <Accordion.Root<string> {...withoutStyle(props)} ref={ref}
        value={accordion ? value?.slice(0, 1) : value}
        defaultValue={accordion ? defaultValue?.slice(0, 1) : defaultValue}
        onValueChange={next => onChange?.(next)} multiple={!accordion} disabled={disabled}
        className={joinClassNames('bkreact-collapse', className)}
        data-variant={variant} data-size={typeof size === 'string' ? size : 'responsive'}
        {...getResponsiveSizeAttributes(size)} style={getCollapseSizeStyle(size)}>
        {children}
      </Accordion.Root>
    </CollapseContext.Provider>
  );
});

export const Collapse = Object.assign(CollapseRoot, { Item: CollapseItem });
export default Collapse;
