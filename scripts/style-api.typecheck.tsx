import type { InputProps, TextareaProps, InputGroupProps, InputGroupAddonProps, InputGroupTextProps, InputOTPProps, CheckboxProps, TypographyProps, TimelineRootProps, TimelineItemProps, TimelineMarkerProps, TimelineContentProps, TimelineTimeProps, TimelineTitleProps, TimelineDescriptionProps, TimelineActionProps, RatingProps, LoadingProps, IconProps, ButtonProps, IAlertProps, TooltipProps, PaginationProps, PaginationItemProps, GalleryProps, ShowGalleryOptions, ToastProps, ToastConfigType, NotificationInput, NotificationProps, NotificationProviderProps } from '../packages/ui-react/src';

type APIs = [NonNullable<TooltipProps['triggerProps']>, TypographyProps<'a'>, InputProps, TextareaProps, InputGroupProps, InputGroupAddonProps, InputGroupTextProps, InputOTPProps, CheckboxProps, TypographyProps, TimelineRootProps, TimelineItemProps, TimelineMarkerProps, TimelineContentProps, TimelineTimeProps, TimelineTitleProps, TimelineDescriptionProps, TimelineActionProps, RatingProps, LoadingProps, IconProps, ButtonProps, IAlertProps, TooltipProps, PaginationProps, PaginationItemProps, GalleryProps, ShowGalleryOptions, ToastProps, ToastConfigType, NotificationInput, NotificationProps, NotificationProviderProps];
type ValidStyleAPI<T> = 'style' extends keyof T ? false : 'className' extends keyof T ? true : false;
type CheckEach<T extends unknown[]> = { [K in keyof T]: ValidStyleAPI<T[K]> };
type AssertAllTrue<T extends true[]> = T;
type StyleAPICheck = AssertAllTrue<CheckEach<APIs>>;
const checked: StyleAPICheck[number] = true;
void checked;

// Every Sidebar component exposes className and excludes the direct style prop.
import type { ComponentProps } from 'react';
import type * as SidebarComponents from '../packages/ui-react/src/components/sidebar';
type SidebarAPIs = {
  [K in Exclude<keyof typeof SidebarComponents, 'useSidebar'>]: ComponentProps<(typeof SidebarComponents)[K]>;
};
type SidebarStyleChecks = { [K in keyof SidebarAPIs]: ValidStyleAPI<SidebarAPIs[K]> };
type AssertTrue<T extends true> = T;
type SidebarStyleAPICheck = AssertTrue<SidebarStyleChecks[keyof SidebarStyleChecks]>;
const sidebarChecked: SidebarStyleAPICheck = true;
void sidebarChecked;

import type { EmptyProps } from '../packages/ui-react/src';
type EmptyStyleAPICheck = AssertTrue<ValidStyleAPI<EmptyProps>>;
const emptyChecked: EmptyStyleAPICheck = true;
void emptyChecked;

// @ts-expect-error Empty owns its generated size attributes.
const emptyManualSize: EmptyProps = { 'data-size-md': 'lg' };
// @ts-expect-error Responsive sizes must explicitly include base.
const emptyMissingBase: EmptyProps = { size: { md: 'lg' } };
void emptyManualSize;
void emptyMissingBase;
