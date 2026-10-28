import { createRef, forwardRef } from 'react';
import { Typography } from '../packages/ui-react/src/components/typography';
import type { TypographyProps } from '../packages/ui-react/src/components/typography';

const divRef = createRef<HTMLDivElement>();
const svgRef = createRef<SVGSVGElement>();
const anchorRef = createRef<HTMLAnchorElement>();
const buttonRef = createRef<HTMLButtonElement>();

<Typography ref={divRef} onClick={event => event.currentTarget.align} />;
<Typography as="svg" ref={svgRef} viewBox="0 0 16 16" onClick={event => event.currentTarget.viewBox} />;
<Typography as="a" ref={anchorRef} href="/docs" onClick={event => event.currentTarget.href} />;
<Typography as="button" ref={buttonRef} type="button" size={{ base: 'xs', md: 'lg' }} />;
const linkProps: TypographyProps<'a'> = { as: 'a', href: '/docs' };
<Typography {...linkProps} ref={anchorRef} />;

const CustomLink = forwardRef<HTMLAnchorElement, { to: string; className?: string }>(function CustomLink({ to, ...props }, ref) {
  return <a {...props} ref={ref} href={to} />;
});
<Typography as={CustomLink} to="/docs" ref={anchorRef} />;

// @ts-expect-error SVG 元素不接受 HTML ref。
<Typography as="svg" ref={divRef} />;
// @ts-expect-error 默认 div 不接受 SVG ref。
<Typography ref={svgRef} />;
// @ts-expect-error 默认 div 不接受 href。
<Typography href="/docs" />;
// @ts-expect-error 自定义组件的必填参数仍然必填。
<Typography as={CustomLink} ref={anchorRef} />;
// @ts-expect-error 自定义组件保留其 ref 类型。
<Typography as={CustomLink} to="/docs" ref={buttonRef} />;
// @ts-expect-error 响应式 size 必须包含 base。
<Typography size={{ sm: 'lg' }} />;
