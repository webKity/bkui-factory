import { createRef } from 'react';
import type { ComponentRef } from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Checkbox } from '../packages/ui-react/src/components/checkbox';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const sameRef: Equal<ComponentRef<typeof Checkbox>, ComponentRef<typeof CheckboxPrimitive.Root>> = true;
void sameRef;

<Checkbox ref={createRef<ComponentRef<typeof CheckboxPrimitive.Root>>()} inputRef={createRef<HTMLInputElement>()} onChange={(checked, details) => {
  const value: boolean = checked;
  if (!value) details.cancel();
}} />;
<Checkbox size={{ base: 'sm', lg: 'xl' }} className={state => state.disabled ? 'disabled' : 'enabled'} />;
// @ts-expect-error 公开回调 API 使用 onChange；onCheckedChange 仅作 JS 运行时兼容。
<Checkbox onCheckedChange={() => {}} />;
// @ts-expect-error 响应式尺寸必须提供 base。
<Checkbox size={{ lg: 'xl' }} />;
