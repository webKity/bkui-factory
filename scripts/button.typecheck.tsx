import { createRef } from 'react';
import { Button } from '../packages/ui-react/src/components/button';

const buttonRef = createRef<HTMLButtonElement>();
const anchorRef = createRef<HTMLAnchorElement>();

<Button ref={buttonRef} type="submit" onClick={event => event.currentTarget.checkValidity()} />;
<Button link="/account" ref={anchorRef} target="_blank" rel="noreferrer" onClick={event => event.currentTarget.href} />;
<Button size={{ base: 'base', sm: 'xs', lg: '2xl' }} intent="success" variant="outline" />;

// @ts-expect-error 链接模式需要 anchor ref。
<Button link="/account" ref={buttonRef} />;
// @ts-expect-error 原生按钮需要 button ref。
<Button ref={anchorRef} />;
// @ts-expect-error 用户通过 link 设置链接，而不是 href。
<Button href="/account" />;
// @ts-expect-error 链接不接受表单按钮类型。
<Button link="/account" type="submit" />;
// @ts-expect-error 不接受约定外的尺寸。
<Button size="huge" />;

// @ts-expect-error 响应式对象必须显式提供基础尺寸
<Button size={{ sm: 'xs' }} />;

// @ts-expect-error 旧的 intent 名称不再支持。
<Button intent="info" />;
// @ts-expect-error 错误状态使用 danger。
<Button intent="error" />;
// @ts-expect-error 描边样式使用 outline。
<Button variant="line" />;

<Button shape="square" round prefixIcon={<svg />} aria-label="添加" />;
<Button widthMode="fixed" size={{ base: 'sm', lg: 'xl' }}>固定宽度</Button>;
<Button link="/account" widthMode="fixed" shape="rect">账户</Button>;
// @ts-expect-error 圆形使用 square + round，而非独立 shape 值。
<Button shape="circle" />;
// @ts-expect-error 只支持 auto / fixed。
<Button widthMode="full" />;

// @ts-expect-error Button 通过 className 覆盖组件 tokens，不开放 style。
<Button style={{ width: 200 }} />;
