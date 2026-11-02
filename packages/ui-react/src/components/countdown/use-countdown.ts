'use client';

import { useEffect, useRef, useState } from 'react';
import { getCountdownParts, normalizeRemaining, parseTargetTime } from './time';
import type { UseCountdownOptions } from './type';

/** value > targetTime > duration；受控模式不启动计时器，也不触发计时回调。 */
export function useCountdown({
  targetTime, duration, value, autoStart = true, interval = 1000, onChange, onFinish,
}: UseCountdownOptions = {}) {
  const target = targetTime === undefined ? undefined : parseTargetTime(targetTime);
  const length = target === undefined ? normalizeRemaining((duration ?? 0) * 1000) : 0;
  const hasSource = target !== undefined || duration !== undefined;
  const controlled = value !== undefined;
  const initial = () => target === undefined ? length : normalizeRemaining(target - Date.now());
  const [remaining, setRemaining] = useState(initial);
  const callbacks = useRef({ onChange, onFinish });
  useEffect(() => { callbacks.current = { onChange, onFinish }; });

  useEffect(() => {
    if (controlled) return;
    const start = initial();
    setRemaining(start);
    if (!autoStart || !hasSource) return;

    const deadline = target ?? Date.now() + start;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const delay = Number.isFinite(interval) && interval > 0 ? interval : 1000;
    const tick = () => {
      if (!active) return;
      const next = normalizeRemaining(deadline - Date.now());
      setRemaining(next);
      callbacks.current.onChange?.(next, getCountdownParts(next));
      if (next === 0) {
        active = false;
        callbacks.current.onFinish?.();
      } else timer = setTimeout(tick, Math.min(delay, next));
    };
    // 延后处理已结束的来源，StrictMode 的试运行可正常清理，不会重复通知完成。
    timer = setTimeout(tick, Math.min(delay, start));
    return () => { active = false; clearTimeout(timer); };
    // Only source/configuration changes restart the countdown; callback identity never does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, length, hasSource, controlled, autoStart, interval]);

  const current = value === undefined ? remaining : normalizeRemaining(value);
  return { remaining: current, parts: getCountdownParts(current), finished: current === 0 };
}
