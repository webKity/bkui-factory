import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button';
import { BKIcon } from '../icon';
import type { IBKSize } from '../types/base';
import {
  Timeline,
  TimelineItem,
  TimelineMarker,
  TimelineContent,
  TimelineTime,
  TimelineTitle,
  TimelineDescription,
  TimelineAction,
} from './index';

const events = [
  { title: '提交申请', date: '2026-10-21', time: '10 月 21 日 10:00', status: '已提交' },
  { title: '审核通过', date: '2026-10-22', time: '10 月 22 日 10:00', status: '已通过' },
  { title: '处理完成', date: '2026-10-23', time: '10 月 23 日 10:00', status: '已完成' },
];
const sizes: IBKSize[] = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'];

interface EventsProps {
  custom?: boolean;
  actions?: boolean;
  labels?: boolean;
}

function Events({ custom = false, actions = false, labels = false }: EventsProps) {
  const [viewed, setViewed] = useState<string[]>([]);

  function viewDetails(title: string) {
    setViewed(previous => previous.includes(title) ? previous : [...previous, title]);
  }

  return (
    <>
      {events.map(event => (
        <TimelineItem key={event.title}>
          <TimelineMarker
            icon={custom ? <BKIcon name="check" size="100%" /> : undefined}
          >
            {labels ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                <span>{event.status}</span>
              </>
            ) : undefined}
          </TimelineMarker>
          <TimelineContent>
            <TimelineTime dateTime={`${event.date}T10:00:00+08:00`}>
              {event.time}
            </TimelineTime>
            <TimelineTitle>{event.title}</TimelineTitle>
            <TimelineDescription>查看这一步的进展和详细说明。</TimelineDescription>
            {actions && (
              <TimelineAction>
                <Button size="xs" onClick={() => viewDetails(event.title)}>
                  {viewed.includes(event.title) ? '已查看' : '查看详情'}
                </Button>
              </TimelineAction>
            )}
          </TimelineContent>
        </TimelineItem>
      ))}
    </>
  );
}

const meta = {
  title: '组件/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  args: { layout: 'vertical', align: 'start', size: 'base' },
  argTypes: {
    layout: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    align: {
      control: 'inline-radio',
      options: ['start', 'center'],
      description: '横向布局中，标记与内容的对齐方式。',
    },
    size: { control: 'select', options: sizes },
  },
  render: args => (
    <Timeline {...args}>
      <Events />
    </Timeline>
  ),
  parameters: {
    docs: {
      description: {
        component: [
          '组合式时间线，Timeline（亦导出为 TimelineRoot）使用原生 ol/li 语义。',
          'Item 内按 Marker、Content 组合，Content 可包含 Time、Title、Description、Action。',
          '默认纵向和 base 尺寸，支持横向、居中和响应式尺寸；响应式 size 必须提供 base。布局统一由 Root 控制，Item.layout 冲突时会被忽略并在开发环境提示。',
          'Timeline 支持 className 覆盖 --timeline-* 局部 tokens。TimelineTitle 可通过 headingLevel 指定 1–6 级原生标题，默认 3。旧 label 仅在横向可见，建议改用 children。',
          '横向时设置 align="center" 居中，通过 TimelineMarker 的 children 组合自定义圆点和右侧文字。',
          '步骤文字色：--timeline-step-text-color 控制默认/活动/完成状态；pending 在 Item 上用 --timeline-step-pending-text-color 覆盖继承值。若要统一所有状态，请通过 Root.className 对应的 CSS 同时覆盖这两个 tokens。',
          '默认是灰色小圆点；icon 与 children 二选一，同时传入时 icon 优先。icon 强制作为装饰隐藏，语义请写入正文；children 保留自定义内容的可访问语义。',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };

export const Horizontal: Story = {
  name: '横向排列',
  args: { layout: 'horizontal' },
};

export const HorizontalCentered: Story = {
  name: '横向居中',
  args: { layout: 'horizontal', align: 'center' },
};

export const HorizontalLabels: Story = {
  name: '圆点右侧文字',
  args: { layout: 'horizontal' },
  render: args => (
    <Timeline {...args}>
      <Events labels />
    </Timeline>
  ),
};

export const HorizontalCenteredLabels: Story = {
  ...HorizontalLabels,
  name: '居中与圆点文字组合',
  args: { layout: 'horizontal', align: 'center' },
};

export const Sizes: Story = {
  name: '七档尺寸',
  render: () => (
    <div className="example-row">
      {sizes.map(size => (
        <Timeline key={size} size={size} aria-label={`${size} 尺寸`}>
          <Events />
        </Timeline>
      ))}
    </div>
  ),
};

export const Responsive: Story = {
  name: '响应式尺寸',
  args: { size: { base: 'xs', md: 'base', xl: 'lg' } },
};

export const CustomMarkers: Story = {
  name: '自定义图标与操作',
  render: args => (
    <Timeline {...args}>
      <Events custom actions />
    </Timeline>
  ),
};

export const Single: Story = {
  name: '单项',
  render: args => (
    <Timeline {...args}>
      <TimelineItem>
        <TimelineMarker />
        <TimelineContent>
          <TimelineTitle>已完成</TimelineTitle>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};

export const Empty: Story = {
  name: '空列表',
  render: args => <Timeline {...args} aria-label="暂无进展" />,
};

export const LongContent: Story = {
  name: '长文本与 RTL',
  render: args => (
    <Timeline {...args} dir="rtl">
      <TimelineItem>
        <TimelineMarker />
        <TimelineContent>
          <TimelineTitle>较长的事件标题</TimelineTitle>
          <TimelineDescription>
            LongUnbrokenContentThatShouldWrapInsideTheTimelineWithoutOverflowingTheAvailableWidth。
            详细内容会自动换行，连接线随内容高度延伸。
          </TimelineDescription>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineMarker />
        <TimelineContent>
          <TimelineTitle>后续事件</TimelineTitle>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};


export const Stepper: Story = {
  name: '步进效果',
  render: function StepperExample() {
    const [current, setCurrent] = useState(0);

    return (
      <div>
        <Timeline layout="horizontal" align="center" aria-label="申请步骤">
          {events.map((event, index) => {
            const status = index < current ? 'complete' : index === current ? 'current' : 'pending';
            const statusText = { complete: '已完成', current: '进行中', pending: '待开始' }[status];

            return (
              <TimelineItem key={event.title} status={status}>
                <TimelineMarker>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: 'var(--timeline-marker-bg)',
                      color: 'var(--timeline-step-text-color)',
                    }}
                  >
                    {status === 'complete' ? '✓' : index + 1}
                  </span>
                  <span>{event.title}</span>
                </TimelineMarker>
                <TimelineContent>
                  <TimelineDescription>{statusText}</TimelineDescription>
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
        <div className="example-row" style={{ marginTop: 24 }}>
          <Button disabled={current === 0} onClick={() => setCurrent(value => value - 1)}>上一步</Button>
          <Button disabled={current === events.length} onClick={() => setCurrent(value => value + 1)}>
            {current === events.length - 1 ? '完成' : '下一步'}
          </Button>
        </div>
      </div>
    );
  },
};
