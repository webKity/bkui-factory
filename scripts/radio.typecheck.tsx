import { createRef } from 'react';
import { Radios } from '../packages/ui-react/src/components/radio';
import type { RadioOption } from '../packages/ui-react/src/components/radio/type';

<Radios options={[{ label: '零', value: 0 }]} ref={createRef<HTMLDivElement>()}
  size={{ base: 'sm', lg: 'xl' }} onChange={(value, details) => {
    const number: number = value;
    if (!number) details.cancel();
  }} />;

// @ts-expect-error value 仅支持字符串或数字，不支持对象。
const objectOption: RadioOption = { label: '对象', value: {} };
// @ts-expect-error value 不支持 Symbol。
const symbolOption: RadioOption = { label: 'Symbol', value: Symbol() };
void objectOption;
void symbolOption;

// @ts-expect-error 响应式尺寸必须包含 base。
<Radios options={[]} size={{ lg: 'xl' }} />;
// @ts-expect-error 通过 className 自定义样式，不提供 style API。
<Radios options={[]} style={{ color: 'red' }} />;
