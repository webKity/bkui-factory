'use client';

import { Dialog } from '@base-ui/react/dialog';
import { forwardRef } from 'react';
import { Button } from '../button';
import { BKIcon } from '../icon';
import { withoutStyle } from '../utils/styles';
import './index.css';
import type * as Types from './type';

export const Popup = Dialog.Root;
const PopupTriggerImpl = forwardRef<HTMLElement, Types.PopupTriggerProps>(function PopupTrigger(props, ref) {
  return <Dialog.Trigger data-slot="popup-trigger" {...withoutStyle(props)} ref={ref as React.Ref<HTMLButtonElement>} />;
});
PopupTriggerImpl.displayName = 'PopupTrigger';
export const PopupTrigger = PopupTriggerImpl as {
  <Payload = unknown>(props: Types.PopupTriggerProps<Payload> & React.RefAttributes<HTMLElement>): React.ReactElement;
  displayName?: string;
};
export const PopupClose = forwardRef<HTMLButtonElement, Types.PopupCloseProps>(function PopupClose(props, ref) {
  return <Dialog.Close data-slot="popup-close" {...withoutStyle(props)} ref={ref} />;
});

function className<State>(base: string, custom?: string | ((state: State) => string | undefined)) {
  return (state: State) => [base, typeof custom === 'function' ? custom(state) : custom].filter(Boolean).join(' ');
}

export const PopupContent = forwardRef<HTMLDivElement, Types.PopupContentProps>(function PopupContent({
  side = 'right', title, showCloseButton = true, closeLabel = 'Close', portalContainer,
  className: custom, children, ...props
}, ref) {
  return (
    <Dialog.Portal container={portalContainer}>
      <Dialog.Backdrop data-slot="popup-overlay" className="bkreact-popup bkreact-popup__overlay" />
      <Dialog.Popup {...props} ref={ref} data-slot="popup-content" data-side={side}
        className={className<Dialog.Popup.State>('bkreact-popup bkreact-popup__content', custom)}>
        {title != null && <PopupHeader><PopupTitle>{title}</PopupTitle></PopupHeader>}
        {children}
        {showCloseButton && <PopupClose render={
          <Button className="bkreact-popup__close" variant="ghost" shape="square" size="xs"
            aria-label={closeLabel} prefixIcon={<BKIcon name="close" renderInServer />} />
        } />}
      </Dialog.Popup>
    </Dialog.Portal>
  );
});
export const PopupHeader = forwardRef<HTMLDivElement, Types.PopupHeaderProps>(function PopupHeader({ className, ...props }, ref) {
  return <div {...withoutStyle(props)} ref={ref} data-slot="popup-header" className={['bkreact-popup__header', className].filter(Boolean).join(' ')} />;
});
export const PopupFooter = forwardRef<HTMLDivElement, Types.PopupFooterProps>(function PopupFooter({ className, ...props }, ref) {
  return <div {...withoutStyle(props)} ref={ref} data-slot="popup-footer" className={['bkreact-popup__footer', className].filter(Boolean).join(' ')} />;
});
export const PopupTitle = forwardRef<HTMLHeadingElement, Types.PopupTitleProps>(function PopupTitle({ className: custom, ...props }, ref) {
  return <Dialog.Title {...withoutStyle(props)} ref={ref} data-slot="popup-title" className={className<Dialog.Title.State>('bkreact-popup__title', custom)} />;
});
export const PopupDescription = forwardRef<HTMLParagraphElement, Types.PopupDescriptionProps>(function PopupDescription({ className: custom, ...props }, ref) {
  return <Dialog.Description {...withoutStyle(props)} ref={ref} data-slot="popup-description" className={className<Dialog.Description.State>('bkreact-popup__description', custom)} />;
});
