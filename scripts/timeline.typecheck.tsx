import { createRef } from 'react';
import { Timeline, TimelineRoot, TimelineItem, TimelineMarker, TimelineContent, TimelineTime, TimelineTitle, TimelineDescription, TimelineAction } from '../packages/ui-react/src/components/timeline';
import type { TimelineProps } from '../packages/ui-react/src';

const props: TimelineProps = { layout: 'vertical', size: { base: 'sm', md: 'lg' } };
<Timeline {...props} ref={createRef<HTMLOListElement>()} aria-label="进展"><TimelineItem ref={createRef<HTMLLIElement>()} layout="horizontal"><TimelineMarker icon={<svg />} ref={createRef<HTMLSpanElement>()} /><TimelineContent ref={createRef<HTMLDivElement>()}><TimelineTime dateTime="2026-10-29" ref={createRef<HTMLTimeElement>()} /><TimelineTitle ref={createRef<HTMLHeadingElement>()} /><TimelineDescription ref={createRef<HTMLParagraphElement>()} /><TimelineAction ref={createRef<HTMLDivElement>()} /></TimelineContent></TimelineItem></Timeline>;
<TimelineRoot size="2xl" reversed start={3} />;
// @ts-expect-error 响应式尺寸必须提供 base。
<Timeline size={{ md: 'lg' }} />;
// @ts-expect-error 不支持未知尺寸。
<Timeline size="medium" />;
// @ts-expect-error 不支持未知布局。
<Timeline layout="diagonal" />;
<Timeline style={{ color: 'red', '--timeline-line-color': 'red' }} />;
<TimelineTitle headingLevel={2} />;
// @ts-expect-error 标题层级只支持 1–6。
<TimelineTitle headingLevel={7} />;
// @ts-expect-error ref 对应原生 ol。
<Timeline ref={createRef<HTMLDivElement>()} />;

<Timeline layout="horizontal" align="center"><TimelineItem><TimelineMarker label="审核通过" /></TimelineItem></Timeline>;
// @ts-expect-error 对齐仅支持 start / center。
<Timeline align="end" />;

<TimelineItem status="current"><TimelineMarker style={{ gap: 8 }}><span>●</span><span>审核中</span></TimelineMarker></TimelineItem>;
// @ts-expect-error 不支持未知步骤状态。
<TimelineItem status="active" />;
