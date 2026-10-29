import { createRef } from 'react';
import { Calendar } from '../packages/ui-react/src/client';
import type { CalendarProps, DateRange } from '../packages/ui-react/src';

const date = new Date();
<Calendar ref={createRef<HTMLDivElement>()} mode="single" selected={date} onSelect={value => { const day: Date | undefined = value; }} />;
<Calendar mode="single" required selected={date} onSelect={value => { const day: Date = value; }} />;
<Calendar mode="multiple" selected={[date]} onSelect={value => { const days: Date[] | undefined = value; }} />;
<Calendar mode="range" selected={{ from: date }} onSelect={value => { const range: DateRange | undefined = value; }} />;
<Calendar size={{ base: 'xs', md: 'base', xl: 'lg' }} />;
// @ts-expect-error single 不接受数组
<Calendar mode="single" selected={[date]} />;
// @ts-expect-error range 不接受单个 Date
<Calendar mode="range" selected={date} />;
// @ts-expect-error 响应式尺寸必须提供 base
<Calendar size={{ md: 'lg' }} />;
// @ts-expect-error 必选单选模式的 selected 必须存在
const required: CalendarProps = { mode: 'single', required: true };
