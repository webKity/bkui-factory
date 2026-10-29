import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { zhCN } from 'react-day-picker/locale';
import { Calendar } from './index';
import type { DateRange } from './type';
import { componentSizes } from '../utils/size';

const month = new Date(2026, 9, 1);
const meta = {
  title: '组件/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  args: { defaultMonth: month, today: new Date(2026, 9, 15), size: 'base' },
  argTypes: { size: { control: 'select', options: componentSizes } },
  parameters: {
    docs: {
      description: {
        component:
          '基于 react-day-picker，支持 single / multiple / range、禁用日期、多月、月份下拉和本地化。selected 与 onSelect 配合使用；仅传 mode 时由 DayPicker 维护选中状态。默认展示相邻月份日期，navLayout="around" 将上一月和下一月箭头放在标题两侧。ref、className、style 指向外层容器；classNames 追加到内部槽位，components / styles / modifiers 等原生配置透传。七档 size 与响应式 size 的规则与 Button 一致，明暗主题自动跟随项目语义 tokens。',
      },
    },
  },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '单选', args: { mode: 'single' } };

export const Controlled: Story = {
  name: '受控单选',
  render: function Example(args) {
    const [selected, setSelected] = useState<Date>();
    return (
      <Calendar
        {...args}
        mode="single"
        selected={selected}
        onSelect={setSelected}
        footer={selected ? `已选择 ${selected.toLocaleDateString('zh-CN')}` : '请选择日期'}
      />
    );
  },
};

export const Multiple: Story = { name: '多选（最多五天）', args: { mode: 'multiple', max: 5 } };

export const Range: Story = {
  name: '双月范围选择',
  render: function Example(args) {
    const [selected, setSelected] = useState<DateRange | undefined>({
      from: new Date(2026, 9, 12),
      to: new Date(2026, 9, 18),
    });
    return (
      <Calendar
        {...args}
        mode="range"
        numberOfMonths={2}
        selected={selected}
        onSelect={setSelected}
      />
    );
  },
};

export const DisabledDates: Story = {
  name: '禁用与隐藏日期',
  args: {
    mode: 'single',
    disabled: [{ before: new Date(2026, 9, 8) }, { dayOfWeek: [0, 6] }],
    hidden: new Date(2026, 9, 10),
  },
};

export const LocalizedDropdowns: Story = {
  name: '中文与月份下拉',
  args: {
    mode: 'single',
    locale: zhCN,
    captionLayout: 'dropdown',
    startMonth: new Date(2020, 0),
    endMonth: new Date(2030, 11),
  },
};

export const Sizes: Story = {
  name: '七档尺寸',
  render: () => (
    <div className="example-row">
      {componentSizes.map(size => (
        <Calendar key={size} size={size} defaultMonth={month} aria-label={`${size} 日历`} />
      ))}
    </div>
  ),
};

export const Responsive: Story = {
  name: '响应式尺寸',
  args: { mode: 'single', size: { base: 'xs', md: 'base', xl: 'lg' } },
};
export const RightToLeft: Story = {
  name: '从右到左',
  args: { mode: 'range', dir: 'rtl', navLayout: 'around' },
};
