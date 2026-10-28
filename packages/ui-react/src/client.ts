'use client';

export { Typography } from './components/typography';
export type { TypographyProps } from './components/typography/type';

export { InputOTP } from './components/input.otp';
export type { InputOTPProps } from './components/input.otp';

export { Button } from './components/button';
export type { ButtonProps, ButtonNativeProps, ButtonLinkProps, ButtonComponent, ButtonShape, ButtonWidthMode } from './components/button/type';

export { BKIcon, iconNames, figmaIconNames } from './components/icon';
export type { IconProps, IconName, FigmaIconName, IconVariant } from './components/icon';

export { Loading } from './components/loading';
export type { LoadingProps, LoadingType, LoadingSize } from './components/loading/type';

export { Alert } from './components/alert';
export type { IAlertProps } from './components/alert/type';

export { Input, Textarea, InputGroup, InputGroupAddon, InputGroupText, InputGroupInput, InputGroupTextarea } from './components/input';
export type * from './components/input/type';

export { Gallery, showGallery } from './components/gallery';
export type { GalleryItem, GalleryLabels, GalleryMediaType, GalleryProps, ShowGalleryOptions } from './components/gallery/type';

export { Pagination } from './components/pagination';
export type { Pagingprops, PaginationProps, PaginationAs, PaginationItemType, PaginationItemProps } from './components/pagination/type';

export { DEFAULT_NOTIFICATION_DURATION, Notification, NotificationProvider, useNotification } from './components/notification';
export type * from './components/notification/type';

export { Toast, showToast } from './components/toast';
export type { ToastConfigType, ToastProps } from './components/toast/type';
