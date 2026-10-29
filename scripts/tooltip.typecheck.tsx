import { createRef } from 'react';
import { Tooltip, TooltipProvider } from '../packages/ui-react/src/components/tooltip';

const trigger = <button type="button">帮助</button>;
<Tooltip content="帮助说明" size="lg" ref={createRef<HTMLDivElement>()}>{trigger}</Tooltip>;
<Tooltip content="帮助说明" size={{ base: 'sm', md: 'lg' }} sideOffset={0}>{trigger}</Tooltip>;
<TooltipProvider delay={200} closeDelay={120}><Tooltip content="帮助说明">{trigger}</Tooltip></TooltipProvider>;

// @ts-expect-error 响应式尺寸必须显式提供 base。
<Tooltip content="帮助说明" size={{ md: 'lg' }}>{trigger}</Tooltip>;
// @ts-expect-error 禁止在提示浮层设置原生 title，避免嵌套浏览器提示。
<Tooltip content="帮助说明" title="重复提示">{trigger}</Tooltip>;
