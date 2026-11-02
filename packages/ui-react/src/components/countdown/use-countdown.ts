'use client';

import { useEffect, useRef, useState } from 'react';
import { getCountdownParts, normalizeRemaining, parseTargetTime } from './time';
import type { UseCountdownOptions } from './type';

/**
 * value > targetTime > duration；受控模式不启动计时器，也不触发计时回调。
 * running 表示自动计时正在运行；completionCount 为本次挂载以来真正到期的 tick 次数。
 * 配置变化本身不增加次数；零时长来源在异步到期 tick 增加，冻结和受控展示不增加。
 */
export function useCountdown({
  targetTime, duration, value, autoStart = true, interval = 1000, onChange, onFinish,
}: UseCountdownOptions = {}) {
  const target = targetTime === undefined ? undefined : parseTargetTime(targetTime);
  const length = target === undefined ? normalizeRemaining(Math.round((duration ?? 0) * 1000)) : 0;
  const hasSource = target !== undefined || duration !== undefined;
  const controlled = value !== undefined;
  // target 模式的服务端与首次客户端渲染均为占位，挂载后才读取墙钟。
  const [remaining, setRemaining] = useState(target === undefined ? length : 0);
  const [ready, setReady] = useState(controlled || target === undefined);
  const [activity, setActivity] = useState({ running: false, completionCount: 0 });
  const run = useRef<{ deadline: number; finished: boolean } | null>(null);
  const callbacks = useRef({ onChange, onFinish });
  useEffect(() => { callbacks.current = { onChange, onFinish }; });

  // 只有来源、受控模式或 autoStart 变化才开始一轮新计时。
  useEffect(() => {
    setReady(true);
    if (controlled) {
      run.current = null;
      setActivity(current => current.running ? { ...current, running: false } : current);
      return;
    }
    const now = Date.now();
    const start = target === undefined ? length : normalizeRemaining(target - now);
    setRemaining(start);
    run.current = autoStart && hasSource
      ? { deadline: target ?? now + start, finished: false }
      : null;
    const running = autoStart && hasSource && start > 0;
    setActivity(current => current.running === running ? current : { ...current, running });
  }, [target, length, hasSource, controlled, autoStart]);

  const delay = Number.isFinite(interval) && interval > 0 ? interval : 1000;
  // interval 变化只替换定时器，沿用本轮 deadline 和完成状态。
  useEffect(() => {
    const currentRun = run.current;
    if (!currentRun || currentRun.finished) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!active || currentRun.finished) return;
      const next = normalizeRemaining(currentRun.deadline - Date.now());
      setRemaining(next);
      if (next === 0) {
        currentRun.finished = true;
        setActivity(current => ({ running: false, completionCount: current.completionCount + 1 }));
      }
      callbacks.current.onChange?.(next, getCountdownParts(next));
      if (next === 0) callbacks.current.onFinish?.();
      else timer = setTimeout(tick, Math.min(delay, next));
    };
    // 延后处理已结束的来源，StrictMode 的试运行可正常清理。
    timer = setTimeout(tick, Math.min(delay, normalizeRemaining(currentRun.deadline - Date.now())));
    return () => { active = false; clearTimeout(timer); };
  }, [target, length, hasSource, controlled, autoStart, delay]);

  const current = value === undefined ? remaining : normalizeRemaining(value);
  return {
    remaining: current, parts: getCountdownParts(current), ready,
    finished: ready && current === 0,
    // running 只代表自动计时器；受控展示、冻结态和等待零时长 tick 均为 false。
    running: activity.running,
    // 仅真正到期的 tick 累加，配置重置或受控值归零不会产生完成事件。
    completionCount: activity.completionCount,
  };
}
