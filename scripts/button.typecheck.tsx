import { createRef } from 'react';
import { Button } from '../src/components/button';

const buttonRef = createRef<HTMLButtonElement>();
const anchorRef = createRef<HTMLAnchorElement>();

<Button ref={buttonRef} type="submit" onClick={event => event.currentTarget.checkValidity()} />;
<Button link="/account" ref={anchorRef} target="_blank" rel="noreferrer" onClick={event => event.currentTarget.href} />;
<Button size={{ sm: 'xs', lg: '2xl' }} intent="success" variant="line" />;

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
