'use client';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { createContext, forwardRef, useContext } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getTooltipSizeStyle } from './size';
import type { TooltipProps, TooltipProviderProps } from './type';
import './index.css';

export type { TooltipProps, TooltipProviderProps, TooltipSide, TooltipAlign } from './type';
const TooltipDelayContext = createContext(200);

export function TooltipProvider({ delay = 200, children, ...props }: TooltipProviderProps) {
  return (
    <TooltipDelayContext.Provider value={delay}>
      <BaseTooltip.Provider {...props} delay={delay}>{children}</BaseTooltip.Provider>
    </TooltipDelayContext.Provider>
  );
}

/** 基于 Base UI 的非交互式提示；ref 和 className 指向提示浮层。 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip({
  children, content, size = 'sm', arrow = true, className,
  open, defaultOpen, onOpenChange, onOpenChangeComplete, disabled,
  disableHoverablePopup, delay, closeDelay, triggerProps,
  side = 'top', align = 'center', sideOffset, alignOffset = 0, collisionPadding = 8,
  ...popupProps
}, ref) {
  const providerDelay = useContext(TooltipDelayContext);
  return (
    <BaseTooltip.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete} disabled={disabled}
      disableHoverablePopup={disableHoverablePopup}>
      <BaseTooltip.Trigger {...triggerProps} render={children} delay={delay ?? providerDelay} closeDelay={closeDelay} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner className="bkreact-tooltip-positioner" side={side} align={align}
          sideOffset={sideOffset ?? (arrow ? 8 : 4)} alignOffset={alignOffset} collisionPadding={collisionPadding}>
          <BaseTooltip.Popup {...popupProps} ref={ref}
            className={['bkreact-tooltip', className].filter(Boolean).join(' ')}
            style={getTooltipSizeStyle(size)} {...getResponsiveSizeAttributes(size)}>
            {content}
            {arrow && <BaseTooltip.Arrow className="bkreact-tooltip__arrow" aria-hidden="true">
              <svg viewBox="0 0 10 5"><path d="M0 0H10C8.8 0 8.2 0.7 7.4 1.6L5.8 3.5Q5 4.5 4.2 3.5L2.6 1.6C1.8 0.7 1.2 0 0 0Z" /></svg>
            </BaseTooltip.Arrow>}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
});

export default Tooltip;
