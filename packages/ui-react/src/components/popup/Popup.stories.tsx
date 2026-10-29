import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button';
import { Popup, PopupTrigger, PopupClose, PopupContent, PopupHeader, PopupFooter, PopupTitle, PopupDescription, usePopup, popup } from './index';

const meta = {
  title: '组件/Popup',
  component: PopupContent,
  tags: ['autodocs'],
  args: { side: 'right', showCloseButton: true, closeLabel: '关闭' },
  argTypes: { side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] } },
  parameters: { docs: { description: { component: '基于 Base UI Dialog 的四边弹层，默认右侧。支持受控状态、组合式 API、usePopup 上下文 holder 和独立 popup() 调用。样式消费局部 --popup-* tokens。PopupContent 显式支持 style / 状态回调，供组合组件注入动态 tokens；其余子组件使用 className。title 为快捷标题，复杂头部请组合 Header / Title / Description。closeLabel 请传入当前语言文案。每次 usePopup create 会替换旧弹层，叠加请使用多个 holder。' } } },
} satisfies Meta<typeof PopupContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  render: args => <Popup>
    <PopupTrigger render={<Button intent="brand" />}>打开弹层</PopupTrigger>
    <PopupContent {...args}>
      <PopupHeader><PopupTitle>设置</PopupTitle><PopupDescription>更新偏好设置，完成后关闭弹层。</PopupDescription></PopupHeader>
      <PopupFooter><PopupClose render={<Button intent="brand" />}>完成</PopupClose></PopupFooter>
    </PopupContent>
  </Popup>,
};
export const Controlled: Story = {
  render: function Example(args) {
    const [open, setOpen] = useState(false);
    return <Popup open={open} onOpenChange={setOpen}>
      <PopupTrigger render={<Button />}>受控弹层</PopupTrigger>
      <PopupContent {...args} title="受控弹层"><PopupFooter><Button onClick={() => setOpen(false)}>保存并关闭</Button></PopupFooter></PopupContent>
    </Popup>;
  },
};
export const Hook: Story = {
  render: function Example(args) {
    const [create, holder] = usePopup();
    return <>{holder}<Button onClick={() => create({ ...args, title: 'Hook 弹层', children: <PopupFooter><PopupClose render={<Button />}>关闭</PopupClose></PopupFooter> })}>通过 usePopup 打开</Button></>;
  },
};
export const Imperative: Story = {
  render: args => <Button onClick={() => popup({ ...args, title: '命令式弹层' })}>通过 popup 打开</Button>,
};
