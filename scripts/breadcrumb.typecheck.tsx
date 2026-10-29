import { createRef } from 'react';
import { Breadcrumb } from '../packages/ui-react/src/client';
import type { BreadcrumbItem, BreadcrumbProps } from '../packages/ui-react/src';

const items: BreadcrumbItem[] = [
  { label: '静态祖先', href: null, 'data-testid': 'ancestor', onClick: event => { const element: HTMLElement = event.currentTarget; void element; } },
  { label: '当前页', disabled: true },
];
const props: BreadcrumbProps = { items, 'aria-label': null, size: { base: 'xs', md: 'lg' } };
<Breadcrumb {...props} ref={createRef<HTMLElement>()} />;
// @ts-expect-error 禁用语义统一由 disabled 管理。
const invalidDisabled: BreadcrumbItem = { label: '链接', href: '/', 'aria-disabled': true };
// @ts-expect-error style 不属于组件公开 API。
const invalidStyle: BreadcrumbProps = { items, style: { color: 'red' } };
void [invalidDisabled, invalidStyle];
