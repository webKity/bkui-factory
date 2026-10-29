import type { InputProps, TextareaProps, InputGroupProps, InputGroupAddonProps, InputGroupTextProps, InputOTPProps, CheckboxProps, TypographyProps, TimelineRootProps, TimelineItemProps, TimelineMarkerProps, TimelineContentProps, TimelineTimeProps, TimelineTitleProps, TimelineDescriptionProps, TimelineActionProps, RatingProps, LoadingProps, IconProps, ButtonProps, IAlertProps, TooltipProps, PaginationProps, PaginationItemProps, GalleryProps, ShowGalleryOptions, ToastProps, ToastConfigType, NotificationInput, NotificationProps, NotificationProviderProps } from '../packages/ui-react/src';

type APIs = [NonNullable<TooltipProps['triggerProps']>, TypographyProps<'a'>, InputProps, TextareaProps, InputGroupProps, InputGroupAddonProps, InputGroupTextProps, InputOTPProps, CheckboxProps, TypographyProps, TimelineRootProps, TimelineItemProps, TimelineMarkerProps, TimelineContentProps, TimelineTimeProps, TimelineTitleProps, TimelineDescriptionProps, TimelineActionProps, RatingProps, LoadingProps, IconProps, ButtonProps, IAlertProps, TooltipProps, PaginationProps, PaginationItemProps, GalleryProps, ShowGalleryOptions, ToastProps, ToastConfigType, NotificationInput, NotificationProps, NotificationProviderProps];
type ValidStyleAPI<T> = 'style' extends keyof T ? false : 'className' extends keyof T ? true : false;
type CheckEach<T extends unknown[]> = { [K in keyof T]: ValidStyleAPI<T[K]> };
type AssertAllTrue<T extends true[]> = T;
type StyleAPICheck = AssertAllTrue<CheckEach<APIs>>;
const checked: StyleAPICheck[number] = true;
void checked;
