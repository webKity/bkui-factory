'use client';

import { memo, useState } from 'react';
import { joinClassNames } from '../utils/styles';
import { useReducedMotion } from './use-reduced-motion';
import type { CountdownAnimation } from './type';

/** 每一位保留上一帧；只在数字变化时播放，毫秒更新不会重新启动动画。 */
function DigitCell({ text, animation, reducedMotion }: { text: string; animation: CountdownAnimation; reducedMotion: boolean }) {
  const [frame, setFrame] = useState({ text, animation, previous: null as string | null, revision: 0 });
  if (frame.text !== text || frame.animation !== animation || (reducedMotion && frame.previous !== null)) {
    setFrame({
      text, animation,
      previous: !reducedMotion && frame.animation === animation ? frame.text : null,
      revision: frame.revision + 1,
    });
  }
  const moving = frame.previous !== null;
  const half = (value: string, position: 'top' | 'bottom') => (
    <span className={joinClassNames('bkreact-countdown__half', `bkreact-countdown__half--${position}`)}>
      <span className="bkreact-countdown__half-text">{value}</span>
    </span>
  );

  return (
    <span className="bkreact-countdown__cell" data-moving={moving || undefined}>
      <span className="bkreact-countdown__cell-size">{text}</span>
      {moving && (
        <span
          key={frame.revision}
          className="bkreact-countdown__transition"
          onAnimationEnd={event => {
            // key 重建被打断的动画；revision 校验避免旧动画事件清理新一帧。
            if (event.target !== event.currentTarget.lastElementChild) return;
            setFrame(current => current.revision === frame.revision ? { ...current, previous: null } : current);
          }}
        >
          {animation === 'flip' ? <>
            {half(text, 'top')}
            {half(frame.previous!, 'bottom')}
            <span className="bkreact-countdown__flap">
              <span className="bkreact-countdown__flap-face bkreact-countdown__flap-face--front">
                <span className="bkreact-countdown__half-text">{frame.previous}</span>
              </span>
              <span className="bkreact-countdown__flap-face bkreact-countdown__flap-face--back">
                <span className="bkreact-countdown__half-text">{text}</span>
              </span>
            </span>
          </> : <>
            <span className="bkreact-countdown__wheel-old">{frame.previous}</span>
            <span className="bkreact-countdown__wheel-new">{text}</span>
          </>}
        </span>
      )}
    </span>
  );
}

export const CountdownDigit = memo(function CountdownDigit({ text, animation, className }: {
  text: string;
  animation: CountdownAnimation;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <span className={joinClassNames('bkreact-countdown__digit', className)}>
      <span className="bkreact-countdown__value" data-measure={animation !== 'none' || undefined}>{text}</span>
      {animation !== 'none' && (
        <span className="bkreact-countdown__reels" aria-hidden="true">
          {Array.from(text).map((digit, index) => (
            <DigitCell key={`${text.length}-${index}`} text={digit} animation={animation} reducedMotion={reducedMotion} />
          ))}
        </span>
      )}
    </span>
  );
});
